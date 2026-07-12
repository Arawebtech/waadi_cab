const mongoose = require('mongoose');

/**
 * Idempotent payment event log — webhook, API verify, reconciliation, redirect.
 */
const paymentEventSchema = new mongoose.Schema(
  {
    order_id: { type: String, required: true, index: true },
    booking_id: { type: String, index: true },
    event_key: { type: String, required: true, unique: true, index: true },
    source: {
      type: String,
      enum: ['webhook', 'api-verify', 'reconciliation', 'redirect', 'status-poll', 'failure-callback'],
      required: true,
    },
    event_type: { type: String },
    status: {
      type: String,
      enum: ['processed', 'skipped', 'failed', 'duplicate'],
      default: 'processed',
    },
    gateway_status: { type: String },
    payment_status: { type: String },
    payload: { type: mongoose.Schema.Types.Mixed },
    result: { type: mongoose.Schema.Types.Mixed },
    error: { type: String },
  },
  { timestamps: true }
);

paymentEventSchema.index({ order_id: 1, createdAt: -1 });

module.exports = mongoose.model('PaymentEvent', paymentEventSchema);
