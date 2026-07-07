const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    ownerType: { type: String, enum: ['Customer', 'Driver'], required: true, index: true },
    balance: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'INR' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

walletSchema.index({ ownerId: 1, ownerType: 1 }, { unique: true });

module.exports = mongoose.model('Wallet', walletSchema);
