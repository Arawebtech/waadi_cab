// const mongoose = require('mongoose');

// const subscriptionSchema = new mongoose.Schema(
//   {
//     driverId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'User',
//       required: true,
//       index: true
//     },

//     planId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'SubscriptionPlan',
//       required: true
//     },

//     paymentOrderId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'PaymentOrder',
//       default: null
//     },

//     planName: {
//       type: String,
//       required: true
//     },

//     durationDays: {
//       type: Number,
//       required: true
//     },

//     amount: {
//       type: Number,
//       required: true
//     },

//     gateway: {
//       type: String,
//       enum: ['payu', 'cashfree'],
//       default: null
//     },

//     subscriptionType: {
//       type: String,
//       enum: ['purchase', 'renewal'],
//       default: 'purchase'
//     },

//     startDate: {
//       type: Date,
//       default: null
//     },

//     expiryDate: {
//       type: Date,
//       default: null,
//       index: true
//     },

//     renewalCount: {
//       type: Number,
//       default: 0
//     },

//     lastRenewedAt: {
//       type: Date,
//       default: null
//     },

//     autoRenew: {
//       type: Boolean,
//       default: false
//     },

//     transactionId: {
//       type: String,
//       index: true
//     },

//     paymentStatus: {
//       type: String,
//       enum: [
//         'pending',
//         'paid',
//         'failed',
//         'refunded'
//       ],
//       default: 'pending',
//       index: true
//     },

//     status: {
//       type: String,
//       enum: [
//         'pending',
//         'active',
//         'expired',
//         'cancelled'
//       ],
//       default: 'pending',
//       index: true
//     },

//     cancelledAt: {
//       type: Date,
//       default: null
//     },

//     cancelledBy: {
//       type: mongoose.Schema.Types.ObjectId,
//       refPath: 'cancelledByModel',
//       default: null
//     },

//     cancelledByModel: {
//       type: String,
//       enum: ['User', 'Admin'],
//       default: null
//     },

//     remarks: {
//       type: String,
//       default: ''
//     },
//     source: {
//       type: String,
//       enum: ['web', 'app', 'admin'],
//       default: 'app'
//     },
//   },
//     {
//     timestamps: true
//   }
// );

// subscriptionSchema.index({
//   driverId: 1,
//   status: 1
// });

// subscriptionSchema.index({
//   expiryDate: 1
// });

// subscriptionSchema.index({
//   transactionId: 1
// });

// module.exports = mongoose.model(
//   'Subscription',
//   subscriptionSchema
// );




const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
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
    // PLAN
    // ==========================
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubscriptionPlan',
      required: true,
      index: true
    },

    planName: {
      type: String,
      required: true,
      trim: true
    },

    durationDays: {
      type: Number,
      required: true,
      min: 1
    },

    amount: {
      type: Number,
      required: true,
      min: 0
    },

    // ==========================
    // SUBSCRIPTION STATUS
    // ==========================
    status: {
      type: String,
      enum: {
        values: [
          'pending',
          'active',
          'scheduled',
          'expired',
          'cancelled',
          'suspended',
        ],
        message: 'Invalid subscription status',
      },
      default: 'pending',
      index: true,
    },

    paymentStatus: {
      type: String,
      enum: {
        values: ['pending', 'paid', 'failed', 'refunded'],
        message: 'Invalid payment status',
      },
      default: 'pending',
      index: true,
    },

    // ==========================
    // DATES
    // ==========================
    startDate: {
      type: Date,
      index: true
    },

    expiryDate: {
      type: Date,
      index: true
    },

    activatedAt: Date,

    expiredAt: Date,

    cancelledAt: Date,

    cancelReason: String,

    // ==========================
    // RENEWAL
    // ==========================
    renewalCount: {
      type: Number,
      default: 0
    },

    autoRenew: {
      type: Boolean,
      default: false
    },

    renewedFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subscription',
      default: null
    },

    lastRenewedAt: Date,

    renewalDate: Date,

    purchaseIntent: {
      type: String,
      enum: {
        values: ['purchase', 'renew', 'replace'],
        message: 'Invalid purchase intent',
      },
      default: 'purchase',
    },

    scheduledAfterSubscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subscription',
      default: null,
    },

    nextSubscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subscription',
      default: null,
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

    gateway: {
      type: String,
      enum: {
        values: ['wallet', 'phonepe', 'cashfree', 'razorpay', 'payu', 'test'],
        message: 'Invalid payment gateway',
      },
    },

    paymentMethod: {
      type: String,
      enum: {
        values: ['wallet', 'upi', 'card', 'netbanking', 'cashfree', 'phonepe'],
        message: 'Invalid payment method',
      },
    },

    paymentResponse: {
      type: mongoose.Schema.Types.Mixed
    },

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
    // DEVICE INFO
    // ==========================
    deviceInfo: {
      platform: String,
      appVersion: String,
      deviceId: String
    },

    // ==========================
    // ADMIN
    // ==========================
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    },

    notes: String,

    // ==========================
    // FLAGS
    // ==========================
    isTrial: {
      type: Boolean,
      default: false
    },

    isActive: {
      type: Boolean,
      default: true
    },

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

// ==========================
// INDEXES
// ==========================
subscriptionSchema.index({
  driverId: 1,
  status: 1
});

subscriptionSchema.index({
  expiryDate: 1
});

subscriptionSchema.index({
  transactionId: 1
});

subscriptionSchema.index({
  paymentOrderId: 1
});

subscriptionSchema.index({
  driverId: 1,
  expiryDate: -1
});

module.exports = mongoose.model(
  'Subscription',
  subscriptionSchema
);