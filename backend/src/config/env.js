/**
 * Shared environment config for cab-booking modules.
 * Border-tax routes do not depend on this file.
 */
module.exports = {
  port: Number(process.env.PORT) || 4001,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwt: {
    accessSecret: process.env.JWT_SECRET || 'dev-access-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
    accessExpires: process.env.JWT_ACCESS_EXPIRES || '7d',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES || '30d',
  },
  otp: {
    expiryMinutes: Number(process.env.OTP_EXPIRY_MINUTES) || 10,
    resendCooldownSeconds: Number(process.env.OTP_RESEND_COOLDOWN_SECONDS) || 60,
    maxAttempts: Number(process.env.OTP_MAX_ATTEMPTS) || 5,
  },
  fare: {
    nightStartHour: Number(process.env.FARE_NIGHT_START) || 22,
    nightEndHour: Number(process.env.FARE_NIGHT_END) || 6,
    nightMultiplier: Number(process.env.FARE_NIGHT_MULTIPLIER) || 1.25,
    surgePeakMultiplier: Number(process.env.FARE_SURGE_MULTIPLIER) || 1.3,
    waitingPerMin: Number(process.env.FARE_WAITING_PER_MIN) || 2,
  },
  google: {
    apiKey: process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
    maxFileSizeMb: Number(process.env.MAX_UPLOAD_MB) || 10,
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    otpMax: Number(process.env.OTP_RATE_LIMIT_MAX) || 10,
  },
  driverOfflineTimeoutMs: Number(process.env.DRIVER_OFFLINE_TIMEOUT_MS) || 120_000,
};
