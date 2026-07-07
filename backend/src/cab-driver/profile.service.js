const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const DriverLocation = require('../models/DriverLocation');
const Subscription = require('../models/Subscription');

const VEHICLE_DOC_TYPES = ['rc', 'aadhaar', 'pan', 'insurance', 'puc', 'license'];
const PROFILE_FIELDS = ['firstName', 'lastName', 'email', 'phoneNumber'];

function mapVerificationStatus(raw) {
  const map = {
    draft: 'pending',
    pending: 'pending',
    under_review: 'under_review',
    approved: 'approved',
    rejected: 'rejected',
  };
  return map[raw] || 'pending';
}

async function getActiveSubscription(driverId) {
  const now = new Date();
  return Subscription.findOne({
    driverId,
    status: 'active',
    expiryDate: { $gt: now },
    deleted: { $ne: true },
    $or: [{ paymentStatus: 'paid' }, { paymentStatus: { $exists: false } }, { paymentStatus: null }],
  })
    .populate('planId')
    .sort({ expiryDate: -1 })
    .lean();
}

function summarizeVehicleDocuments(vehicle) {
  if (!vehicle?.documents) {
    return { items: [], overall: 'not_uploaded', hasPending: false, allRequiredUploaded: false };
  }
  const items = VEHICLE_DOC_TYPES.map((docType) => {
    const doc = vehicle.documents[docType] || {};
    return {
      docType,
      status: doc.status || 'not_uploaded',
      url: doc.url || null,
      rejectionReason: doc.rejectionReason || null,
      uploadedAt: doc.uploadedAt || null,
    };
  });
  const uploaded = items.filter((i) => i.status !== 'not_uploaded');
  const anyRejected = items.some((i) => i.status === 'rejected');
  const anyPending = items.some((i) => i.status === 'pending');
  const allApproved = uploaded.length > 0 && uploaded.every((i) => i.status === 'approved');
  let overall = 'not_uploaded';
  if (allApproved) overall = 'approved';
  else if (anyRejected) overall = 'rejected';
  else if (anyPending) overall = 'pending';
  else if (uploaded.length > 0) overall = 'under_review';
  return {
    items,
    overall,
    hasPending: anyPending,
    allRequiredUploaded: uploaded.length >= 1,
  };
}

async function getDriverProfile(userId) {
  const user = await User.findById(userId).lean();
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  const [vehicles, subscription, location] = await Promise.all([
    Vehicle.find({ userId, isActive: true }).sort({ isDefault: -1, updatedAt: -1 }).lean(),
    getActiveSubscription(userId),
    DriverLocation.findOne({ driverId: userId }).lean(),
  ]);

  const activeVehicle =
    vehicles.find((v) => v._id.toString() === user.cabBooking?.activeVehicleId?.toString()) ||
    vehicles.find((v) => v.isDefault) ||
    vehicles[0] ||
    null;

  return {
    user: {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      email: user.email,
      userType: user.userType,
      isPhoneVerified: user.isPhoneVerified,
      isVerified: user.isVerified,
      isActive: user.isActive,
      profile: user.profile,
      cabBooking: user.cabBooking || {},
    },
    vehicles,
    subscription,
    location,
    activeVehicle,
    vehicleDocuments: activeVehicle ? summarizeVehicleDocuments(activeVehicle).items : [],
  };
}

function isProfileComplete(user) {
  return PROFILE_FIELDS.every((f) => Boolean(user[f]?.toString().trim()));
}

async function getVerificationSummary(userId) {
  const profile = await getDriverProfile(userId);
  const { user, vehicles, subscription, activeVehicle } = profile;

  const profileComplete = isProfileComplete(user);
  const profileStatus = user.cabBooking?.profileVerificationStatus || 'pending';

  const vehicleStatus = activeVehicle
    ? mapVerificationStatus(activeVehicle.verificationStatus)
    : 'pending';

  const vehicleDocs = summarizeVehicleDocuments(activeVehicle);
  const subscriptionActive = Boolean(subscription);

  const checks = {
    profile: {
      status: profileComplete
        ? profileStatus === 'approved'
          ? 'approved'
          : profileStatus
        : 'pending',
      complete: profileComplete,
    },
    vehicle: {
      status: vehicleStatus,
      complete: Boolean(activeVehicle),
      vehicleId: activeVehicle?._id || null,
      vehicleNumber: activeVehicle?.vehicleNumber || null,
    },
    vehicleDocuments: {
      status: vehicleDocs.overall,
      complete: vehicleDocs.allRequiredUploaded,
      items: vehicleDocs.items,
    },
    subscription: {
      status: subscriptionActive ? 'approved' : 'pending',
      complete: subscriptionActive,
      expiryDate: subscription?.expiryDate || null,
    },
  };

  const stepChecks = [checks.profile, checks.vehicle, checks.subscription];
  const approvedCount = stepChecks.filter((c) => c.status === 'approved').length;
  const percent = Math.round((approvedCount / stepChecks.length) * 100);

  // Online eligibility: profile approved + active vehicle + active subscription + account active
  const canGoOnline =
    user.isActive !== false &&
    profileComplete &&
    user.cabBooking?.profileVerificationStatus === 'approved' &&
    Boolean(activeVehicle) &&
    subscriptionActive;

  const blockReasons = [];
  if (user.isActive === false) blockReasons.push('Account is inactive');
  if (!profileComplete) blockReasons.push('Complete your profile');
  if (user.cabBooking?.profileVerificationStatus !== 'approved') {
    blockReasons.push('Profile verification pending');
  }
  if (!activeVehicle) blockReasons.push('Add a vehicle');
  if (!subscriptionActive) blockReasons.push('Purchase an active subscription');

  return {
    checks,
    percent,
    canGoOnline,
    blockReasons,
    registrationStep: Math.min(4, user.cabBooking?.registrationStep || 1),
  };
}

async function updateDriverDetails(userId, payload) {
  const allowed = ['firstName', 'lastName', 'email'];
  const update = {};
  for (const key of allowed) {
    if (payload[key] !== undefined) update[key] = payload[key];
  }
  if (payload.emergencyContact && typeof payload.emergencyContact === 'object') {
    update['profile.emergencyContact'] = payload.emergencyContact;
  }
  if (payload.address && typeof payload.address === 'object') {
    update['profile.address'] = payload.address;
  }

  const user = await User.findByIdAndUpdate(userId, { $set: update }, { new: true, runValidators: true });
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  if (isProfileComplete(user) && user.cabBooking?.profileVerificationStatus === 'pending') {
    user.cabBooking.profileVerificationStatus = 'under_review';
    await user.save();
  }

  return getDriverProfile(userId);
}

async function setRegistrationStep(userId, step) {
  const n = Math.min(4, Math.max(1, Number(step) || 1));
  await User.findByIdAndUpdate(userId, { $set: { 'cabBooking.registrationStep': n } });
  return n;
}

async function setActiveVehicle(userId, vehicleId) {
  const vehicle = await Vehicle.findOne({ _id: vehicleId, userId, isActive: true });
  if (!vehicle) {
    const err = new Error('Vehicle not found');
    err.statusCode = 404;
    throw err;
  }
  await Vehicle.updateMany({ userId }, { isDefault: false });
  vehicle.isDefault = true;
  await vehicle.save();
  await User.findByIdAndUpdate(userId, {
    $set: { 'cabBooking.activeVehicleId': vehicle._id },
  });
  return vehicle;
}

async function submitForVerification(userId) {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  if (!isProfileComplete(user)) {
    const err = new Error('Complete profile before submitting');
    err.statusCode = 422;
    throw err;
  }

  user.cabBooking = user.cabBooking || {};
  user.cabBooking.profileVerificationStatus = 'under_review';
  await user.save();

  if (process.env.CAB_DEV_AUTO_APPROVE === 'true') {
    user.cabBooking.profileVerificationStatus = 'approved';
    await user.save();
    await Vehicle.updateMany(
      { userId, verificationStatus: { $in: ['pending', 'under_review', 'draft'] } },
      { $set: { verificationStatus: 'approved', verifiedAt: new Date() } }
    );
  }

  return getVerificationSummary(userId);
}

module.exports = {
  getDriverProfile,
  getVerificationSummary,
  updateDriverDetails,
  setRegistrationStep,
  setActiveVehicle,
  getActiveSubscription,
  isProfileComplete,
  summarizeVehicleDocuments,
  submitForVerification,
  VEHICLE_DOC_TYPES,
};
