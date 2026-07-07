const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const Customer = require('../models/Customer');
const RefreshToken = require('../models/RefreshToken');
const CabOtp = require('../models/CabOtp');
const JWTUtils = require('../utils/jwt');
const env = require('../config/env');
const logger = require('../utils/logger');

const REFRESH_MS = 30 * 24 * 60 * 60 * 1000;

function sanitizeCustomer(c) {
  return {
    id: c._id,
    email: c.email,
    name: c.fullName,
    fullName: c.fullName,
    role: 'customer',
    phone: c.phone,
    avatar: c.profileImage?.secure_url,
    language: c.language,
    darkMode: c.darkMode,
    referralCode: c.referralCode,
    status: c.status,
  };
}

async function issueTokens(customer, meta = {}) {
  const payload = {
    userId: customer._id.toString(),
    role: 'customer',
    userType: 'customer',
    email: customer.email,
  };
  const accessToken = JWTUtils.generateAccessToken(payload);
  const refreshToken = JWTUtils.generateRefreshToken(payload);
  await RefreshToken.create({
    accountId: customer._id,
    accountType: 'customer',
    tokenHash: crypto.createHash('sha256').update(refreshToken).digest('hex'),
    expiresAt: new Date(Date.now() + REFRESH_MS),
    ...meta,
  });
  return { accessToken, refreshToken, user: sanitizeCustomer(customer) };
}

function logDevOtp(email, otp, purpose) {
  logger.info('='.repeat(56));
  logger.info(`[DEV OTP] ${purpose.toUpperCase()} for ${email}: ${otp}`);
  logger.info(`Expires in ${env.otp.expiryMinutes} minutes`);
  logger.info('='.repeat(56));
}

async function assertResendCooldown(email, purpose) {
  const last = await CabOtp.findOne({ email, role: 'customer', purpose })
    .sort({ createdAt: -1 })
    .lean();
  if (!last?.createdAt) return;
  const cooldownMs = env.otp.resendCooldownSeconds * 1000;
  const elapsed = Date.now() - new Date(last.createdAt).getTime();
  if (elapsed < cooldownMs) {
    const retryAfterSeconds = Math.ceil((cooldownMs - elapsed) / 1000);
    const err = new Error(`Please wait ${retryAfterSeconds}s before requesting another OTP`);
    err.statusCode = 429;
    err.retryAfterSeconds = retryAfterSeconds;
    throw err;
  }
}

async function createOtp(email, purpose) {
  const normalizedEmail = String(email).toLowerCase().trim();
  await assertResendCooldown(normalizedEmail, purpose);
  await CabOtp.deleteMany({ email: normalizedEmail, role: 'customer', purpose, isUsed: false });

  const otp = crypto.randomInt(100000, 999999).toString();
  const otpHash = await bcrypt.hash(otp, 12);
  const expiresAt = new Date(Date.now() + env.otp.expiryMinutes * 60 * 1000);

  await CabOtp.create({
    email: normalizedEmail,
    role: 'customer',
    purpose,
    otpHash,
    expiresAt,
  });

  logDevOtp(normalizedEmail, otp, purpose);

  return {
    expiresAt,
    expiresInMinutes: env.otp.expiryMinutes,
    resendCooldownSeconds: env.otp.resendCooldownSeconds,
    delivery: 'console',
    devMode: env.nodeEnv !== 'production',
  };
}

async function verifyOtp(email, purpose, otp) {
  const normalizedEmail = String(email).toLowerCase().trim();
  const record = await CabOtp.findOne({
    email: normalizedEmail,
    role: 'customer',
    purpose,
    isUsed: false,
  }).sort({ createdAt: -1 });

  if (!record) {
    const err = new Error('OTP not found or expired. Request a new code.');
    err.statusCode = 400;
    throw err;
  }
  if (record.expiresAt < new Date()) {
    const err = new Error('OTP expired. Request a new code.');
    err.statusCode = 400;
    throw err;
  }
  if (record.attempts >= env.otp.maxAttempts) {
    const err = new Error('Too many incorrect attempts. Request a new OTP.');
    err.statusCode = 429;
    throw err;
  }

  const valid = await bcrypt.compare(String(otp).trim(), record.otpHash);
  record.attempts += 1;
  await record.save();

  if (!valid) {
    const remaining = env.otp.maxAttempts - record.attempts;
    const err = new Error(
      remaining > 0
        ? `Invalid OTP. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
        : 'Invalid OTP. Request a new code.'
    );
    err.statusCode = 400;
    throw err;
  }

  record.isUsed = true;
  await record.save();
  return true;
}

async function requestOtp({ email, purpose }) {
  const normalizedEmail = String(email).toLowerCase().trim();
  const existing = await Customer.findOne({ email: normalizedEmail });

  if (purpose === 'register' && existing) {
    const err = new Error('Account already exists. Please login.');
    err.statusCode = 409;
    throw err;
  }
  if (purpose === 'login' && !existing) {
    const err = new Error('No account found. Please register first.');
    err.statusCode = 404;
    throw err;
  }

  return createOtp(normalizedEmail, purpose);
}

async function registerWithOtp({ email, name, otp, phone, ipAddress, userAgent }) {
  const normalizedEmail = String(email).toLowerCase().trim();
  await verifyOtp(normalizedEmail, 'register', otp);

  const existing = await Customer.findOne({ email: normalizedEmail });
  if (existing) {
    const err = new Error('Account already exists');
    err.statusCode = 409;
    throw err;
  }

  const customer = await Customer.create({
    email: normalizedEmail,
    fullName: name || 'Rider',
    phone: phone || undefined,
    lastLoginAt: new Date(),
  });

  return issueTokens(customer, { ipAddress, userAgent });
}

async function loginWithOtp({ email, otp, ipAddress, userAgent }) {
  const normalizedEmail = String(email).toLowerCase().trim();
  await verifyOtp(normalizedEmail, 'login', otp);

  const customer = await Customer.findOne({ email: normalizedEmail, status: 'active' });
  if (!customer) {
    const err = new Error('Account not found or suspended');
    err.statusCode = 404;
    throw err;
  }

  customer.lastLoginAt = new Date();
  await customer.save();
  return issueTokens(customer, { ipAddress, userAgent });
}

async function refreshSession(refreshToken, meta = {}) {
  let decoded;
  try {
    decoded = JWTUtils.verifyRefreshToken(refreshToken);
  } catch {
    const err = new Error('Invalid refresh token');
    err.statusCode = 401;
    throw err;
  }

  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const stored = await RefreshToken.findOne({
    tokenHash,
    accountType: 'customer',
    isRevoked: false,
  });

  if (!stored || stored.expiresAt < new Date()) {
    const err = new Error('Refresh token expired');
    err.statusCode = 401;
    throw err;
  }

  stored.isRevoked = true;
  await stored.save();

  const customer = await Customer.findById(stored.accountId);
  if (!customer || customer.status === 'suspended') {
    const err = new Error('Account not found');
    err.statusCode = 404;
    throw err;
  }

  return issueTokens(customer, meta);
}

async function logout(refreshToken) {
  if (!refreshToken) return;
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  await RefreshToken.updateOne({ tokenHash }, { isRevoked: true });
}

module.exports = {
  requestOtp,
  registerWithOtp,
  loginWithOtp,
  refreshSession,
  logout,
  sanitizeCustomer,
  issueTokens,
};
