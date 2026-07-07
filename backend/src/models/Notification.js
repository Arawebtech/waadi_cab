const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    accountId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    accountType: { type: String, enum: ['Customer', 'Driver'], required: true, index: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    type: { type: String, enum: ['booking', 'payment', 'promo', 'system', 'earning', 'subscription', 'kyc'], default: 'system' },
    data: { type: mongoose.Schema.Types.Mixed },
    isRead: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

notificationSchema.index({ accountId: 1, accountType: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
