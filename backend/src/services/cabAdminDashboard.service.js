const User = require('../models/User');
const mongoose = require('mongoose');
const Customer = require('../models/Customer');
const CabRide = require('../models/CabRide');
const Subscription = require('../models/Subscription');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const SubscriptionHistory = require('../models/SubscriptionHistory');
const Wallet = require('../models/Wallet');
const WalletTransaction = require('../models/WalletTransaction');
const DriverLocation = require('../models/DriverLocation');
const Vehicle = require('../models/Vehicle');
const Admin = require('../models/Admin');
const CabVerificationHistory = require('../models/CabVerificationHistory');
const cache = require('../utils/simpleCache');
const { logVerification, listHistory, softDeleteHistory } = require('./verificationHistory.service');
const { deleteDriverFile } = require('../cab-driver/upload.service');

const ACTIVE_RIDE_STATUSES = [
  'REQUESTED',
  'SEARCHING_DRIVER',
  'DRIVER_ASSIGNED',
  'DRIVER_ARRIVING',
  'DRIVER_ARRIVED',
  'OTP_VERIFICATION',
  'TRIP_STARTED',
];

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function startOfYear(d = new Date()) {
  return new Date(d.getFullYear(), 0, 1);
}

async function sumRideRevenue(match = {}) {
  const [result] = await CabRide.aggregate([
    { $match: { status: 'TRIP_COMPLETED', ...match } },
    { $group: { _id: null, total: { $sum: '$fare.total' } } },
  ]);
  return result?.total || 0;
}

async function sumSubscriptionRevenue(match = {}) {
  const [result] = await Subscription.aggregate([
    { $match: { paymentStatus: 'paid', deleted: { $ne: true }, ...match } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  return result?.total || 0;
}

const VEHICLE_DOC_TYPES = ['rc', 'aadhaar', 'pan', 'insurance', 'puc', 'license'];

function flattenPendingVehicleDocuments(vehicles) {
  const items = [];
  for (const v of vehicles) {
    for (const docType of VEHICLE_DOC_TYPES) {
      const doc = v.documents?.[docType];
      if (doc?.status === 'pending' && doc.url) {
        items.push({
          _id: `${v._id}:${docType}`,
          vehicleId: v._id,
          docType,
          url: doc.url,
          public_id: doc.public_id,
          status: doc.status,
          uploadedAt: doc.uploadedAt,
          userId: v.userId,
          vehicleNumber: v.vehicleNumber,
        });
      }
    }
  }
  return items.sort((a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0));
}

async function countPendingVehicleDocuments() {
  const vehicles = await Vehicle.find({ isActive: true }).select('documents').lean();
  let count = 0;
  for (const v of vehicles) {
    for (const docType of VEHICLE_DOC_TYPES) {
      if (v.documents?.[docType]?.status === 'pending') count += 1;
    }
  }
  return count;
}

async function getDashboardStats() {
  const cached = cache.get('cab:dashboard');
  if (cached) return cached;

  const now = new Date();
  const dayStart = startOfDay(now);
  const monthStart = startOfMonth(now);
  const yearStart = startOfYear(now);

  const [
    totalCustomers,
    totalDrivers,
    totalCabRides,
    activeSubscriptions,
    expiredSubscriptions,
    pendingProfileVerifications,
    pendingVehicleDocuments,
    pendingVehicles,
    onlineDrivers,
    activeTrips,
    completedTrips,
    cancelledTrips,
    walletAgg,
    totalWalletTransactions,
    dailyRideRevenue,
    monthlyRideRevenue,
    yearlyRideRevenue,
    dailySubRevenue,
    monthlySubRevenue,
    yearlySubRevenue,
    totalSubscriptionRevenue,
    totalRideRevenue,
  ] = await Promise.all([
    Customer.countDocuments(),
    User.countDocuments({ userType: { $in: ['driver', 'owner'] } }),
    CabRide.countDocuments(),
    Subscription.countDocuments({ status: 'active', deleted: { $ne: true } }),
    Subscription.countDocuments({ status: 'expired', deleted: { $ne: true } }),
    User.countDocuments({
      userType: { $in: ['driver', 'owner'] },
      'cabBooking.profileVerificationStatus': { $in: ['pending', 'under_review'] },
    }),
    countPendingVehicleDocuments(),
    Vehicle.countDocuments({
      verificationStatus: { $in: ['pending', 'under_review', 'draft'] },
    }),
    DriverLocation.countDocuments({ isOnline: true }),
    CabRide.countDocuments({ status: { $in: ACTIVE_RIDE_STATUSES } }),
    CabRide.countDocuments({ status: 'TRIP_COMPLETED' }),
    CabRide.countDocuments({ status: 'CANCELLED' }),
    Wallet.aggregate([{ $group: { _id: null, totalBalance: { $sum: '$balance' } } }]),
    WalletTransaction.countDocuments(),
    sumRideRevenue({ completedAt: { $gte: dayStart } }),
    sumRideRevenue({ completedAt: { $gte: monthStart } }),
    sumRideRevenue({ completedAt: { $gte: yearStart } }),
    sumSubscriptionRevenue({ updatedAt: { $gte: dayStart } }),
    sumSubscriptionRevenue({ updatedAt: { $gte: monthStart } }),
    sumSubscriptionRevenue({ updatedAt: { $gte: yearStart } }),
    sumSubscriptionRevenue(),
    sumRideRevenue(),
  ]);

  const walletBalance = walletAgg[0]?.totalBalance || 0;
  const dailyRevenue = dailyRideRevenue + dailySubRevenue;
  const monthlyRevenue = monthlyRideRevenue + monthlySubRevenue;
  const yearlyRevenue = yearlyRideRevenue + yearlySubRevenue;
  const totalRevenue = totalRideRevenue + totalSubscriptionRevenue;

  const result = {
    totalCustomers,
    totalDrivers,
    totalCabRides,
    totalRevenue,
    totalSubscriptionRevenue,
    totalRideRevenue,
    activeSubscriptions,
    expiredSubscriptions,
    pendingVerifications: pendingProfileVerifications + pendingVehicleDocuments + pendingVehicles,
    pendingProfileVerifications,
    pendingVehicleDocuments,
    pendingDriverDocuments: pendingVehicleDocuments,
    pendingVehicles,
    onlineDrivers,
    activeTrips,
    completedTrips,
    cancelledTrips,
    walletBalance,
    totalWalletTransactions,
    dailyRevenue,
    monthlyRevenue,
    yearlyRevenue,
  };
  cache.set('cab:dashboard', result, 30000);
  return result;
}

async function listDrivers({ page = 1, limit = 20, search = '', status = '' } = {}) {
  const filter = { userType: { $in: ['driver', 'owner'] } };
  if (search) {
    filter.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { phoneNumber: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }
  if (status === 'active') filter.isActive = true;
  if (status === 'suspended') filter.isActive = false;
  if (status === 'verified') filter.isVerified = true;
  if (status === 'unverified') filter.isVerified = false;

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
    User.countDocuments(filter),
  ]);

  return {
    items,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / Number(limit)) || 1,
    },
  };
}

async function updateDriverStatus(driverId, { isActive, isVerified, profileVerificationStatus, profileRejectionReason }) {
  const updates = {};
  if (isActive !== undefined) updates.isActive = isActive;
  if (isVerified !== undefined) updates.isVerified = isVerified;
  if (profileVerificationStatus) {
    updates['cabBooking.profileVerificationStatus'] = profileVerificationStatus;
    if (profileRejectionReason !== undefined) {
      updates['cabBooking.profileRejectionReason'] = profileRejectionReason;
    }
  }
  const user = await User.findByIdAndUpdate(driverId, { $set: updates }, { new: true });
  if (!user) throw new Error('Driver not found');

  if (profileVerificationStatus) {
    await logVerification({
      entityType: 'driver_profile',
      entityId: user._id,
      driverId: user._id,
      action: profileVerificationStatus === 'approved' ? 'approved' : profileVerificationStatus === 'rejected' ? 'rejected' : 'pending',
      status: profileVerificationStatus === 'approved' ? 'approved' : profileVerificationStatus === 'rejected' ? 'rejected' : 'pending',
      reason: profileRejectionReason,
      metadata: { entityLabel: `${user.firstName} ${user.lastName}` },
    });
  }
  if (isActive !== undefined) {
    await logVerification({
      entityType: 'driver_profile',
      entityId: user._id,
      driverId: user._id,
      action: isActive ? 'activated' : 'suspended',
      status: isActive ? 'approved' : 'rejected',
      metadata: { entityLabel: `${user.firstName} ${user.lastName}` },
    });
  }
  cache.invalidatePrefix('cab:');
  return user;
}

async function getDriverAnalytics(driverId) {
  const oid = new mongoose.Types.ObjectId(driverId);
  const [rides, subscription, wallet, vehicles] = await Promise.all([
    CabRide.countDocuments({ driverId: oid }),
    Subscription.findOne({ driverId: oid, status: 'active', deleted: { $ne: true } }).populate('planId').lean(),
    Wallet.findOne({ ownerId: oid, ownerType: 'Driver' }).lean(),
    Vehicle.find({ userId: oid }).lean(),
  ]);
  const [completed, cancelled, earnings, ratingStats, lastRating] = await Promise.all([
    CabRide.countDocuments({ driverId: oid, status: 'TRIP_COMPLETED' }),
    CabRide.countDocuments({ driverId: oid, status: 'CANCELLED' }),
    CabRide.aggregate([
      { $match: { driverId: oid, status: 'TRIP_COMPLETED' } },
      { $group: { _id: null, total: { $sum: '$fare.total' } } },
    ]),
    CabRide.aggregate([
      { $match: { driverId: oid, 'rating.score': { $exists: true, $ne: null } } },
      {
        $group: {
          _id: null,
          average: { $avg: '$rating.score' },
          totalReviews: { $sum: 1 },
          star5: { $sum: { $cond: [{ $eq: ['$rating.score', 5] }, 1, 0] } },
          star4: { $sum: { $cond: [{ $eq: ['$rating.score', 4] }, 1, 0] } },
          star3: { $sum: { $cond: [{ $eq: ['$rating.score', 3] }, 1, 0] } },
          star2: { $sum: { $cond: [{ $eq: ['$rating.score', 2] }, 1, 0] } },
          star1: { $sum: { $cond: [{ $eq: ['$rating.score', 1] }, 1, 0] } },
        },
      },
    ]),
    CabRide.findOne({ driverId: oid, 'rating.score': { $exists: true } })
      .sort({ 'rating.ratedAt': -1, updatedAt: -1 })
      .select('rating rideNumber customerName')
      .lean(),
  ]);
  return {
    rides: { total: rides, completed, cancelled },
    earnings: earnings[0]?.total || 0,
    subscription,
    wallet,
    vehicles,
    ratings: {
      average: ratingStats[0]?.average ? Math.round(ratingStats[0].average * 10) / 10 : null,
      totalReviews: ratingStats[0]?.totalReviews || 0,
      breakdown: ratingStats[0]
        ? { 5: ratingStats[0].star5, 4: ratingStats[0].star4, 3: ratingStats[0].star3, 2: ratingStats[0].star2, 1: ratingStats[0].star1 }
        : { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      lastRating: lastRating?.rating || null,
      lastRideNumber: lastRating?.rideNumber || null,
      lastCustomerName: lastRating?.customerName || null,
    },
  };
}

async function listCustomers({ page = 1, limit = 20, search = '', status = '' } = {}) {
  const filter = {};
  if (search) {
    filter.$or = [
      { fullName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ];
  }
  if (status) filter.status = status;

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Customer.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
    Customer.countDocuments(filter),
  ]);

  return {
    items,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / Number(limit)) || 1,
    },
  };
}

async function getCustomerDetails(customerId) {
  const customer = await Customer.findById(customerId).lean();
  if (!customer) throw new Error('Customer not found');

  const [rides, wallet, transactions] = await Promise.all([
    CabRide.find({ customerPhone: customer.phone }).sort({ createdAt: -1 }).limit(50).lean(),
    customer.walletId ? Wallet.findById(customer.walletId).lean() : Wallet.findOne({ ownerId: customerId, ownerType: 'Customer' }).lean(),
    WalletTransaction.find({ ownerId: customerId, ownerType: 'Customer' }).sort({ createdAt: -1 }).limit(50).lean(),
  ]);

  return { customer, rides, wallet, transactions };
}

async function listRides({ page = 1, limit = 20, status = '', search = '', category = '' } = {}) {
  const filter = {};
  if (status) filter.status = status;
  if (category === 'active') filter.status = { $in: ACTIVE_RIDE_STATUSES };
  if (category === 'completed') filter.status = 'TRIP_COMPLETED';
  if (category === 'cancelled') filter.status = 'CANCELLED';
  if (search) {
    filter.$or = [
      { rideNumber: { $regex: search, $options: 'i' } },
      { customerName: { $regex: search, $options: 'i' } },
      { customerPhone: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    CabRide.find(filter)
      .populate('driverId', 'firstName lastName phoneNumber')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    CabRide.countDocuments(filter),
  ]);

  return {
    items,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / Number(limit)) || 1,
    },
  };
}

async function listSubscriptions({ page = 1, limit = 20, status = '' } = {}) {
  const filter = { deleted: { $ne: true } };
  if (status) filter.status = status;

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Subscription.find(filter)
      .populate('driverId', 'firstName lastName phoneNumber')
      .populate('planId', 'name amount durationDays')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Subscription.countDocuments(filter),
  ]);

  return {
    items,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / Number(limit)) || 1,
    },
  };
}

async function listSubscriptionHistory({ page = 1, limit = 20, action = '' } = {}) {
  const filter = { deleted: { $ne: true } };
  if (action) filter.action = action;

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    SubscriptionHistory.find(filter)
      .populate('driverId', 'firstName lastName phoneNumber')
      .populate('planId', 'name amount')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    SubscriptionHistory.countDocuments(filter),
  ]);

  return {
    items,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / Number(limit)) || 1,
    },
  };
}

async function listSubscriptionPlans({ page = 1, limit = 50, search = '', isActive } = {}) {
  const filter = { deleted: { $ne: true } };
  if (isActive !== undefined && isActive !== '') filter.isActive = isActive === 'true' || isActive === true;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { slug: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    SubscriptionPlan.find(filter).sort({ sortOrder: 1, createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
    SubscriptionPlan.countDocuments(filter),
  ]);

  return {
    items,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / Number(limit)) || 1,
    },
  };
}

async function listWallets({ page = 1, limit = 20, ownerType = '' } = {}) {
  const filter = {};
  if (ownerType) filter.ownerType = ownerType;

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Wallet.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(Number(limit)).lean(),
    Wallet.countDocuments(filter),
  ]);

  return {
    items,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / Number(limit)) || 1,
    },
  };
}

async function listWalletTransactions({ page = 1, limit = 20, type = '', purpose = '', ownerType = '' } = {}) {
  const filter = {};
  if (type) filter.type = type;
  if (purpose) filter.purpose = purpose;
  if (ownerType) filter.ownerType = ownerType;

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    WalletTransaction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
    WalletTransaction.countDocuments(filter),
  ]);

  return {
    items,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / Number(limit)) || 1,
    },
  };
}

async function listPendingVerifications() {
  const [profiles, vehicleRows, vehicles] = await Promise.all([
    User.find({
      userType: { $in: ['driver', 'owner'] },
      'cabBooking.profileVerificationStatus': { $in: ['pending', 'under_review'] },
    })
      .select('firstName lastName phoneNumber email profile cabBooking createdAt updatedAt isVerified isActive')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean(),
    Vehicle.find({ isActive: true })
      .populate('userId', 'firstName lastName phoneNumber')
      .sort({ updatedAt: -1 })
      .limit(100)
      .lean(),
    Vehicle.find({ verificationStatus: { $in: ['pending', 'under_review', 'draft'] } })
      .populate('userId', 'firstName lastName phoneNumber')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean(),
  ]);

  const documents = flattenPendingVehicleDocuments(vehicleRows);

  return { profiles, documents, vehicles };
}

function parseVehicleDocumentId(documentId) {
  const [vehicleId, documentType] = String(documentId).split(':');
  if (!vehicleId || !documentType || !VEHICLE_DOC_TYPES.includes(documentType)) {
    throw new Error('Document not found');
  }
  return { vehicleId, documentType };
}

async function verifyDriverDocument(documentId, { status, reason }) {
  const { vehicleId, documentType } = parseVehicleDocumentId(documentId);
  const vehicle = await Vehicle.findById(vehicleId).populate('userId', 'firstName lastName');
  if (!vehicle) throw new Error('Vehicle not found');
  const doc = vehicle.documents?.[documentType];
  if (!doc?.url) throw new Error('Document not found');
  const prevStatus = doc.status;
  vehicle.documents[documentType].status = status;
  vehicle.documents[documentType].rejectionReason = status === 'rejected' ? (reason || 'Rejected') : null;
  if (status === 'approved') {
    vehicle.documents[documentType].approvedAt = new Date();
  }
  if (vehicle.verificationHistory) {
    vehicle.verificationHistory.push({
      action: status === 'approved' ? 'document_approved' : 'document_rejected',
      documentType,
      remarks: reason || null,
    });
  }
  await vehicle.save();

  await logVerification({
    entityType: 'vehicle_document',
    entityId: `${vehicleId}:${documentType}`,
    driverId: vehicle.userId?._id || vehicle.userId,
    action: status === 'approved' ? 'approved' : 'rejected',
    status: status === 'approved' ? 'approved' : 'rejected',
    previousStatus: prevStatus,
    reason: reason || null,
    metadata: {
      docType: documentType,
      documentUrl: doc.url,
      vehicleNumber: vehicle.vehicleNumber,
      entityLabel: `${vehicle.vehicleNumber} · ${documentType}`,
    },
  });
  cache.invalidatePrefix('cab:');
  return { _id: documentId, vehicleId, docType: documentType, status, url: doc.url };
}

async function deleteDriverDocument(documentId) {
  const { vehicleId, documentType } = parseVehicleDocumentId(documentId);
  const vehicle = await Vehicle.findById(vehicleId).populate('userId', 'firstName lastName');
  if (!vehicle) throw new Error('Vehicle not found');
  const doc = vehicle.documents?.[documentType];
  if (!doc?.url) throw new Error('Document not found');
  const prevStatus = doc.status;
  if (doc.public_id) await deleteDriverFile(doc.public_id);
  vehicle.documents[documentType] = {
    url: null,
    public_id: null,
    status: 'not_uploaded',
    uploadedAt: null,
    approvedAt: null,
    approvedBy: null,
    rejectionReason: null,
  };
  if (vehicle.verificationHistory) {
    vehicle.verificationHistory.push({
      action: 'document_deleted',
      documentType,
    });
  }
  await vehicle.save();

  await logVerification({
    entityType: 'vehicle_document',
    entityId: documentId,
    driverId: vehicle.userId?._id || vehicle.userId,
    action: 'deleted',
    status: 'deleted',
    previousStatus: prevStatus,
    metadata: {
      docType: documentType,
      vehicleNumber: vehicle.vehicleNumber,
      entityLabel: `${vehicle.vehicleNumber} · ${documentType}`,
    },
  });
  cache.invalidatePrefix('cab:');
  return { _id: documentId, vehicleId, docType: documentType, status: 'not_uploaded' };
}

async function verifyVehicle(vehicleId, { status, reason }) {
  const vehicle = await Vehicle.findById(vehicleId).populate('userId', 'firstName lastName');
  if (!vehicle) throw new Error('Vehicle not found');
  const prevStatus = vehicle.verificationStatus;
  vehicle.verificationStatus = status;
  vehicle.verifiedAt = new Date();
  vehicle.rejectionReason = status === 'rejected' ? (reason || 'Rejected') : null;
  if (vehicle.verificationHistory) {
    vehicle.verificationHistory.push({
      action: status === 'approved' ? 'vehicle_approved' : 'vehicle_rejected',
      remarks: reason,
      performedBy: null,
    });
  }
  await vehicle.save();

  await logVerification({
    entityType: 'vehicle',
    entityId: vehicle._id,
    driverId: vehicle.userId?._id || vehicle.userId,
    action: status === 'approved' ? 'approved' : 'rejected',
    status: status === 'approved' ? 'approved' : 'rejected',
    previousStatus: prevStatus,
    reason: reason || null,
    metadata: {
      vehicleNumber: vehicle.vehicleNumber,
      entityLabel: vehicle.vehicleNumber,
    },
  });
  cache.invalidatePrefix('cab:');
  return vehicle;
}

async function getReports(period = '30d') {
  const days = period === '7d' ? 7 : period === '90d' ? 90 : period === '365d' ? 365 : 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [rideTrend, subscriptionTrend, rideStatusBreakdown, topDrivers] = await Promise.all([
    CabRide.aggregate([
      { $match: { status: 'TRIP_COMPLETED', completedAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } },
          revenue: { $sum: '$fare.total' },
          rides: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    SubscriptionHistory.aggregate([
      { $match: { action: { $in: ['purchase', 'renew'] }, createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    CabRide.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    CabRide.aggregate([
      { $match: { status: 'TRIP_COMPLETED', driverId: { $ne: null }, completedAt: { $gte: since } } },
      {
        $group: {
          _id: '$driverId',
          rides: { $sum: 1 },
          revenue: { $sum: '$fare.total' },
        },
      },
      { $sort: { rides: -1 } },
      { $limit: 10 },
    ]),
  ]);

  const driverIds = topDrivers.map((d) => d._id).filter(Boolean);
  const drivers = await User.find({ _id: { $in: driverIds } }).select('firstName lastName phoneNumber').lean();
  const driverMap = Object.fromEntries(drivers.map((d) => [String(d._id), d]));

  return {
    rideTrend,
    subscriptionTrend,
    rideStatusBreakdown,
    topDrivers: topDrivers.map((d) => ({
      ...d,
      driver: driverMap[String(d._id)] || null,
    })),
  };
}

async function listAdmins() {
  return Admin.find().select('-password').sort({ createdAt: -1 }).lean();
}

async function createAdmin({ name, email, password, role }) {
  const exists = await Admin.findOne({ email: email.toLowerCase() });
  if (exists) throw new Error('Admin already exists');
  const admin = await Admin.create({ name, email: email.toLowerCase(), password, role: role || 'admin' });
  const obj = admin.toObject();
  delete obj.password;
  return obj;
}

async function updateAdmin(adminId, updates) {
  const allowed = ['name', 'email', 'role', 'isActive'];
  const data = {};
  Object.keys(updates).forEach((k) => {
    if (allowed.includes(k)) data[k] = updates[k];
  });
  if (updates.password) data.password = updates.password;
  const admin = await Admin.findByIdAndUpdate(adminId, data, { new: true }).select('-password');
  if (!admin) throw new Error('Admin not found');
  return admin;
}

async function deleteAdmin(adminId) {
  const admin = await Admin.findByIdAndDelete(adminId);
  if (!admin) throw new Error('Admin not found');
  return { deleted: true };
}

async function getDriverDetails(driverId) {
  const user = await User.findById(driverId).lean();
  if (!user || !['driver', 'owner'].includes(user.userType)) {
    throw new Error('Driver not found');
  }

  const oid = new mongoose.Types.ObjectId(driverId);
  const [
    vehicles,
    subscription,
    subscriptionHistory,
    wallet,
    transactions,
    location,
    activeRide,
    recentRides,
  ] = await Promise.all([
    Vehicle.find({ userId: oid }).sort({ createdAt: -1 }).lean(),
    Subscription.findOne({ driverId: oid, status: 'active', deleted: { $ne: true } }).populate('planId').lean(),
    SubscriptionHistory.find({ driverId: oid, deleted: { $ne: true } }).sort({ createdAt: -1 }).limit(20).lean(),
    Wallet.findOne({ ownerId: oid, ownerType: 'Driver' }).lean(),
    WalletTransaction.find({ ownerId: oid, ownerType: 'Driver' }).sort({ createdAt: -1 }).limit(30).lean(),
    DriverLocation.findOne({ driverId: oid }).lean(),
    CabRide.findOne({ driverId: oid, status: { $in: ACTIVE_RIDE_STATUSES } }).lean(),
    CabRide.find({ driverId: oid }).sort({ createdAt: -1 }).limit(10).lean(),
  ]);

  const analytics = await getDriverAnalytics(driverId);
  const activeVehicle = user.cabBooking?.activeVehicleId
    ? vehicles.find((v) => String(v._id) === String(user.cabBooking.activeVehicleId)) || null
    : vehicles.find((v) => v.isDefault) || vehicles[0] || null;

  const profilePhoto = user.profile?.avatar
    ? { url: user.profile.avatar, docType: 'profile_photo' }
    : null;

  return {
    profile: user,
    profilePhoto,
    vehicles,
    activeVehicle,
    documents: vehicles.flatMap((v) =>
      VEHICLE_DOC_TYPES.filter((t) => v.documents?.[t]?.url).map((t) => ({
        _id: `${v._id}:${t}`,
        docType: t,
        url: v.documents[t].url,
        mimeType: v.documents[t].mimeType,
        status: v.documents[t].status,
        vehicleId: v._id,
        vehicleNumber: v.vehicleNumber,
        uploadedAt: v.documents[t].uploadedAt,
        rejectionReason: v.documents[t].rejectionReason,
      }))
    ),
    subscription,
    subscriptionHistory,
    wallet,
    transactions,
    location,
    activeRide,
    recentRides,
    analytics,
  };
}

async function getVehicleDetails(vehicleId) {
  const vehicle = await Vehicle.findById(vehicleId)
    .populate('userId', 'firstName lastName phoneNumber email cabBooking')
    .lean();
  if (!vehicle) throw new Error('Vehicle not found');
  return vehicle;
}

async function getVehicleDocumentDetails(vehicleId, documentType) {
  const vehicle = await Vehicle.findById(vehicleId)
    .populate('userId', 'firstName lastName phoneNumber email')
    .lean();
  if (!vehicle) throw new Error('Vehicle not found');
  const doc = vehicle.documents?.[documentType];
  if (!doc?.url) throw new Error('Document not found');
  const driver = vehicle.userId;
  return {
    _id: `${vehicleId}:${documentType}`,
    vehicleId: vehicle._id,
    vehicleNumber: vehicle.vehicleNumber,
    docType: documentType,
    url: doc.url,
    public_id: doc.public_id,
    status: doc.status,
    uploadedAt: doc.uploadedAt,
    rejectionReason: doc.rejectionReason,
    userId: driver,
  };
}

async function getDocumentDetails(documentId) {
  const [vehicleId, documentType] = String(documentId).split(':');
  if (!vehicleId || !documentType) throw new Error('Document not found');
  return getVehicleDocumentDetails(vehicleId, documentType);
}

async function getRideDetails(rideId) {
  const ride = await CabRide.findById(rideId)
    .populate('driverId', 'firstName lastName phoneNumber email profile cabBooking')
    .populate('vehicleId', 'vehicleNumber vehicleType seatCapacity')
    .lean();
  if (!ride) throw new Error('Ride not found');

  const timeline = [
    ride.createdAt && { event: 'Ride Requested', at: ride.createdAt, status: 'REQUESTED' },
    ride.assignedAt && { event: 'Driver Assigned', at: ride.assignedAt, status: 'DRIVER_ASSIGNED' },
    ride.arrivedAt && { event: 'Driver Arrived', at: ride.arrivedAt, status: 'DRIVER_ARRIVED' },
    ride.startedAt && { event: 'Trip Started', at: ride.startedAt, status: 'TRIP_STARTED' },
    ride.completedAt && { event: 'Trip Completed', at: ride.completedAt, status: 'TRIP_COMPLETED' },
  ].filter(Boolean);

  const relatedRides = ride.customerPhone
    ? await CabRide.find({ customerPhone: ride.customerPhone, _id: { $ne: ride._id } })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('rideNumber status fare.total createdAt')
        .lean()
    : [];

  return { ride, timeline, relatedRides };
}

async function requestDocumentReupload(documentId, reason) {
  const { vehicleId, documentType } = parseVehicleDocumentId(documentId);
  const vehicle = await Vehicle.findById(vehicleId);
  if (!vehicle) throw new Error('Vehicle not found');
  const doc = vehicle.documents?.[documentType];
  if (!doc?.url) throw new Error('Document not found');
  const prevStatus = doc.status;
  vehicle.documents[documentType].status = 'rejected';
  vehicle.documents[documentType].rejectionReason = reason || 'Please re-upload this document';
  if (vehicle.verificationHistory) {
    vehicle.verificationHistory.push({
      action: 'document_rejected',
      documentType,
      remarks: reason || 'Re-upload requested',
    });
  }
  await vehicle.save();

  await logVerification({
    entityType: 'vehicle_document',
    entityId: documentId,
    driverId: vehicle.userId,
    action: 'reupload_requested',
    status: 'rejected',
    previousStatus: prevStatus,
    reason,
    metadata: { docType: documentType, documentUrl: doc.url, vehicleNumber: vehicle.vehicleNumber },
  });
  cache.invalidatePrefix('cab:');
  return { _id: documentId, vehicleId, docType: documentType, status: 'rejected' };
}

async function cancelRide(rideId, reason) {
  const ride = await CabRide.findByIdAndUpdate(
    rideId,
    {
      $set: {
        status: 'CANCELLED',
        cancelledBy: 'system',
        cancelReason: reason || 'Cancelled by admin',
      },
    },
    { new: true }
  ).lean();
  if (!ride) throw new Error('Ride not found');
  return ride;
}

async function getLiveFleet(filters = {}) {
  const { driverStatus = '', vehicleType = '', rideStatus = '' } = filters;

  const [locations, activeRides] = await Promise.all([
    DriverLocation.find({})
      .populate('driverId', 'firstName lastName phoneNumber profile cabBooking')
      .populate('vehicleId', 'vehicleNumber vehicleType seatCapacity verificationStatus')
      .lean(),
    CabRide.find({
      status: rideStatus || { $in: ACTIVE_RIDE_STATUSES },
    })
      .populate('driverId', 'firstName lastName phoneNumber')
      .select('rideNumber status pickup drop fare driverId customerName customerPhone createdAt')
      .lean(),
  ]);

  const subscriptionByDriver = {};
  const driverIds = locations.map((l) => l.driverId?._id || l.driverId).filter(Boolean);
  if (driverIds.length) {
    const subs = await Subscription.find({
      driverId: { $in: driverIds },
      status: 'active',
      deleted: { $ne: true },
    })
      .populate('planId', 'name amount')
      .lean();
    subs.forEach((s) => {
      subscriptionByDriver[String(s.driverId)] = s;
    });
  }

  const walletByDriver = {};
  if (driverIds.length) {
    const wallets = await Wallet.find({ ownerId: { $in: driverIds }, ownerType: 'Driver' }).lean();
    wallets.forEach((w) => {
      walletByDriver[String(w.ownerId)] = w;
    });
  }

  let drivers = locations.map((loc) => {
    const driverId = String(loc.driverId?._id || loc.driverId || '');
    const activeRide = activeRides.find(
      (r) => String(r.driverId?._id || r.driverId) === driverId
    );
    let status = 'offline';
    if (loc.isOnline) {
      status = activeRide ? 'on_trip' : loc.isAvailable ? 'available' : 'online';
    }
    return {
      ...loc,
      driverId: loc.driverId,
      activeRide: activeRide || null,
      fleetStatus: status,
      subscription: subscriptionByDriver[driverId] || null,
      wallet: walletByDriver[driverId] || null,
      lat: loc.location?.coordinates?.[1],
      lng: loc.location?.coordinates?.[0],
    };
  });

  if (driverStatus) drivers = drivers.filter((d) => d.fleetStatus === driverStatus);
  if (vehicleType) {
    drivers = drivers.filter(
      (d) => d.vehicleId?.vehicleType === vehicleType || d.vehicleId?.vehicleType === vehicleType
    );
  }

  return {
    drivers,
    activeRides,
    stats: {
      online: drivers.filter((d) => d.fleetStatus !== 'offline').length,
      available: drivers.filter((d) => d.fleetStatus === 'available').length,
      onTrip: drivers.filter((d) => d.fleetStatus === 'on_trip').length,
      activeRides: activeRides.length,
    },
  };
}

async function expireSubscription(subscriptionId) {
  const sub = await Subscription.findById(subscriptionId).populate('driverId', 'firstName lastName');
  if (!sub) throw new Error('Subscription not found');
  sub.status = 'expired';
  sub.expiredAt = new Date();
  await sub.save();

  await logVerification({
    entityType: 'subscription',
    entityId: sub._id,
    driverId: sub.driverId?._id || sub.driverId,
    action: 'expired',
    status: 'expired',
    metadata: {
      planName: sub.planName,
      entityLabel: sub.planName,
      amount: sub.amount,
    },
  });
  cache.invalidatePrefix('cab:');
  return sub;
}

async function reverifyFromHistory(historyId) {
  const record = await CabVerificationHistory.findOne({ _id: historyId, deleted: { $ne: true } });
  if (!record) throw new Error('History record not found');

  if (record.entityType === 'driver_profile') {
    await updateDriverStatus(String(record.entityId), {
      profileVerificationStatus: 'under_review',
      isVerified: false,
    });
  } else if (record.entityType === 'driver_document' || record.entityType === 'vehicle_document') {
    const id = String(record.entityId);
    const [vehicleId, documentType] = id.includes(':') ? id.split(':') : [null, null];
    if (vehicleId && documentType) {
      const vehicle = await Vehicle.findById(vehicleId);
      if (vehicle?.documents?.[documentType]) {
        vehicle.documents[documentType].status = 'pending';
        vehicle.documents[documentType].rejectionReason = null;
        await vehicle.save();
      }
    }
  } else if (record.entityType === 'vehicle') {
    const vehicle = await Vehicle.findById(record.entityId);
    if (vehicle) {
      vehicle.verificationStatus = 'under_review';
      vehicle.rejectionReason = null;
      await vehicle.save();
    }
  }

  await logVerification({
    entityType: record.entityType,
    entityId: record.entityId,
    driverId: record.driverId,
    action: 'reverified',
    status: 'pending',
    metadata: record.metadata,
  });
  cache.invalidatePrefix('cab:');
  return { success: true };
}

module.exports = {
  getDashboardStats,
  listDrivers,
  updateDriverStatus,
  getDriverAnalytics,
  getDriverDetails,
  getVehicleDetails,
  getDocumentDetails,
  getRideDetails,
  requestDocumentReupload,
  cancelRide,
  getLiveFleet,
  listCustomers,
  getCustomerDetails,
  listRides,
  listSubscriptions,
  listSubscriptionHistory,
  listSubscriptionPlans,
  expireSubscription,
  listWallets,
  listWalletTransactions,
  listPendingVerifications,
  verifyDriverDocument,
  deleteDriverDocument,
  verifyVehicle,
  listVerificationHistory: listHistory,
  deleteVerificationHistory: softDeleteHistory,
  reverifyFromHistory,
  getReports,
  listAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
};
