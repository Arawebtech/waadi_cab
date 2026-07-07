const mongoose = require('mongoose');

const subscriptionPlanSchema = new mongoose.Schema(
  {
    // ==========================
    // BASIC
    // ==========================
    name: {
      type: String,
      required: [true, 'Plan name is required'],
      trim: true,
      index: true,
      minLength: [2, 'Plan name must be at least 2 characters'],
      maxLength: [100, 'Plan name cannot exceed 100 characters'],
    },

    slug: {
      type: String,
      required: [true, 'Plan slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    description: {
      type: String,
      default: ''
    },

    // ==========================
    // PRICING
    // ==========================
    amount: {
      type: Number,
      required: [true, 'Plan amount is required'],
      min: [0, 'Amount must be zero or greater'],
    },

    currency: {
      type: String,
      default: 'INR'
    },

    durationDays: {
      type: Number,
      required: [true, 'Duration is required'],
      min: [1, 'Duration must be at least 1 day'],
    },

    // ==========================
    // DISPLAY
    // ==========================
    badge: {
      type: String,
      default: null
    },

    color: {
      type: String,
      default: '#000000'
    },

    sortOrder: {
      type: Number,
      default: 0
    },

    features: [
      {
        type: String,
        trim: true
      }
    ],

    // ==========================
    // LIMITS
    // ==========================
    bookingLimitPerDay: {
      type: Number,
      default: -1 // unlimited
    },

    prioritySupport: {
      type: Boolean,
      default: false
    },

    instantApproval: {
      type: Boolean,
      default: false
    },

    commissionDiscount: {
      type: Number,
      default: 0
    },

    // ==========================
    // STATS
    // ==========================
    purchaseCount: {
      type: Number,
      default: 0
    },

    renewalCount: {
      type: Number,
      default: 0
    },

    totalRevenue: {
      type: Number,
      default: 0
    },

    // ==========================
    // STATUS
    // ==========================
    isPopular: {
      type: Boolean,
      default: false
    },

    isRecommended: {
      type: Boolean,
      default: false
    },

    isTrial: {
      type: Boolean,
      default: false
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true
    },

    activatedAt: Date,

    deactivatedAt: Date,

    // ==========================
    // SOFT DELETE
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
    },

    // ==========================
    // ADMIN
    // ==========================
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    }
  },
  {
    timestamps: true
  }
);

subscriptionPlanSchema.index({
  isActive: 1,
  deleted: 1
});

subscriptionPlanSchema.index({
  sortOrder: 1
});

module.exports = mongoose.model(
  'SubscriptionPlan',
  subscriptionPlanSchema
);