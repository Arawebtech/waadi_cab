const authService = require('../services/auth.service');
const bookingService = require('../services/booking.service');
const riderService = require('../services/rider.service');
const walletService = require('../services/wallet.service');
const googleService = require('../services/google.service');
const { Vehicle, IntercityPackage, Coupon, SavedPlace, Notification, Customer } = require('../models');
const { listFareProfiles } = require('../cab-services/vehicleFareProfiles');
const { success, asyncHandler } = require('../utils/apiResponse');
const AppError = require('../utils/AppError');
const { validateIndianMobile } = require('../utils/validators');

function ownerMeta(req) {
  if (req.user.role === 'customer') return { id: req.user._id, type: 'Customer' };
  return { id: req.user._id, type: 'User' };
}

exports.fareEstimate = asyncHandler(async (req, res) => {
  return success(res, await bookingService.getFareEstimate(req.body));
});

exports.createBooking = asyncHandler(async (req, res) => {
  const data = await bookingService.createBooking(req.user._id, req.body, req.app.get('io'));
  return success(res, data, 'Booking created', 201);
});

exports.myBookings = asyncHandler(async (req, res) => {
  return success(res, await bookingService.getCustomerBookings(req.user._id, req.query));
});

exports.getBooking = asyncHandler(async (req, res) => {
  const data = await bookingService.getBookingById(req.user._id, req.user.role, req.params.id);
  return success(res, data);
});

exports.getTripOtp = asyncHandler(async (req, res) => {
  const data = await bookingService.getTripOtpForCustomer(req.user._id, req.params.id);
  return success(res, data);
});

exports.updateStatus = asyncHandler(async (req, res) => {
  const data = await bookingService.updateBookingStatus(
    req.user._id, req.user.role, req.params.id, req.body.status, req.body, req.app.get('io')
  );
  return success(res, data);
});

exports.cancelBooking = asyncHandler(async (req, res) => {
  const data = await bookingService.cancelBooking(
    req.user._id, req.user.role, req.params.id, req.body.reason, req.app.get('io')
  );
  return success(res, data);
});

exports.rateBooking = asyncHandler(async (req, res) => {
  const data = await bookingService.rateBooking(req.user._id, req.params.id, req.body);
  return success(res, data, 'Rating submitted');
});

exports.vehicleTypes = asyncHandler(async (_req, res) => {
  return success(res, listFareProfiles());
});

exports.intercityPackages = asyncHandler(async (req, res) => {
  const filter = { isActive: true };
  if (req.query.fromCity) filter.fromCity = new RegExp(req.query.fromCity, 'i');
  if (req.query.toCity) filter.toCity = new RegExp(req.query.toCity, 'i');
  return success(res, await IntercityPackage.find(filter).populate('vehicleId').lean());
});

exports.coupons = asyncHandler(async (_req, res) => {
  return success(res, await Coupon.find({ isActive: true, validUntil: { $gte: new Date() } }).lean());
});

exports.savedPlaces = asyncHandler(async (req, res) => {
  return success(res, await SavedPlace.find({ customerId: req.user._id }).lean());
});

exports.savePlace = asyncHandler(async (req, res) => {
  const place = await SavedPlace.findOneAndUpdate(
    { customerId: req.user._id, label: req.body.label },
    { ...req.body, customerId: req.user._id },
    { upsert: true, new: true }
  );
  return success(res, place);
});

exports.searchPlaces = asyncHandler(async (req, res) => {
  const loc = req.query.lat ? { lat: +req.query.lat, lng: +req.query.lng } : null;
  return success(res, await googleService.searchPlaces(req.query.q, loc));
});

exports.geocodeAddress = asyncHandler(async (req, res) => {
  const address = req.query.q?.trim();
  if (!address) {
    return res.status(400).json({ success: false, message: 'Address is required' });
  }
  const result = await googleService.geocodeAddress(address);
  if (!result) {
    return res.status(404).json({ success: false, message: 'Address not found' });
  }
  return success(res, result);
});

exports.getDirections = asyncHandler(async (req, res) => {
  const origin = { lat: +req.query.originLat, lng: +req.query.originLng };
  const destination = { lat: +req.query.destLat, lng: +req.query.destLng };
  if ([origin.lat, origin.lng, destination.lat, destination.lng].some((n) => Number.isNaN(n))) {
    return res.status(400).json({ success: false, message: 'Invalid coordinates' });
  }
  return success(res, await googleService.getDirections(origin, destination));
});

exports.nearbyDrivers = asyncHandler(async (req, res) => {
  const drivers = await bookingService.findNearbyRiders(
    { lat: +req.query.lat, lng: +req.query.lng },
    req.query.vehicleId
  );
  return success(res, drivers);
});

exports.notifications = asyncHandler(async (req, res) => {
  const { id, type } = ownerMeta(req);
  const items = await Notification.find({ accountId: id, accountType: type }).sort({ createdAt: -1 }).limit(50).lean();
  return success(res, items);
});

exports.markNotificationRead = asyncHandler(async (req, res) => {
  const { id, type } = ownerMeta(req);
  await Notification.findOneAndUpdate({ _id: req.params.id, accountId: id, accountType: type }, { isRead: true });
  return success(res, {});
});

exports.updateProfile = asyncHandler(async (req, res) => {
  if (req.user.role === 'admin') {
    throw new AppError('Admin profile cannot be updated via this endpoint', 403);
  }

  if (req.user.role === 'customer') {
    if (req.body.phone !== undefined && req.body.phone !== null && String(req.body.phone).trim() !== '') {
      const phoneCheck = validateIndianMobile(req.body.phone);
      if (!phoneCheck.valid) throw new AppError(phoneCheck.message, 422);
    }

    const customer = await Customer.findByIdAndUpdate(
      req.user._id,
      {
        fullName: req.body.name || req.body.fullName,
        phone: req.body.phone,
        language: req.body.language,
        darkMode: req.body.darkMode,
        emergencyContacts: req.body.emergencyContacts,
        ridePreferences: req.body.ridePreferences,
      },
      { new: true, runValidators: true }
    );
    if (!customer) throw new AppError('Customer not found', 404);
    return success(res, authService.sanitizeCustomer(customer));
  }

  const { User } = require('../models');
  const rider = await User.findByIdAndUpdate(
    req.user._id,
    {
      fullName: req.body.name || req.body.fullName,
      phone: req.body.phone,
      phoneSecondary: req.body.phoneSecondary,
      emergencyContact: req.body.emergencyContact,
    },
    { new: true, runValidators: true }
  );
  if (!rider) throw new AppError('Driver profile not found', 404);
  return success(res, authService.sanitizeRider(rider));
});

exports.wallet = asyncHandler(async (req, res) => {
  const { id, type } = ownerMeta(req);
  return success(res, await walletService.getOrCreateWallet(id, type));
});

exports.transactions = asyncHandler(async (req, res) => {
  const { id, type } = ownerMeta(req);
  return success(res, await walletService.getTransactions(id, type, req.query));
});

exports.withdraw = asyncHandler(async (req, res) => {
  const { id, type } = ownerMeta(req);
  const tx = await walletService.requestWithdrawal(id, type, req.body.amount, req.body.bankDetails);
  return success(res, tx, 'Withdrawal requested');
});

exports.driverProfile = asyncHandler(async (req, res) => {
  return success(res, await riderService.getRiderProfile(req.user._id));
});

exports.driverOnline = asyncHandler(async (req, res) => {
  const loc = await riderService.setOnlineStatus(req.user._id, req.body);
  const io = req.app.get('io');

  io?.emit('rider:status', {
    riderId: req.user._id,
    isOnline: loc?.isOnline ?? req.body.isOnline,
    isAvailable: loc?.isAvailable ?? req.body.isAvailable,
  });

  if (req.body.isOnline && loc?.location?.coordinates?.length >= 2) {
    const [lng, lat] = loc.location.coordinates;
    const payload = {
      riderId: req.user._id,
      coordinates: {
        lat,
        lng,
        heading: loc.heading ?? 0,
        speed: loc.speed ?? 0,
      },
      timestamp: Date.now(),
    };
    io?.to('admin:dashboard').emit('rider:location:broadcast', payload);
    io?.to('role:customer').emit('riders:nearby:update', payload);
  }

  const profile = await authService.enrichRiderProfile(req.user);
  return success(res, profile);
});

exports.driverEarnings = asyncHandler(async (req, res) => {
  return success(res, await riderService.getEarnings(req.user._id, req.query));
});

exports.driverRequests = asyncHandler(async (req, res) => {
  return success(res, await riderService.getNearbyRequests(req.user._id));
});

exports.acceptBooking = asyncHandler(async (req, res) => {
  return success(res, await bookingService.acceptBooking(req.user._id, req.params.id, req.app.get('io')));
});

exports.driverBookings = asyncHandler(async (req, res) => {
  return success(res, await bookingService.getRiderBookings(req.user._id, req.query));
});

exports.updateBankDetails = asyncHandler(async (req, res) => {
  return success(res, await riderService.updateBankDetails(req.user._id, req.body));
});
