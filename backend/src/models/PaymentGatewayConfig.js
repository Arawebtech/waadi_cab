const mongoose = require('mongoose');


const paymentGatewayConfigSchema = new mongoose.Schema(
  {
    // ─── Active Gateway ────────────────────────────────────────────────────────
    activeGateway: {
      type: String,
      enum: ['payu', 'cashfree'],
      default: 'payu',
      required: true,
    },

    // ─── PayU Configuration ───────────────────────────────────────────────────
    payu: {
      enabled: { type: Boolean, default: true },
      environment: { type: String, enum: ['sandbox', 'production'], default: 'production' },
      // Keys stored here are OPTIONAL overrides – if blank, server falls back to .env vars
      merchantKey: { type: String, default: '' },
      merchantSalt: { type: String, default: '' },
      successUrl: { type: String, default: '' },
      failureUrl: { type: String, default: '' },
    },

    // ─── Cashfree Configuration ───────────────────────────────────────────────
    cashfree: {
      enabled: { type: Boolean, default: false },
      environment: { type: String, enum: ['sandbox', 'production'], default: 'sandbox' },
      appId: { type: String, default: '' },
      secretKey: { type: String, default: '' },
      // Webhook secret for signature verification
      webhookSecret: { type: String, default: '' },
    },

    // ─── Meta ─────────────────────────────────────────────────────────────────
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default:null
    },
  },
  { timestamps: true }
);

// ─── Statics ──────────────────────────────────────────────────────────────────

/**
 * Get the singleton config document (creates one with defaults if absent).
 */
paymentGatewayConfigSchema.statics.getConfig = async function () {
  let config = await this.findOne();
  if (!config) {
    config = await this.create({});
  }
  return config;
};
/**
 * Switch the active gateway atomically.
 * @param {'payu'|'cashfree'} gateway
 * @param {mongoose.Types.ObjectId} adminUserId
 */
// paymentGatewayConfigSchema.statics.switchGateway = async function (gateway, adminUserId) {
//   return this.findOneAndUpdate(
//     {},
//     { activeGateway: gateway, updatedBy: adminUserId },
//     { upsert: true, new: true, setDefaultsOnInsert: true }
//   );
// };
paymentGatewayConfigSchema.statics.switchGateway = async function (
  gateway,
  adminUserId = null
) {
  return this.findOneAndUpdate(
    {},
    {
      activeGateway: gateway,
      "payu.enabled": gateway === "payu",
      "cashfree.enabled": gateway === "cashfree",
      updatedBy: adminUserId,
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  );
};

module.exports = mongoose.model('PaymentGatewayConfig', paymentGatewayConfigSchema);
