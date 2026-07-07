const profileService = require('./profile.service');
const documentService = require('./document.service');
const locationService = require('./location.service');
const rideService = require('./ride.service');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const Subscription = require('../models/Subscription');
const SubscriptionHistory = require('../models/SubscriptionHistory');

function ok(res, data, message = 'Success', status = 200) {
  return res.status(status).json({ success: true, message, data });
}

function fail(res, err) {
  const status = err.statusCode || 500;
  return res.status(status).json({
    success: false,
    message: err.message || 'Internal server error',
    code: err.code,
  });
}

const wrap = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    console.error('[cab-driver]', err);
    fail(res, err);
  }
};

/** POST /cab-driver/verification/submit */
exports.submitVerification = wrap(async (req, res) => {
  const data = await profileService.submitForVerification(req.user._id);
  ok(res, data, 'Submitted for verification');
});

/** GET /cab-driver/dashboard */
exports.getDashboard = wrap(async (req, res) => {
  const dashboardService = require('./dashboard.service');
  const data = await dashboardService.getDriverDashboard(req.user._id);
  ok(res, data);
});

/** GET /cab-driver/wallet */
exports.getWallet = wrap(async (req, res) => {
  const dashboardService = require('./dashboard.service');
  const wallet = await require('../models/Wallet').findOne({
    ownerId: req.user._id,
    ownerType: 'Driver',
  }).lean();
  ok(res, wallet || { balance: 0, currency: 'INR' });
});

/** GET /cab-driver/wallet/transactions */
exports.getWalletTransactions = wrap(async (req, res) => {
  const dashboardService = require('./dashboard.service');
  const data = await dashboardService.getWalletTransactions(req.user._id, req.query);
  ok(res, data);
});

/** GET /cab-driver/rides/:id/messages */
exports.getRideMessages = wrap(async (req, res) => {
  const chatService = require('./chat.service');
  const data = await chatService.listMessages(req.user._id, req.params.id, req.query);
  ok(res, data);
});

/** POST /cab-driver/rides/:id/messages */
exports.sendRideMessage = wrap(async (req, res) => {
  const chatService = require('./chat.service');
  const msg = await chatService.sendMessage(req.user._id, req.params.id, req.body);
  req.app.get('io')?.to(`ride:${req.params.id}`).emit('cab-ride:chat', msg);
  ok(res, msg, 'Message sent', 201);
});

/** POST /cab-driver/rides/:id/verify-otp */
exports.verifyTripOtp = wrap(async (req, res) => {
  const ride = await rideService.verifyTripOtp(req.user._id, req.params.id, req.body.otp);
  req.app.get('io')?.emit('cab-ride:status', { rideId: ride._id, status: ride.status, ride });
  ok(res, ride, 'Trip started');
});

/** GET /cab-driver/profile — driver details + vehicles + docs + subscription */
exports.getProfile = wrap(async (req, res) => {
  const data = await profileService.getDriverProfile(req.user._id);
  ok(res, data);
});

/** PATCH /cab-driver/profile — update driver details */
exports.updateProfile = wrap(async (req, res) => {
  const data = await profileService.updateDriverDetails(req.user._id, req.body);
  ok(res, data, 'Profile updated');
});

/** PATCH /cab-driver/registration-step */
exports.saveRegistrationStep = wrap(async (req, res) => {
  const step = await profileService.setRegistrationStep(req.user._id, req.body.step);
  ok(res, { step });
});

/** GET /cab-driver/verification */
exports.getVerification = wrap(async (req, res) => {
  const data = await profileService.getVerificationSummary(req.user._id);
  ok(res, data);
});

/** PATCH /cab-driver/active-vehicle */
exports.setActiveVehicle = wrap(async (req, res) => {
  const vehicle = await profileService.setActiveVehicle(req.user._id, req.body.vehicleId);
  ok(res, vehicle, 'Active vehicle updated');
});

/** GET /cab-driver/documents */
exports.listDocuments = wrap(async (req, res) => {
  const docs = await documentService.listDocuments(req.user._id);
  ok(res, docs);
});

/** POST /cab-driver/documents — multipart upload */
exports.uploadDocument = wrap(async (req, res) => {
  if (!req.file) {
    return fail(res, Object.assign(new Error('File required'), { statusCode: 400 }));
  }
  const { docType, vehicleId } = req.body;
  const doc = await documentService.upsertDocument(req.user._id, docType, req.file, vehicleId || null);
  ok(res, doc, 'Document uploaded', 201);
});

/** DELETE /cab-driver/documents/:docType */
exports.deleteDocument = wrap(async (req, res) => {
  const doc = await documentService.removeDocument(req.user._id, req.params.docType);
  ok(res, doc, 'Document removed');
});

/** GET /cab-driver/subscription/plans */
exports.getPlans = wrap(async (_req, res) => {
  const plans = await SubscriptionPlan.find({ isActive: true, deleted: { $ne: true } })
    .sort({ sortOrder: 1, amount: 1 })
    .lean();
  ok(res, plans);
});

/** GET /cab-driver/subscription/current */
exports.getCurrentSubscription = wrap(async (req, res) => {
  const subscription = await profileService.getActiveSubscription(req.user._id);
  ok(res, subscription);
});

/** POST /cab-driver/subscription/purchase-testing — dev/test activation */
exports.purchaseTesting = wrap(async (req, res) => {
  const { planId } = req.body;
  if (!planId) {
    return fail(res, Object.assign(new Error('planId required'), { statusCode: 400 }));
  }
  const plan = await SubscriptionPlan.findOne({ _id: planId, isActive: true, deleted: { $ne: true } });
  if (!plan) {
    return fail(res, Object.assign(new Error('Plan not found'), { statusCode: 404 }));
  }

  const start = new Date();
  const expiry = new Date(start);
  expiry.setDate(expiry.getDate() + plan.durationDays);

  await Subscription.updateMany(
    { driverId: req.user._id, status: 'active' },
    { $set: { status: 'expired', expiredAt: new Date() } }
  );

  const subscription = await Subscription.create({
    driverId: req.user._id,
    planId: plan._id,
    planName: plan.name,
    durationDays: plan.durationDays,
    amount: plan.amount,
    status: 'active',
    paymentStatus: 'paid',
    startDate: start,
    expiryDate: expiry,
    activatedAt: start,
    gateway: 'test',
    paymentMethod: 'wallet',
    transactionId: `TEST-${Date.now()}`,
  });

  await SubscriptionHistory.create({
    driverId: req.user._id,
    subscriptionId: subscription._id,
    planId: plan._id,
    planName: plan.name,
    action: 'purchase',
    amount: plan.amount,
    startDate: start,
    expiryDate: expiry,
    transactionId: subscription.transactionId,
    paymentMethod: 'test',
  });

  ok(res, subscription, 'Subscription activated', 201);
});

/** GET /cab-driver/subscription/history */
exports.getSubscriptionHistory = wrap(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const filter = { driverId: req.user._id };
  const [items, total] = await Promise.all([
    SubscriptionHistory.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    SubscriptionHistory.countDocuments(filter),
  ]);
  ok(res, {
    items,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) || 1 },
  });
});

/** GET /cab-driver/location */
exports.getLocation = wrap(async (req, res) => {
  const data = await locationService.getLocationStatus(req.user._id);
  ok(res, {
    location: data
      ? {
          isOnline: data.isOnline,
          isAvailable: data.isAvailable,
          vehicleId: data.vehicleId,
          bookingId: data.bookingId,
          heading: data.heading,
          speed: data.speed,
          lastSeen: data.lastSeen,
          location: data.location
            ? { coordinates: [data.location.lng, data.location.lat] }
            : undefined,
        }
      : null,
    availabilityStatus: data?.availabilityStatus || 'offline',
    activeRide: data?.activeRide || null,
  });
});

/** GET /cab-driver/location/status — alias for full driver location state */
exports.getLocationStatus = exports.getLocation;

/** PATCH /cab-driver/online */
exports.setOnline = wrap(async (req, res) => {
  const io = req.app.get('io');
  const location = await locationService.setOnlineStatus(req.user._id, req.body, io);
  ok(res, location, location.isOnline ? 'You are online' : 'You are offline');
});

/** PATCH /cab-driver/availability */
exports.setAvailability = wrap(async (req, res) => {
  const io = req.app.get('io');
  const location = await locationService.setAvailability(req.user._id, req.body.isAvailable, io);
  ok(res, location, location.isAvailable ? 'You are available for rides' : 'Availability paused');
});

/** PATCH /cab-driver/location */
exports.updateLocation = wrap(async (req, res) => {
  const io = req.app.get('io');
  const location = await locationService.updateLocation(req.user._id, req.body.coordinates, {
    isAvailable: req.body.isAvailable,
  }, io);
  ok(res, location, 'Location updated');
});

/** GET /cab-driver/rides/requests */
exports.getRideRequests = wrap(async (req, res) => {
  const io = req.app.get('io');
  if (process.env.NODE_ENV !== 'production') {
    await rideService.seedDemoRequestsIfEmpty();
    const pending = await require('../models/CabRide').find({ status: 'SEARCHING_DRIVER' }).limit(5).lean();
    pending.forEach((r) => rideService.broadcastRideRequest(io, r));
  }
  const requests = await rideService.getPendingRequests(req.user._id);
  ok(res, requests);
});

/** POST /cab-driver/rides/:id/accept */
exports.acceptRide = wrap(async (req, res) => {
  const ride = await rideService.acceptRide(req.user._id, req.params.id, req.app.get('io'));
  ok(res, ride, 'Ride accepted');
});

/** POST /cab-driver/rides/:id/reject */
exports.rejectRide = wrap(async (req, res) => {
  const result = await rideService.rejectRide(req.user._id, req.params.id);
  ok(res, result);
});

/** PATCH /cab-driver/rides/:id/status */
exports.updateRideStatus = wrap(async (req, res) => {
  const io = req.app.get('io');
  const result = await rideService.updateRideStatus(req.user._id, req.params.id, req.body.status);
  const ride = result.ride || result;
  if (result.location) {
    locationService.broadcastDriverLocation(io, result.location);
  }
  io?.emit('cab-ride:status', { rideId: ride._id, status: ride.status, ride });
  io?.to(`ride:${ride._id}`).emit('cab-ride:status', { rideId: ride._id, status: ride.status, ride });
  if (ride.customerId) {
    io?.to(`customer:${ride.customerId}`).emit('cab-ride:status', { rideId: ride._id, status: ride.status, ride });
  }
  ok(res, ride, 'Ride status updated');
});

/** GET /cab-driver/rides */
exports.getMyRides = wrap(async (req, res) => {
  const data = await rideService.getDriverRides(req.user._id, req.query);
  ok(res, data);
});

/** GET /cab-driver/rides/active */
exports.getActiveRide = wrap(async (req, res) => {
  const ride = await rideService.getActiveRide(req.user._id);
  ok(res, ride);
});
