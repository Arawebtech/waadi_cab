const mongoose = require('mongoose');

const paymentOrderSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true, index: true },
    paymentOrderId: { type: String, index: true },
    paymentId: { type: String, sparse: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    ownerType: { type: String, enum: ['Customer', 'Driver'], required: true },
    purpose: {
      type: String,
      enum: ['wallet_topup', 'subscription', 'booking', 'ride_payment'],
      required: true,
    },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    status: { type: String, enum: ['created', 'paid', 'failed', 'expired'], default: 'created', index: true },
    metadata: { type: mongoose.Schema.Types.Mixed },
    subscriptionId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Subscription',
  index: true
}
  },
  { timestamps: true }
);

module.exports = mongoose.model('PaymentOrder', paymentOrderSchema);
