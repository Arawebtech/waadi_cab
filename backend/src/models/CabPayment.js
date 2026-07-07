/**
 * models/Payment.js
 * ---------------------------------------------------------------------------
 * NEW MODEL — did not exist in the uploaded codebase. Required so that:
 *   - every Razorpay order we create has a durable server-side record
 *   - verifyAndFulfill() can atomically flip status created -> paid exactly
 *     once (prevents duplicate processing / double-crediting wallets or
 *     double-activating subscriptions)
 *   - dev-mode fake payments and real payments share one auditable trail
 *
 * Add this to your models/index.js barrel export alongside the existing
 * models, e.g.:
 *   module.exports = { ..., Payment: require('./Payment'), WalletTransaction: require('./WalletTransaction') };
 * ---------------------------------------------------------------------------
 */

const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    ownerType: { type: String, enum: ['Driver', 'Customer'], required: true },

    purpose: {
      type: String,
      enum: ['subscription', 'wallet_topup', 'cab_booking'],
      required: true,
      index: true,
    },

    amount: { type: Number, required: true, min: 1 }, // in rupees (not paise)
    currency: { type: String, default: 'INR' },

    // Lifecycle of the payment itself.
    status: {
      type: String,
      enum: ['created', 'paid', 'failed', 'refunded'],
      default: 'created',
      index: true,
    },

    // Lifecycle of what the payment is *for* (subscription activation,
    // wallet credit, etc). Kept separate from `status` because a payment
    // can succeed at the gateway but fail to fulfill downstream — that's a
    // distinct, critical failure mode that needs its own tracking so it can
    // be found and reconciled manually.
    fulfillmentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'not_applicable'],
      default: 'pending',
    },
    fulfillmentError: { type: String, default: null },

    paymentOrderId: { type: String, required: true, unique: true, index: true },
    paymentPaymentId: { type: String, index: true, default: null },
    paymentSignature: { type: String, default: null },

    isDevPayment: { type: Boolean, default: false },

    // Free-form context: planId for subscriptions, bookingId for booking
    // payments, etc.
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },

    failureReason: { type: String, default: null },
  },
  { timestamps: true }
);

paymentSchema.index({ ownerId: 1, purpose: 1, status: 1 });

module.exports = mongoose.model('CabPayment', paymentSchema);