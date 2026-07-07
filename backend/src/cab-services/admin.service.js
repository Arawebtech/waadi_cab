const {
  Customer,
  User,
  SubscriptionPlan,
  Subscription,
  SubscriptionHistory,
  CabBooking,
  RiderDocument,
  DriverLocation,
  Vehicle,
  Notification,
} = require('../models');
const AppError = require('../utils/AppError');
const kycService = require('./kyc.service');
const auditService = require('./audit.service');
const driverLocationService = require('./driverLocation.service');
const bankDetailService = require('./bankDetail.service');
const subscriptionService = require('./subscription.service');

async function dashboardStats() {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalCustomers,
    totalRiders,
    activeRiders,
    activeSubscriptions,
    pendingKyc,
    todayRides,
    monthlyRides,
    revenueAgg,
  ] = await Promise.all([
    Customer.countDocuments({ status: 'active' }),
    User.countDocuments(isActive),
    DriverLocation.countDocuments({ isOnline: true }),
    Subscription.countDocuments({ status: 'active', expiryDate: { $gt: new Date() } }),
    User.countDocuments({ verificationStatus: { $in: ['under_review', 'kyc_submitted'] } }),
    CabBooking.countDocuments({ createdAt: { $gte: startOfDay } }),
    CabBooking.countDocuments({ createdAt: { $gte: startOfMonth } }),
    Subscription.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);

  return {
    totalCustomers,
    totalRiders,
    activeRiders,
    activeSubscriptions,
    pendingKyc,
    todayRides,
    monthlyRides,
    revenue: revenueAgg[0]?.total || 0,
  };
}

async function listRiders({ page = 1, limit = 20, search, status, verificationStatus } = {}) {
  const filter = {};
  if (status) filter.status = status;
  if (verificationStatus) filter.verificationStatus = verificationStatus;
  if (search) {
    filter.$or = [
      { fullName: new RegExp(search, 'i') },
      { email: new RegExp(search, 'i') },
      { phone: new RegExp(search, 'i') },
    ];
  }

  const [riders, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  const enriched = await Promise.all(
    riders.map(async (rider) => {
      const [driverLocation, subscription, vehicle] = await Promise.all([
        DriverLocation.findOne({ driverId: rider._id }).lean(),
        subscriptionService.getSubscriptionSummary(rider._id),
        Vehicle.findOne({ userId: rider._id, isActive: true }).lean(),
      ]);
      return {
        ...rider,
        isOnline: driverLocation?.isOnline ?? false,
        isAvailable: driverLocation?.isAvailable ?? false,
        lastSeen: driverLocation?.lastSeen,
        subscriptionStatus: subscription.subscriptionStatus,
        subscriptionExpiryDate: subscription.subscriptionExpiryDate,
        currentPlan: subscription.currentPlan,
        vehicle,
      };
    })
  );

  return { riders: enriched, total, page, limit };
}

async function getRiderDetail(driverId) {
  const rider = await User.findById(driverId).lean();
  if (!rider) throw new AppError('User not found', 404);

  const [documents, vehicle, bank, subscription, subscriptionSummary, subscriptions, subscriptionHistory, driverLocation, history] =
    await Promise.all([
    RiderDocument.find({ driverId }).populate('verifiedBy', 'name email').lean(),
    Vehicle.find({ userId: driverId }).lean(),
    bankDetailService.getByRiderId(driverId),
    subscriptionService.getCurrentSubscription(driverId),
    subscriptionService.getSubscriptionSummary(driverId),
    Subscription.find({ driverId }).sort({ createdAt: -1 }).lean(),
    SubscriptionHistory.find({ driverId }).sort({ createdAt: -1 }).lean(),
    DriverLocation.findOne({ driverId }).lean(),
    CabBooking.find({ driverId }).sort({ createdAt: -1 }).limit(20).lean(),
  ]);

  return {
    rider,
    documents,
    vehicle,
    bank,
    subscription,
    subscriptionSummary,
    subscriptions,
    subscriptionHistory,
    driverLocation,
    rideHistory: history,
  };
}

async function forceRiderOffline(driverId, adminId) {
  await driverLocationService.forceOffline(driverId);
  await auditService.log({
    actorType: 'admin',
    actorId: adminId,
    action: 'force_offline',
    resource: 'Driver',
    resourceId: driverId,
  });
  return driverLocationService.getLocationRecord(driverId);
}

async function listDocuments({ page = 1, limit = 30, status } = {}) {
  const filter = {};
  if (status) filter.status = status;
  const docs = await RiderDocument.find(filter)
    .populate('driverId', 'fullName email phone')
    .populate('verifiedBy', 'name')
    .sort({ uploadedAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
  return docs;
}

async function listVehicles({ page = 1, limit = 50, approvalStatus, search } = {}) {
  const filter = { isActive: true };
  if (approvalStatus) filter.approvalStatus = approvalStatus;

  if (search) {
    const riders = await User.find({
      $or: [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ],
    }).select('_id');
    const riderIds = riders.map((r) => r._id);
    filter.$or = [
      { plateNumber: { $regex: search, $options: 'i' } },
      { brand: { $regex: search, $options: 'i' } },
      { model: { $regex: search, $options: 'i' } },
      ...(riderIds.length ? [{ userId: { $in: riderIds } }] : []),
    ];
  }

  const [vehicles, total] = await Promise.all([
    Vehicle.find(filter)
      .populate('userId', 'fullName email phone')
      .populate('verifiedBy', 'name email')
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Vehicle.countDocuments(filter),
  ]);

  return { vehicles, total, page, limit };
}

const VEHICLE_DOC_TYPES = ['rc_front', 'rc_back', 'insurance', 'pollution', 'license_front', 'license_back'];

async function getVehicleDetail(vehicleId) {
  const vehicle = await Vehicle.findById(vehicleId)
    .populate('userId', 'fullName email phone cabBooking')
    .populate('verifiedBy', 'name email')
    .lean();
  if (!vehicle) throw new AppError('Vehicle not found', 404);

  const driverId = vehicle.userId?._id || vehicle.userId;
  const documents = await RiderDocument.find({
    driverId,
    docType: { $in: VEHICLE_DOC_TYPES },
  })
    .sort({ docType: 1 })
    .lean();

  return { vehicle, documents };
}

async function approveVehicle(vehicleId, adminId) {
  const vehicle = await Vehicle.findById(vehicleId);
  if (!vehicle) throw new AppError('Vehicle not found', 404);

  vehicle.approvalStatus = 'approved';
  vehicle.verifiedBy = adminId;
  vehicle.verifiedAt = new Date();
  vehicle.rejectReason = null;
  await vehicle.save();

  await RiderDocument.updateMany(
    { driverId: vehicle.userId, docType: { $in: VEHICLE_DOC_TYPES }, status: 'pending' },
    { status: 'approved', verifiedBy: adminId, verifiedAt: new Date(), rejectReason: null }
  );

  await Notification.create({
    accountId: vehicle.userId,
    accountType: 'Driver',
    title: 'Vehicle approved',
    body: 'Your vehicle details have been verified by admin.',
    type: 'kyc',
  });

  await auditService.log({
    actorType: 'admin',
    actorId: adminId,
    action: 'vehicle_approve',
    resource: 'Vehicle',
    resourceId: vehicleId,
  });

  return Vehicle.findById(vehicleId)
    .populate('userId', 'fullName email phone')
    .lean();
}

async function rejectVehicle(vehicleId, adminId, reason) {
  const vehicle = await Vehicle.findById(vehicleId);
  if (!vehicle) throw new AppError('Vehicle not found', 404);

  vehicle.approvalStatus = 'rejected';
  vehicle.verifiedBy = adminId;
  vehicle.verifiedAt = new Date();
  vehicle.rejectReason = reason || 'Vehicle details rejected';
  await vehicle.save();

  await Notification.create({
    accountId: vehicle.userId,
    accountType: 'Driver',
    title: 'Vehicle rejected',
    body: reason || 'Please update your vehicle details and resubmit.',
    type: 'kyc',
  });

  await auditService.log({
    actorType: 'admin',
    actorId: adminId,
    action: 'vehicle_reject',
    resource: 'Vehicle',
    resourceId: vehicleId,
    metadata: { reason },
  });

  return Vehicle.findById(vehicleId)
    .populate('userId', 'fullName email phone')
    .lean();
}

async function listSubscriptions({ page = 1, limit = 50, status, paymentStatus } = {}) {
  const filter = {};
  if (status) filter.status = status;
  if (paymentStatus) filter.paymentStatus = paymentStatus;

  const [subscriptions, total] = await Promise.all([
    Subscription.find(filter)
      .populate('driverId', 'fullName email phone')
      .populate('planId', 'name slug durationDays amount')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Subscription.countDocuments(filter),
  ]);

  return { subscriptions, total, page, limit };
}

async function getRiderSubscriptions(driverId) {
  const rider = await User.findById(driverId).lean();
  if (!rider) throw new AppError('User not found', 404);

  const [summary, current, subscriptions, history] = await Promise.all([
    subscriptionService.getSubscriptionSummary(driverId),
    subscriptionService.getCurrentSubscription(driverId),
    Subscription.find({ driverId }).sort({ createdAt: -1 }).lean(),
    SubscriptionHistory.find({ driverId }).sort({ createdAt: -1 }).lean(),
  ]);

  return { rider, summary, current, subscriptions, history };
}

async function listDriverLocations() {
  return DriverLocation.find()
    .populate('driverId', 'fullName email phone')
    .populate('bookingId', 'bookingNumber status')
    .sort({ lastSeen: -1 })
    .limit(100)
    .lean();
}

// async function createPlan(data) {
//   const plan = await SubscriptionPlan.create(data);
//   await auditService.log({ actorType: 'admin', action: 'plan_create', resource: 'SubscriptionPlan', resourceId: plan._id });
//   return plan;
// }


async function subscriptionReports() {
  return Subscription.aggregate([
    { $group: { _id: '$planName', count: { $sum: 1 }, revenue: { $sum: '$amount' } } },
    { $sort: { revenue: -1 } },
  ]);
}

async function listCustomers({ page = 1, limit = 20 } = {}) {
  return Customer.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean();
}

async function setCustomerStatus(id, status) {
  return Customer.findByIdAndUpdate(id, { status }, { new: true });
}

async function setRiderStatus(id, status, adminId) {
  const update = { status };
  const rider = await User.findByIdAndUpdate(id, update, { new: true });
  if (status === 'suspended') {
    await driverLocationService.forceOffline(id);
  }
  await auditService.log({
    actorType: 'admin',
    actorId: adminId,
    action: status === 'suspended' ? 'rider_suspend' : 'rider_activate',
    resource: 'Driver',
    resourceId: id,
  });
  return rider;
}

async function getRiderDocuments(driverId) {
  return RiderDocument.find({ driverId }).lean();
}

async function listBookings({ page = 1, limit = 30, status } = {}) {
  const filter = {};
  if (status) filter.status = status;
  return CabBooking.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('customerId', 'fullName email phone')
    .populate('driverId', 'fullName email phone')
    .populate('vehicleId', 'vehicleNumber vehicleType seatCapacity')
    .lean();
}

async function revenueAnalytics() {
  const months = [];
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    months.push({ year: d.getFullYear(), month: d.getMonth() });
  }

  return Promise.all(
    months.map(async ({ year, month }) => {
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 1);
      const [rides, subs] = await Promise.all([
        CabBooking.aggregate([
          { $match: { status: 'TRIP_COMPLETED', tripCompletedAt: { $gte: start, $lt: end } } },
          { $group: { _id: null, revenue: { $sum: '$fare.total' }, count: { $sum: 1 } } },
        ]),
        Subscription.aggregate([
          { $match: { paymentStatus: 'paid', createdAt: { $gte: start, $lt: end } } },
          { $group: { _id: null, revenue: { $sum: '$amount' }, count: { $sum: 1 } } },
        ]),
      ]);
      return {
        label: start.toLocaleString('en', { month: 'short', year: '2-digit' }),
        rideRevenue: rides[0]?.revenue || 0,
        rideCount: rides[0]?.count || 0,
        subscriptionRevenue: subs[0]?.revenue || 0,
      };
    })
  );
}

async function driverPerformance() {
  return CabBooking.aggregate([
    { $match: { status: 'TRIP_COMPLETED', driverId: { $ne: null } } },
    {
      $group: {
        _id: '$driverId',
        completedRides: { $sum: 1 },
        earnings: { $sum: '$fare.total' },
      },
    },
    { $sort: { completedRides: -1 } },
    { $limit: 20 },
    {
      $lookup: {
        from: 'riders',
        localField: '_id',
        foreignField: '_id',
        as: 'rider',
      },
    },
    { $unwind: '$rider' },
    {
      $project: {
        driverId: '$_id',
        fullName: '$rider.fullName',
        rating: '$rider.rating',
        completedRides: 1,
        earnings: { $round: ['$earnings', 2] },
      },
    },
  ]);
}

module.exports = {
  dashboardStats,
  createPlan,
  updatePlan,
  deletePlan,
  listPlans,
  subscriptionReports,
  listCustomers,
  setCustomerStatus,
  listRiders,
  getRiderDetail,
  setRiderStatus,
  forceRiderOffline,
  getRiderDocuments,
  listDocuments,
  listVehicles,
  getVehicleDetail,
  approveVehicle,
  rejectVehicle,
  listSubscriptions,
  getRiderSubscriptions,
  listDriverLocations,
  listBookings,
  revenueAnalytics,
  driverPerformance,
  approveRider: kycService.approveRider,
  rejectRider: kycService.rejectRider,
  getPendingRiders: kycService.getPendingRiders,
  approveDocument: kycService.approveDocument,
  rejectDocument: kycService.rejectDocument,
  approveBank: bankDetailService.approveBankDetails,
  rejectBank: bankDetailService.rejectBankDetails,
  listBankDetails: bankDetailService.listAll,
  getBankDetail: bankDetailService.getByRiderIdForAdmin,
};
