const mongoose = require('mongoose');

const subscriptionHistorySchema = new mongoose.Schema(
  {
    // ==========================
    // DRIVER
    // ==========================
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    // ==========================
    // SUBSCRIPTION
    // ==========================
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subscription',
      index: true
    },

    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubscriptionPlan',
      required: true
    },

    planName: {
      type: String,
      required: true
    },

    // ==========================
    // ACTION
    // ==========================
    action: {
      type: String,
      enum: [
        'purchase',
        'renew',
        'expire',
        'cancel',
        'refund',
        'payment_failed',
        'suspend',
        'reactivate',
        'admin_update'
      ],
      required: true,
      index: true
    },

    // ==========================
    // AMOUNT
    // ==========================
    amount: {
      type: Number,
      default: 0
    },

    currency: {
      type: String,
      default: 'INR'
    },

    // ==========================
    // PAYMENT
    // ==========================
    transactionId: {
      type: String,
      index: true
    },

    paymentOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PaymentOrder'
    },

    paymentMethod: {
      type: String,
      enum: [
        'wallet',
        'upi',
        'card',
        'cashfree',
        'phonepe',
        'test'
      ]
    },

    gateway: {
      type: String
    },

    gatewayResponse: {
      type: mongoose.Schema.Types.Mixed
    },

    // ==========================
    // DATES
    // ==========================
    startDate: Date,

    expiryDate: Date,

    oldExpiryDate: Date,

    newExpiryDate: Date,

    // ==========================
    // WALLET
    // ==========================
    walletUsed: {
      type: Boolean,
      default: false
    },

    walletAmount: {
      type: Number,
      default: 0
    },

    // ==========================
    // DEVICE
    // ==========================
    deviceInfo: {
      platform: String,
      appVersion: String,
      deviceId: String
    },

    ipAddress: String,

    // ==========================
    // ADMIN
    // ==========================
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    },

    remarks: String,

    // ==========================
    // DELETE HISTORY
    // ==========================
    deleted: {
      type: Boolean,
      default: false,
      index: true
    },

    deletedAt: Date,

    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    }
  },
  {
    timestamps: true
  }
);

subscriptionHistorySchema.index({
  driverId: 1,
  createdAt: -1
});

subscriptionHistorySchema.index({
  action: 1
});

subscriptionHistorySchema.index({
  transactionId: 1
});

subscriptionHistorySchema.index({
  subscriptionId: 1
});

module.exports = mongoose.model(
  'SubscriptionHistory',
  subscriptionHistorySchema
);