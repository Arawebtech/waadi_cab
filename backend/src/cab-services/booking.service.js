const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const {
  CabBooking,
  User,
  DriverLocation,
  Vehicle,
  IntercityPackage,
  Notification,
  Customer,
  Coupon,
  Rating,
} = require('../models');
const AppError = require('../utils/AppError');
const googleService = require('./google.service');
const fareService = require('./fare.service');
const walletService = require('./wallet.service');
const subscriptionService = require('./subscription.service');
const matchingService = require('./matching.service');
const driverLocationService = require('./driverLocation.service');
const { fareProfileForVehicle, listFareProfiles } = require('./vehicleFareProfiles');

function generateBookingNumber() {
  return `CB${Date.now().toString(36).toUpperCase()}${crypto.randomInt(100, 999)}`;
}

function generateTripOtp() {
  return crypto.randomInt(1000, 9999).toString();
}

async function sanitizeBooking(booking, includeDriver = false) {
  const doc = booking.toObject ? booking.toObject() : booking;
  const result = {
    id: doc._id,
    bookingNumber: doc.bookingNumber,
    status: doc.status,
    tripType: doc.tripType,
    intercityType: doc.intercityType,
    pickup: doc.pickup,
    drop: doc.drop,
    stops: doc.stops,
    scheduledAt: doc.scheduledAt,
    distanceKm: doc.distanceKm,
    durationMin: doc.durationMin,
    fare: doc.fare,
    paymentMethod: doc.paymentMethod,
    paymentStatus: doc.paymentStatus,
    couponCode: doc.couponCode,
    createdAt: doc.createdAt,
    driverAssignedAt: doc.driverAssignedAt,
    driverArrivedAt: doc.driverArrivedAt,
    tripStartedAt: doc.tripStartedAt,
    tripCompletedAt: doc.tripCompletedAt,
    vehicleId: doc.vehicleId,
    customerId: doc.customerId,
    driverId: doc.driverId,
  };

  if (doc.vehicleId?.vehicleNumber || doc.vehicleId?.vehicleType) {
    result.vehicle = doc.vehicleId;
  }

  if (includeDriver && doc.driverId) {
    const rider = doc.driverId.fullName
      ? doc.driverId
      : await User.findById(doc.driverId).lean();
    if (rider) {
      let vehicle = null;
      if (doc.vehicleId?.vehicleNumber) {
        vehicle = doc.vehicleId;
      } else if (doc.vehicleId) {
        vehicle = await Vehicle.findById(doc.vehicleId).lean();
      }
      result.driver = {
        id: rider._id,
        name: rider.fullName,
        phone: rider.phone,
        avatar: rider.profilePhoto?.secure_url,
        rating: rider.rating,
        vehicle,
      };
    }
  }

  return result;
}

async function getFareEstimate(args) {
  const { pickup, drop, tripType, intercityPackageId, couponCode, scheduledAt } = args;
  const metrics = await googleService.getRouteMetrics(pickup, drop);
  let intercityBasePrice = 0;
  if (tripType === 'intercity' && intercityPackageId) {
    const pkg = await IntercityPackage.findById(intercityPackageId);
    if (pkg) intercityBasePrice = pkg.basePrice;
  }
  const filter = { isActive: true };
  if (tripType === 'intercity') filter.isIntercity = true;
  else filter.isIntercity = { $ne: true };

  let vehicleTypes = listFareProfiles();
  if (args.vehicleId) {
    const vehicle = await Vehicle.findById(args.vehicleId).lean();
    if (vehicle) {
      vehicleTypes = [{ ...fareProfileForVehicle(vehicle), _id: vehicle._id, vehicleType: vehicle.vehicleType }];
    }
  }

  const estimates = await fareService.estimateFares({
    vehicleTypes,
    distanceKm: metrics.distanceKm,
    durationMin: metrics.durationMin,
    tripType,
    intercityBasePrice,
    couponCode,
    scheduledAt,
  });
  return { ...metrics, estimates };
}

async function createBooking(customerId, payload, io) {
  const {
    pickup,
    drop,
    vehicleId,
    tripType = 'local',
    intercityType,
    intercityPackageId,
    paymentMethod = 'cash',
    couponCode,
    scheduledAt,
    stops = [],
  } = payload;

  const vehicle = await Vehicle.findById(vehicleId);
  if (!vehicle?.isActive) throw new AppError('Invalid vehicle', 400);

  const vehicleType = fareProfileForVehicle(vehicle);

  const metrics = await googleService.getRouteMetrics(pickup, drop);
  let intercityBasePrice = 0;
  if (tripType === 'intercity' && intercityPackageId) {
    const pkg = await IntercityPackage.findById(intercityPackageId);
    if (pkg) intercityBasePrice = pkg.basePrice;
  }

  let couponDiscount = 0;
  if (couponCode) {
    const { discount } = await fareService.applyCoupon(couponCode, 99999, tripType);
    couponDiscount = discount;
  }

  const fare = fareService.calculateFare({
    vehicleType, distanceKm: metrics.distanceKm, durationMin: metrics.durationMin,
    tripType, intercityBasePrice, scheduledAt, couponDiscount,
  });

  const tripOtp = generateTripOtp();
  const tripOtpHash = await bcrypt.hash(tripOtp, 10);

  const booking = await CabBooking.create({
    bookingNumber: generateBookingNumber(),
    customerId,
    vehicleId,
    status: scheduledAt ? 'REQUESTED' : 'SEARCHING_DRIVER',
    tripType, intercityType, intercityPackageId, pickup, drop, stops, scheduledAt,
    distanceKm: metrics.distanceKm,
    durationMin: metrics.durationMin,
    fare, paymentMethod, couponCode, tripOtpHash,
    searchExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
  });

  if (couponCode) await Coupon.updateOne({ code: couponCode.toUpperCase() }, { $inc: { usedCount: 1 } });

  await Customer.findByIdAndUpdate(customerId, {
    $push: { recentSearches: { $each: [{ address: drop.address, lat: drop.lat, lng: drop.lng, placeId: drop.placeId }], $slice: -10 } },
  });

  if (!scheduledAt && io) {
    await matchingService.storeTripOtp(booking._id, tripOtp);
    matchingService.startMatching(booking._id, io, {
      sanitizeBooking,
      findNearbyRiders,
    });
  } else if (!scheduledAt) {
    await matchingService.storeTripOtp(booking._id, tripOtp);
  }

  const result = await sanitizeBooking(await booking.populate('vehicleId'));
  return result;
}

async function startDriverSearch(bookingId, io) {
  matchingService.startMatching(bookingId, io, { sanitizeBooking, findNearbyRiders });
}

async function findNearbyRiders(pickup, vehicleId, radiusKm = 10) {
  return matchingService.findEligibleRiders(pickup, vehicleId, radiusKm);
}

async function acceptBooking(driverId, bookingId, io) {
  const rider = await User.findById(driverId);
  if (!rider?.isAvailable || !subscriptionService.riderCanReceiveRides(rider)) {
    throw new AppError('Cannot accept rides. Check subscription and verification.', 403);
  }

  const driverLocation = await DriverLocation.findOne({ driverId }).lean();
  const driverVehicle =
    (driverLocation?.vehicleId && (await Vehicle.findById(driverLocation.vehicleId).lean())) ||
    (await Vehicle.findOne({ userId: driverId, isActive: true }).lean());

  const booking = await CabBooking.findOneAndUpdate(
    { _id: bookingId, status: 'SEARCHING_DRIVER' },
    {
      driverId,
      ...(driverVehicle ? { vehicleId: driverVehicle._id } : {}),
      status: 'DRIVER_ASSIGNED',
      driverAssignedAt: new Date(),
    },
    { new: true }
  ).populate('vehicleId');

  if (!booking) throw new AppError('CabBooking not available', 409);

  matchingService.onBookingAccepted(bookingId);

  await User.findByIdAndUpdate(driverId, { isAvailable: false, currentBookingId: booking._id });

  const sanitized = await sanitizeBooking(booking, true);
  io?.to(`customer:${booking.customerId}`).emit('booking:driver_assigned', sanitized);
  io?.to(`booking:${booking._id}`).emit('booking:status', { status: 'DRIVER_ASSIGNED', booking: sanitized });

  await Notification.create({
    accountId: booking.customerId,
    accountType: 'Customer',
    title: 'Driver assigned',
    body: 'Your driver is on the way!',
    type: 'booking',
    data: { bookingId: booking._id },
  });

  return sanitized;
}

async function assertBookingAccess(booking, accountId, role) {
  const id = accountId.toString();
  if (role === 'customer' && booking.customerId.toString() !== id) {
    throw new AppError('Forbidden', 403);
  }
  if (role === 'driver' && booking.driverId?.toString() !== id) {
    throw new AppError('Forbidden', 403);
  }
}

async function getBookingById(accountId, role, bookingId) {
  const booking = await CabBooking.findById(bookingId)
    .populate('vehicleId')
    .populate('driverId', 'fullName phone profilePhoto rating vehicleId')
    .populate('customerId', 'fullName phone profileImage');

  if (!booking) throw new AppError('CabBooking not found', 404);
  await assertBookingAccess(booking, accountId, role);
  return sanitizeBooking(booking, true);
}

async function getTripOtpForCustomer(customerId, bookingId) {
  const booking = await CabBooking.findOne({ _id: bookingId, customerId });
  if (!booking) throw new AppError('CabBooking not found', 404);
  if (!['OTP_VERIFICATION', 'DRIVER_ARRIVED'].includes(booking.status)) {
    throw new AppError('Trip OTP not available yet', 400);
  }
  const otp = await matchingService.getTripOtp(bookingId);
  if (!otp) throw new AppError('Trip OTP expired — contact support', 410);
  return { otp };
}

async function updateBookingStatus(accountId, role, bookingId, status, extra = {}, io) {
  const booking = await CabBooking.findById(bookingId);
  if (!booking) throw new AppError('CabBooking not found', 404);

  await assertBookingAccess(booking, accountId, role);

  const driverStatuses = ['DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'TRIP_STARTED', 'TRIP_COMPLETED'];
  const customerStatuses = ['CANCELLED'];
  if (role === 'driver' && !driverStatuses.includes(status) && status !== 'CANCELLED') {
    throw new AppError('Invalid status transition for driver', 400);
  }
  if (role === 'customer' && !customerStatuses.includes(status)) {
    throw new AppError('Invalid status transition for customer', 400);
  }

  const updates = { status };
  const now = new Date();

  switch (status) {
    case 'DRIVER_ARRIVED':
      updates.driverArrivedAt = now;
      updates.status = 'OTP_VERIFICATION';
      break;
    case 'TRIP_STARTED':
      if (extra.tripOtp) {
        const valid = await bcrypt.compare(extra.tripOtp, booking.tripOtpHash);
        if (!valid) throw new AppError('Invalid trip OTP', 400);
      }
      updates.tripStartedAt = now;
      await matchingService.clearTripOtp(bookingId);
      break;
    case 'TRIP_COMPLETED':
      updates.tripCompletedAt = now;
      updates.paymentStatus = booking.paymentMethod === 'cash' ? 'pending' : 'paid';
      break;
    case 'CANCELLED':
      updates.cancelledBy = extra.cancelledBy || (role === 'driver' ? 'driver' : 'customer');
      updates.cancelReason = extra.cancelReason;
      if (booking.driverId) {
        await User.findByIdAndUpdate(booking.driverId, { isAvailable: true, currentBookingId: null });
      }
      break;
    default:
      break;
  }

  const updated = await CabBooking.findByIdAndUpdate(bookingId, updates, { new: true })
    .populate('vehicleId')
    .populate({ path: 'driverId', select: 'fullName phone profilePhoto rating vehicleId' })
    .populate('driverId');

  if (status === 'TRIP_COMPLETED' && booking.driverId) {
    await User.findByIdAndUpdate(booking.driverId, {
      isAvailable: true,
      currentBookingId: null,
      $inc: { totalRides: 1, totalEarnings: updated.fare.total },
    });
    if (booking.paymentMethod === 'wallet') {
      await walletService.debit(booking.customerId, 'Customer', updated.fare.total, booking._id, 'Ride payment');
      await walletService.credit(booking.driverId, 'Driver', updated.fare.total, booking._id, 'Ride earning');
    }
  }

  const sanitized = await sanitizeBooking(updated, true);
  io?.to(`booking:${bookingId}`).emit('booking:status', { status: updated.status, booking: sanitized });
  io?.to(`customer:${booking.customerId}`).emit(`booking:${updated.status.toLowerCase()}`, sanitized);

  if (updated.status === 'OTP_VERIFICATION') {
    const otp = await matchingService.getTripOtp(bookingId);
    if (otp) {
      io?.to(`customer:${booking.customerId}`).emit('booking:trip_otp', { bookingId, otp });
    }
  }

  return sanitized;
}

async function cancelBooking(accountId, role, bookingId, reason, io) {
  const booking = await CabBooking.findById(bookingId);
  if (!booking) throw new AppError('CabBooking not found', 404);
  await assertBookingAccess(booking, accountId, role);
  matchingService.stopSearch(bookingId);
  const cancelledBy = role === 'driver' ? 'driver' : 'customer';
  return updateBookingStatus(accountId, role, bookingId, 'CANCELLED', { cancelledBy, cancelReason: reason }, io);
}

async function rateBooking(customerId, bookingId, { rating, review, tags }) {
  const booking = await CabBooking.findOne({ _id: bookingId, customerId, status: 'TRIP_COMPLETED' });
  if (!booking) throw new AppError('CabBooking not found', 404);
  if (booking.ratingId) throw new AppError('Already rated', 400);

  const ratingDoc = await Rating.create({ bookingId, customerId, driverId: booking.driverId, rating, review, tags });
  await CabBooking.findByIdAndUpdate(bookingId, { ratingId: ratingDoc._id });

  const rider = await User.findById(booking.driverId);
  if (rider) {
    const newRating = (rider.rating * rider.totalRides + rating) / (rider.totalRides + 1);
    await User.findByIdAndUpdate(booking.driverId, { rating: Math.round(newRating * 10) / 10 });
  }
  return ratingDoc;
}

async function getCustomerBookings(customerId, { status, page = 1, limit = 20 } = {}) {
  const filter = { customerId };
  if (status) filter.status = status;
  const bookings = await CabBooking.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('vehicleId')
    .populate('driverId', 'fullName phone profilePhoto rating');
  return Promise.all(bookings.map((b) => sanitizeBooking(b, true)));
}

async function getRiderBookings(driverId, { status, page = 1, limit = 20 } = {}) {
  const filter = { driverId };
  if (status) filter.status = status;
  const bookings = await CabBooking.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('vehicleId')
    .populate('customerId', 'fullName phone profileImage');
  return Promise.all(bookings.map((b) => sanitizeBooking(b)));
}

async function updateRiderLocation(driverId, coordinates, bookingId) {
  const loc = await driverLocationService.updateLocation(driverId, coordinates, bookingId);
  if (loc && !loc.isOnline) {
    await DriverLocation.findByIdAndUpdate(loc._id, { isOnline: true, isAvailable: true });
  }
  return loc;
}

module.exports = {
  getFareEstimate,
  createBooking,
  acceptBooking,
  updateBookingStatus,
  cancelBooking,
  rateBooking,
  getCustomerBookings,
  getRiderBookings,
  getBookingById,
  getTripOtpForCustomer,
  findNearbyRiders,
  updateRiderLocation,
  sanitizeBooking,
  startDriverSearch,
  findNearbyDrivers: findNearbyRiders,
};
