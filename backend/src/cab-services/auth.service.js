const { Customer, User, Admin, RefreshToken, Vehicle, RiderDocument, DriverLocation } = require('../models');


const walletService = require('./wallet.service');
const auditService = require('./audit.service');
const subscriptionService = require('./subscription.service');
const bankDetailService = require('./bankDetail.service');

const DRIVER_ROLES = ['driver', 'rider'];

function normalizeRole(role) {
  if (DRIVER_ROLES.includes(role)) return 'driver';
  return role;
}

async function findAccount(email, role) {
  role = normalizeRole(role);
  if (role === 'customer') return Customer.findOne({ email: email.toLowerCase() });
  if (role === 'driver') return User.findOne({ email: email.toLowerCase() });
  if (role === 'admin') return Admin.findOne({ email: email.toLowerCase() });
  return null;
}

function sanitizeCustomer(c) {
  return {
    id: c._id,
    email: c.email,
    name: c.fullName,
    fullName: c.fullName,
    role: 'customer',
    phone: c.phone,
    avatar: c.profileImage?.secure_url,
    profileImage: c.profileImage,
    language: c.language,
    darkMode: c.darkMode,
    referralCode: c.referralCode,
    emergencyContacts: c.emergencyContacts,
    ridePreferences: c.ridePreferences,
    rating: c.rating,
    status: c.status,
  };
}

async function enrichRiderProfile(riderDoc) {
  const r = riderDoc.toObject ? riderDoc.toObject() : riderDoc;
  const driverId = r._id;

  const [subscription, driverLocation, vehicle, bank, kyc] = await Promise.all([
    subscriptionService.getSubscriptionSummary(driverId),
    DriverLocation.findOne({ driverId }).lean(),
    Vehicle.findOne({ userId: driverId, isActive: true }).lean(),
    bankDetailService.getByRiderId(driverId),
    kycService.getKycStatus(driverId),
  ]);

  const subActive = subscription.subscriptionStatus === 'active';
  const canGoOnline = r.status === 'active' && subActive;

  const profile = {
    id: driverId,
    email: r.email,
    name: r.fullName,
    fullName: r.fullName,
    role: 'driver',
    phone: r.phone,
    phoneSecondary: r.phoneSecondary,
    avatar: r.profilePhoto?.secure_url,
    profilePhoto: r.profilePhoto,
    verificationStatus: r.verificationStatus,
    rejectReason: r.rejectReason,
    subscriptionStatus: subscription.subscriptionStatus,
    subscriptionExpiryDate: subscription.subscriptionExpiryDate,
    activeSubscriptionId: subscription.activeSubscriptionId,
    currentPlan: subscription.currentPlan,
    isOnline: driverLocation?.isOnline ?? false,
    isAvailable: driverLocation?.isAvailable ?? false,
    rating: r.rating,
    totalRides: r.totalRides,
    totalEarnings: r.totalEarnings,
    termsAccepted: r.termsAccepted,
    status: r.status,
    city: r.city,
    emergencyContact: r.emergencyContact,
    canGoOnline,
    vehicle,
    bank,
    documentsUploaded: kyc.documents?.length ?? 0,
    profileCompletion: riderService.buildProfileCompletion(r, kyc, vehicle, bank, subscription),
  };

  return profile;
}

function sanitizeRider(r) {
  return {
    id: r._id || r.id,
    email: r.email,
    name: r.fullName || r.name,
    fullName: r.fullName,
    role: 'driver',
    phone: r.phone,
    verificationStatus: r.verificationStatus,
    subscriptionStatus: r.subscriptionStatus,
    canGoOnline: r.canGoOnline,
    isOnline: r.isOnline,
    isAvailable: r.isAvailable,
  };
}

function sanitizeAccount(account, role) {
  role = normalizeRole(role);
  if (role === 'customer') return sanitizeCustomer(account);
  if (role === 'rider') return sanitizeRider(account);
  return { id: account._id, email: account.email, name: account.name, role: 'admin', adminRole: account.role };
}



async function refreshSession(refreshToken, meta = {}) {
  let decoded;
  try {
    decoded = tokenService.verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError('Invalid refresh token', 401);
  }

  const stored = await RefreshToken.findOne({
    tokenHash: tokenService.hashToken(refreshToken),
    accountId: decoded.sub,
    isRevoked: false,
  });

  if (!stored || stored.expiresAt < new Date()) throw new AppError('Refresh token expired', 401);

  stored.isRevoked = true;
  await stored.save();

  if (stored.accountType === 'admin') {
    const admin = await Admin.findById(decoded.sub);
    if (!admin?.isActive) throw new AppError('Account not found', 404);
    return adminLoginResponse(admin, meta);
  }

  const account = await findAccount(decoded.email, stored.accountType);
  if (!account || account.status === 'suspended') throw new AppError('Account not found', 404);
  const tokens = await issueTokens(account, stored.accountType, meta);
  if (stored.accountType === 'rider') tokens.user = await enrichRiderProfile(account);
  return tokens;
}

async function adminLogin({ email, password, deviceId, deviceName, ipAddress, userAgent }) {
  const admin = await Admin.findOne({ email: email.toLowerCase(), isActive: true }).select('+password');
  if (!admin || !(await admin.comparePassword(password))) throw new AppError('Invalid credentials', 401);
  admin.lastLoginAt = new Date();
  await admin.save();
  return adminLoginResponse(admin, { deviceId, deviceName, ipAddress, userAgent });
}

async function adminLoginResponse(admin, meta = {}) {
  const payload = { sub: admin._id.toString(), role: 'admin', email: admin.email, accountType: 'admin', adminRole: admin.role };
  const accessToken = tokenService.signAccessToken(payload);
  const refreshToken = tokenService.signRefreshToken(payload);
  await RefreshToken.create({
    accountId: admin._id,
    accountType: 'admin',
    tokenHash: tokenService.hashToken(refreshToken),
    ...meta,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
  return {
    accessToken,
    refreshToken,
    user: { id: admin._id, email: admin.email, name: admin.name, role: 'admin', adminRole: admin.role },
    admin: { id: admin._id, email: admin.email, fullName: admin.name, role: admin.role },
  };
}

async function logout(refreshToken) {
  if (!refreshToken) return;
  await RefreshToken.updateOne({ tokenHash: tokenService.hashToken(refreshToken) }, { isRevoked: true });
}

async function logoutAllDevices(accountId) {
  await RefreshToken.updateMany({ accountId, isRevoked: false }, { isRevoked: true });
}

module.exports = {

  refreshSession,
  logout,
  logoutAllDevices,
  adminLogin,
  sanitizeCustomer,
  sanitizeRider,
  sanitizeAccount,
  enrichRiderProfile,
  findAccount,
  normalizeRole,
};
