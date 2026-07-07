const crypto = require('crypto');
const CabRide = require('../models/CabRide');
const Customer = require('../models/Customer');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const DriverLocation = require('../models/DriverLocation');
const SavedPlace = require('../models/SavedPlace');
const IntercityPackage = require('../models/IntercityPackage');
const Rating = require('../models/Rating');
const Wallet = require('../models/Wallet');
const googleService = require('../cab-services/google.service');
const fareService = require('../cab-services/fare.service');
const driverRideService = require('../cab-driver/ride.service');
const vehicleCatalog = require('../cab-services/vehicleCatalog.service');

const ACTIVE_CUSTOMER_STATUSES = [
  'REQUESTED',
  'SEARCHING_DRIVER',
  'DRIVER_ASSIGNED',
  'DRIVER_ARRIVING',
  'DRIVER_ARRIVED',
  'OTP_VERIFICATION',
  'TRIP_STARTED',
];

function generateRideNumber() {
  return `CR${Date.now().toString(36).toUpperCase()}${crypto.randomInt(100, 999)}`;
}

function formatDriverName(driver) {
  if (!driver) return 'Driver';
  if (typeof driver.getFullName === 'function') return driver.getFullName();
  const parts = [driver.firstName, driver.lastName].filter(Boolean);
  if (parts.length) return parts.join(' ');
  return driver.fullName || driver.name || 'Driver';
}

async function emitRideStatus(io, rideDoc) {
  if (!io || !rideDoc) return;
  const ride = rideDoc.toObject ? rideDoc.toObject() : rideDoc;
  const serialized = await serializeRide(ride, true);
  const payload = { rideId: ride._id, status: ride.status, ride: serialized };
  io.to(`ride:${ride._id}`).emit('cab-ride:status', payload);
  if (ride.customerId) {
    io.to(`customer:${ride.customerId}`).emit('cab-ride:status', payload);
  }
  if (ride.driverId) {
    io.to(`driver:${ride.driverId}`).emit('cab-ride:status', payload);
  }
}

async function getVehicleTypes() {
  return vehicleCatalog.getVehicleTypes();
}

async function findVehicleType(slug) {
  return vehicleCatalog.findVehicleType(slug);
}

async function getFareEstimate({ pickup, drop, tripType = 'local', couponCode, intercityPackageId }) {
  const metrics = await googleService.getRouteMetrics(pickup, drop);
  let intercityBase = 0;

  if (tripType === 'intercity' && intercityPackageId) {
    const pkg = await IntercityPackage.findById(intercityPackageId).lean();
    if (pkg) intercityBase = pkg.basePrice;
  }

  const catalog = await vehicleCatalog.buildVehicleCatalog();
  const nearbyCounts = pickup?.lat
    ? await vehicleCatalog.countNearbyDriversBySlug(pickup.lat, pickup.lng, 8)
    : {};

  const estimates = await Promise.all(
    catalog.map(async (vt) => {
      let couponDiscount = 0;
      if (couponCode) {
        try {
          const applied = await fareService.applyCoupon(couponCode, 9999, tripType);
          couponDiscount = applied.discount;
        } catch {
          couponDiscount = 0;
        }
      }
      const fare = fareService.calculateFare({
        vehicleType: vt,
        distanceKm: metrics.distanceKm,
        durationMin: metrics.durationMin,
        tripType,
        intercityBasePrice: intercityBase,
        couponDiscount,
      });
      const nearbyDrivers = nearbyCounts[vt.slug] || 0;
      return {
        vehicleId: vt.id,
        vehicleType: vt,
        fare,
        etaMin: metrics.durationMin,
        nearbyDrivers,
        available: nearbyDrivers > 0 || vt.registeredCount > 0,
      };
    })
  );

  return { distanceKm: metrics.distanceKm, durationMin: metrics.durationMin, estimates, nearbyDriversTotal: Object.values(nearbyCounts).reduce((a, b) => a + b, 0) };
}

async function serializeRide(ride, includeDriver = false) {
  const doc = ride.toObject ? ride.toObject() : ride;
  const result = {
    id: doc._id,
    rideNumber: doc.rideNumber,
    bookingNumber: doc.rideNumber,
    status: doc.status,
    tripType: doc.tripType || 'local',
    pickup: doc.pickup,
    drop: doc.drop,
    distanceKm: doc.distanceKm,
    durationMin: doc.durationMin,
    fare: doc.fare,
    paymentMethod: doc.paymentMethod,
    paymentStatus: doc.paymentStatus,
    paymentDetails: doc.paymentDetails,
    adminCommission: doc.adminCommission ?? 0,
    vehicleTypeSlug: doc.vehicleTypeSlug,
    createdAt: doc.createdAt,
    assignedAt: doc.assignedAt,
    arrivedAt: doc.arrivedAt,
    startedAt: doc.startedAt,
    completedAt: doc.completedAt,
    cancelledBy: doc.cancelledBy,
    cancelReason: doc.cancelReason,
    rating: doc.rating,
  };

  if (includeDriver && doc.driverId) {
    const driverId = doc.driverId._id || doc.driverId;
    const driver = doc.driverId.fullName
      ? doc.driverId
      : await User.findById(driverId).lean();
    const loc = await DriverLocation.findOne({ driverId }).lean();
    let vehicle = null;
    if (loc?.vehicleId) {
      vehicle = await Vehicle.findById(loc.vehicleId).lean();
    }
    if (driver) {
      result.driver = {
        id: driver._id,
        name: formatDriverName(driver),
        firstName: driver.firstName,
        lastName: driver.lastName,
        phone: driver.phoneNumber || driver.phone,
        avatar: driver.profile?.avatar || driver.profilePhoto?.secure_url,
        rating: driver.rating,
        vehicle: vehicle
          ? {
              registrationNumber: vehicle.vehicleNumber,
              vehicleNumber: vehicle.vehicleNumber,
              model: vehicle.vehicleType,
              vehicleType: vehicle.vehicleType,
              seatCapacity: vehicle.seatCapacity,
            }
          : undefined,
      };
    }
  }

  return result;
}

async function createRide(customerId, body, io) {
  const customer = await Customer.findById(customerId);
  if (!customer) {
    const err = new Error('Customer not found');
    err.statusCode = 404;
    throw err;
  }

  const active = await CabRide.findOne({
    customerId,
    status: { $in: ACTIVE_CUSTOMER_STATUSES },
  });
  if (active) {
    const err = new Error('You already have an active ride');
    err.statusCode = 409;
    err.rideId = active._id;
    throw err;
  }

  const vehicleType = await findVehicleType(body.vehicleTypeSlug || body.vehicleId || 'mini');
  const metrics = await googleService.getRouteMetrics(body.pickup, body.drop);

  let intercityBase = 0;
  if (body.tripType === 'intercity' && body.intercityPackageId) {
    const pkg = await IntercityPackage.findById(body.intercityPackageId).lean();
    if (pkg) intercityBase = pkg.basePrice;
  }

  const fareBreakdown = fareService.calculateFare({
    vehicleType,
    distanceKm: metrics.distanceKm,
    durationMin: metrics.durationMin,
    tripType: body.tripType || 'local',
    intercityBasePrice: intercityBase,
  });

  const ride = await CabRide.create({
    rideNumber: generateRideNumber(),
    customerId,
    customerName: customer.fullName || 'Customer',
    customerPhone: customer.phone,
    pickup: body.pickup,
    drop: body.drop,
    vehicleTypeSlug: vehicleType.slug,
    tripType: body.tripType || 'local',
    intercityPackageId: body.intercityPackageId || null,
    distanceKm: metrics.distanceKm,
    durationMin: metrics.durationMin,
    fare: fareBreakdown,
    paymentMethod: body.paymentMethod || 'cash',
    status: 'SEARCHING_DRIVER',
    searchExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });

  await driverRideService.broadcastRideRequest(io, ride.toObject());
  io?.to(`customer:${customerId}`).emit('cab-ride:status', {
    rideId: ride._id,
    status: ride.status,
    ride: await serializeRide(ride),
  });

  return serializeRide(ride);
}

async function getCustomerRides(customerId, { status, page = 1, limit = 20 } = {}) {
  const filter = { customerId };
  if (status) filter.status = status;

  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
  const skip = (safePage - 1) * safeLimit;

  const [items, total] = await Promise.all([
    CabRide.find(filter).sort({ createdAt: -1 }).skip(skip).limit(safeLimit).lean(),
    CabRide.countDocuments(filter),
  ]);

  return {
    items: await Promise.all(items.map((r) => serializeRide(r, false))),
    pagination: {
      total,
      page: safePage,
      limit: safeLimit,
      pages: Math.ceil(total / safeLimit) || 1,
    },
  };
}

// async function getRideForCustomer(customerId, rideId) {
//   const ride = await CabRide.findOne({ _id: rideId, customerId });
//   if (!ride) {
//     const err = new Error('Ride not found');
//     err.statusCode = 404;
//     throw err;
//   }
//   return serializeRide(ride, true);
// }

async function getRideForCustomer(customerId, rideId) {
  const ride = await CabRide.findOne({ _id: rideId, customerId })
   
    .populate({
      path: 'vehicleId',
      populate: {
        path: 'userId',
        select: 'firstName lastName'
      }
    });

  if (!ride) {
    const err = new Error('Ride not found');
    err.statusCode = 404;
    throw err;
  }

  return serializeRide(ride, true);
}

async function getActiveRide(customerId) {
  const ride = await CabRide.findOne({
    customerId,
    status: { $in: ACTIVE_CUSTOMER_STATUSES },
  });
  return ride ? serializeRide(ride, true) : null;
}

async function cancelRide(customerId, rideId, reason, io) {
  const ride = await CabRide.findOne({ _id: rideId, customerId });
  if (!ride) {
    const err = new Error('Ride not found');
    err.statusCode = 404;
    throw err;
  }

  const cancellable = ['REQUESTED', 'SEARCHING_DRIVER', 'DRIVER_ASSIGNED', 'DRIVER_ARRIVING'];
  if (!cancellable.includes(ride.status)) {
    const err = new Error(`Cannot cancel ride in ${ride.status} status`);
    err.statusCode = 400;
    throw err;
  }

  ride.status = 'CANCELLED';
  ride.cancelledBy = 'customer';
  ride.cancelReason = reason || 'Cancelled by customer';
  await ride.save();

  if (ride.driverId) {
    await DriverLocation.findOneAndUpdate(
      { driverId: ride.driverId },
      { $set: { isAvailable: true, bookingId: null } }
    );
  }

  const payload = { rideId: ride._id, status: ride.status, ride: await serializeRide(ride, true) };
  io?.emit('cab-ride:status', payload);
  io?.to(`ride:${ride._id}`).emit('cab-ride:cancelled', payload);

  return serializeRide(ride, true);
}

async function rateRide(customerId, rideId, { rating, review }) {
  const ride = await CabRide.findOne({ _id: rideId, customerId, status: 'TRIP_COMPLETED' });
  if (!ride) {
    const err = new Error('Completed ride not found');
    err.statusCode = 404;
    throw err;
  }
  if (ride.rating?.score) {
    const err = new Error('Ride already rated');
    err.statusCode = 400;
    throw err;
  }

  ride.rating = { score: rating, review, ratedAt: new Date() };
  await ride.save();

  if (ride.driverId) {
    await Rating.create({
      bookingId: ride._id,
      customerId,
      driverId: ride.driverId,
      rating,
      review,
    });
  }

  return serializeRide(ride, true);
}

async function getLiveDrivers(lat, lng, radiusKm = 5) {
  const drivers = await DriverLocation.find({
    isOnline: true,
    isAvailable: true,
    'location.coordinates.0': { $exists: true },
  }).lean();

  const vehicleIds = [...new Set(drivers.map((d) => d.vehicleId).filter(Boolean))];
  const vehicles = vehicleIds.length
    ? await Vehicle.find({ _id: { $in: vehicleIds } }).select('vehicleType vehicleNumber seatCapacity').lean()
    : [];
  const vehicleMap = Object.fromEntries(vehicles.map((v) => [String(v._id), v]));

  return drivers
    .map((d) => {
      const [dlng, dlat] = d.location.coordinates;
      const dist = googleService.haversineKm(lat, lng, dlat, dlng);
      const vehicle = d.vehicleId ? vehicleMap[String(d.vehicleId)] : null;
      return {
        riderId: d.driverId,
        driverId: d.driverId,
        lat: dlat,
        lng: dlng,
        heading: d.heading ?? 0,
        distanceKm: Math.round(dist * 100) / 100,
        vehicleType: vehicle?.vehicleType ? vehicleCatalog.dbTypeToSlug(vehicle.vehicleType) : null,
        vehicleNumber: vehicle?.vehicleNumber,
        seatCapacity: vehicle?.seatCapacity,
      };
    })
    .filter((d) => d.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

async function payForRide(customerId, rideId, paymentMethod, io) {
  const ridePaymentSettlement = require('../cab-services/ridePaymentSettlement.service');
  const ride = await CabRide.findOne({
    _id: rideId,
    customerId,
    status: { $in: ['TRIP_STARTED', 'TRIP_COMPLETED'] },
  });
  if (!ride) {
    const err = new Error('Active ride not found for payment');
    err.statusCode = 404;
    throw err;
  }
  if (ride.paymentStatus === 'paid' || ride.paymentStatus === 'paid_by_cash') {
    return serializeRide(ride, true);
  }
  if (paymentMethod === 'wallet') {
    await ridePaymentSettlement.settleCustomerWalletPayment(ride, customerId);
  } else if (paymentMethod === 'cash') {
    await ridePaymentSettlement.markCashPayment(ride);
  } else {
    const err = new Error('Unsupported payment method');
    err.statusCode = 400;
    throw err;
  }
  const updated = await CabRide.findById(rideId);
  await emitRideStatus(io, updated);
  return serializeRide(updated, true);
}

async function listSavedPlaces(customerId) {
  return SavedPlace.find({ customerId }).sort({ label: 1 }).lean();
}

async function savePlace(customerId, body) {
  const existing = await SavedPlace.findOne({ customerId, label: body.label });
  if (existing) {
    Object.assign(existing, body);
    await existing.save();
    return existing.toObject();
  }
  const place = await SavedPlace.create({ ...body, customerId });
  return place.toObject();
}

async function getWallet(customerId) {
  let wallet = await Wallet.findOne({ ownerId: customerId, ownerType: 'Customer' });
  if (!wallet) {
    wallet = await Wallet.create({ ownerId: customerId, ownerType: 'Customer', balance: 0 });
  }
  return wallet.toObject();
}

async function listIntercityPackages(fromCity, toCity) {
  const filter = { isActive: true };
  if (fromCity) filter.fromCity = new RegExp(fromCity, 'i');
  if (toCity) filter.toCity = new RegExp(toCity, 'i');
  return IntercityPackage.find(filter).sort({ basePrice: 1 }).lean();
}

function buildInvoice(ride) {
  return {
    rideNumber: ride.rideNumber || ride.bookingNumber,
    date: ride.completedAt || ride.createdAt,
    pickup: ride.pickup?.address,
    drop: ride.drop?.address,
    distanceKm: ride.distanceKm,
    durationMin: ride.durationMin,
    fare: ride.fare,
    paymentMethod: ride.paymentMethod,
    paymentStatus: ride.paymentStatus,
    adminCommission: ride.adminCommission ?? 0,
    driver: ride.driver?.name,
  };
}

module.exports = {
  emitRideStatus,
  formatDriverName,
  getVehicleTypes,
  getFareEstimate,
  createRide,
  getCustomerRides,
  getRideForCustomer,
  getActiveRide,
  cancelRide,
  rateRide,
  getLiveDrivers,
  listSavedPlaces,
  savePlace,
  getWallet,
  listIntercityPackages,
  buildInvoice,
  serializeRide,
  payForRide,
  ACTIVE_CUSTOMER_STATUSES,
};
