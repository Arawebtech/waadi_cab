const mongoose = require('mongoose');

const cabOtpSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    role: { type: String, enum: ['customer', 'driver', 'admin'], default: 'customer' },
    purpose: { type: String, enum: ['register', 'login'], required: true },
    otpHash: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: true },
    attempts: { type: Number, default: 0 },
    isUsed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

cabOtpSchema.index({ email: 1, role: 1, purpose: 1, isUsed: 1 });

module.exports = mongoose.model('CabOtp', cabOtpSchema);
