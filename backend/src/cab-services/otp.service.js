const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const env = require('../config/env');
const { Otp } = require('../models');
const logger = require('../utils/logger');
const AppError = require('../utils/AppError');
const { otpEmailTemplate } = require('../utils/email.template');

let transporter;

const SMTP_PLACEHOLDER_MARKERS = [
  'your-app-password',
  'your-email',
  'changeme',
  'example.com',
  'placeholder',
  'mailto:',
];

function isProduction() {
  return env.nodeEnv === 'production';
}

function isSmtpConfigured() {
  const user = String(env.smtp.user || '').trim();
  const pass = String(env.smtp.pass || '').trim();
  if (!user || !pass) return false;

  const combined = `${user} ${pass}`.toLowerCase();
  return !SMTP_PLACEHOLDER_MARKERS.some((marker) => combined.includes(marker));
}

function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.port === 465,
    auth: { user: env.smtp.user, pass: env.smtp.pass },
  });
  return transporter;
}

function generateOtpCode() {
  return crypto.randomInt(100000, 999999).toString();
}

async function hashOtp(otp) {
  return bcrypt.hash(otp, 12);
}

async function compareOtp(otp, hash) {
  return bcrypt.compare(otp, hash);
}

function logDevOtp(email, otp, purpose) {
  logger.info('='.repeat(56));
  logger.info(`[DEV OTP] ${purpose.toUpperCase()} OTP for ${email}: ${otp}`);
  logger.info(`Expires in ${env.otp.expiryMinutes} minutes`);
  logger.info('='.repeat(56));
}

async function assertResendCooldown(email, role, purpose) {
  const last = await Otp.findOne({ email, role, purpose }).sort({ createdAt: -1 }).lean();
  if (!last?.createdAt) return;

  const cooldownMs = env.otp.resendCooldownSeconds * 1000;
  const elapsed = Date.now() - new Date(last.createdAt).getTime();
  if (elapsed < cooldownMs) {
    const retryAfterSeconds = Math.ceil((cooldownMs - elapsed) / 1000);
    throw new AppError(`Please wait ${retryAfterSeconds}s before requesting another OTP`, 429, {
      retryAfterSeconds,
    });
  }
}

async function deliverOtp(email, otp, purpose) {
  if (!isProduction()) {
    logDevOtp(email, otp, purpose);
    return { delivery: 'console', devMode: true };
  }

  if (!isSmtpConfigured()) {
    logger.error('SMTP not configured in production');
    throw new AppError('Email service is not configured. Please contact support.', 503);
  }

  const subject =
    purpose === 'register' ? 'Verify your Cab Booking account' : 'Your Cab Booking login code';
  const html = otpEmailTemplate({ otp, purpose, expiryMinutes: env.otp.expiryMinutes });

  try {
    await getTransporter().sendMail({
      from: env.smtp.from,
      to: email,
      subject,
      html,
    });
    logger.info('OTP email sent', { email, purpose });
    return { delivery: 'email', devMode: false };
  } catch (err) {
    logger.error('OTP email send failed', { email, purpose, message: err.message });
    throw new AppError('Unable to send OTP email. Please try again later.', 503);
  }
}

function sanitizeOtpResponse(data) {
  const payload = {
    expiresAt: data.expiresAt,
    expiresInMinutes: data.expiresInMinutes,
    resendCooldownSeconds: env.otp.resendCooldownSeconds,
    delivery: data.delivery,
    devMode: data.devMode ?? false,
  };

  if (data.retryAfterSeconds) {
    payload.retryAfterSeconds = data.retryAfterSeconds;
  }

  return payload;
}

async function createOtp({ email, role, purpose }) {
  const normalizedEmail = String(email).toLowerCase().trim();

  await assertResendCooldown(normalizedEmail, role, purpose);

  await Otp.deleteMany({ email: normalizedEmail, role, purpose, isUsed: false });

  const otp = generateOtpCode();
  const otpHash = await hashOtp(otp);
  const expiresAt = new Date(Date.now() + env.otp.expiryMinutes * 60 * 1000);

  await Otp.create({
    email: normalizedEmail,
    role,
    purpose,
    otpHash,
    expiresAt,
  });

  const delivery = await deliverOtp(normalizedEmail, otp, purpose);

  return {
    expiresAt,
    expiresInMinutes: env.otp.expiryMinutes,
    ...delivery,
  };
}

async function verifyOtpRecord({ email, role, purpose, otp }) {
  const normalizedEmail = String(email).toLowerCase().trim();
  const record = await Otp.findOne({
    email: normalizedEmail,
    role,
    purpose,
    isUsed: false,
  }).sort({ createdAt: -1 });

  if (!record) throw new AppError('OTP not found or expired. Request a new code.', 400);
  if (record.expiresAt < new Date()) throw new AppError('OTP expired. Request a new code.', 400);
  if (record.attempts >= env.otp.maxAttempts) {
    throw new AppError('Too many incorrect attempts. Request a new OTP.', 429);
  }

  const valid = await compareOtp(String(otp).trim(), record.otpHash);
  record.attempts += 1;
  await record.save();

  if (!valid) {
    const remaining = env.otp.maxAttempts - record.attempts;
    throw new AppError(
      remaining > 0
        ? `Invalid OTP. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
        : 'Invalid OTP. Request a new code.',
      400
    );
  }

  record.isUsed = true;
  await record.save();
  return true;
}

module.exports = {
  createOtp,
  verifyOtpRecord,
  sanitizeOtpResponse,
  isSmtpConfigured,
  isProduction,
  generateOtpCode,
};
