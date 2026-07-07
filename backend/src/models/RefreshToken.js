const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema(
  {
    accountId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    accountType: { type: String, enum: ['customer', 'rider', 'admin'], required: true, index: true },
    tokenHash: { type: String, required: true, index: true },
    deviceId: { type: String, index: true },
    deviceName: { type: String },
    ipAddress: { type: String },
    userAgent: { type: String },
    expiresAt: { type: Date, required: true, index: true },
    isRevoked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
