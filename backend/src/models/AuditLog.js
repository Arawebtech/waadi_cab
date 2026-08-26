// const mongoose = require('mongoose');

// const AUDIT_EVENT_TYPES = [
//   // Auth
//   'USER_LOGIN',
//   'USER_LOGOUT',
//   // Product / booking selection
//   'PRODUCT_SELECTED',
//   'VALIDATION_SUCCESS',
//   'VALIDATION_FAILED',
//   // Booking
//   'BOOKING_CREATED',
//   'BOOKING_UPDATED',
//   'BOOKING_COMPLETED',
//   'BOOKING_CANCELLED',
//   'BOOKING_APPROVED',
//   'BOOKING_REJECTED',
//   'BOOKING_CONFIRMED',
//   // Checkout
//   'CHECKOUT_OPENED',
//   'CHECKOUT_SUBMITTED',
//   'CHECKOUT_PAY_CLICKED',
//   // Payment
//   'PAYMENT_INITIATED',
//   'PAYMENT_REDIRECT_PAYU',
//   'PAYMENT_SUCCESS',
//   'PAYMENT_FAILED',
//   'PAYMENT_PENDING',
//   'PAYMENT_VERIFIED',
//   'PAYMENT_DUPLICATE_DETECTED',
//   'PAYMENT_RECONCILIATION',
// ];

// const auditLogSchema = new mongoose.Schema(
//   {
//     eventType: {
//       type: String,
//       required: true,
//       enum: AUDIT_EVENT_TYPES,
//       index: true,
//     },
//     requestId: { type: String, index: true },
//     bookingId: { type: String, index: true },
//     bookingObjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', index: true },
//     userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
//     transactionId: { type: String, index: true },
//     previousState: { type: String },
//     newState: { type: String },
//     gateway: { type: String },
//     source: { type: String, default: 'backend' },
//     sourceFile: { type: String },
//     sourceFunction: { type: String },
//     metadata: { type: mongoose.Schema.Types.Mixed },
//     ip: { type: String },
//     userAgent: { type: String },
//   },
//   { timestamps: true }
// );

// auditLogSchema.index({ bookingId: 1, createdAt: -1 });
// auditLogSchema.index({ transactionId: 1, createdAt: -1 });
// auditLogSchema.index({ userId: 1, createdAt: -1 });
// auditLogSchema.index({ requestId: 1, createdAt: -1 });

// module.exports = mongoose.model('AuditLog', auditLogSchema);
// module.exports.AUDIT_EVENT_TYPES = AUDIT_EVENT_TYPES;


const mongoose = require('mongoose');

const AUDIT_EVENT_TYPES = [
  // Auth
  'USER_LOGIN',
  'USER_LOGOUT',

  // Product / booking selection
  'PRODUCT_SELECTED',
  'VALIDATION_SUCCESS',
  'VALIDATION_FAILED',

  // Booking
  'BOOKING_CREATED',
  'BOOKING_UPDATED',
  'BOOKING_COMPLETED',
  'BOOKING_CANCELLED',
  'BOOKING_APPROVED',
  'BOOKING_REJECTED',
  'BOOKING_CONFIRMED',

  // Checkout
  'CHECKOUT_OPENED',
  'CHECKOUT_SUBMITTED',
  'CHECKOUT_PAY_CLICKED',

  // Payment
  'PAYMENT_INITIATED',
  'PAYMENT_REDIRECT_PAYU',
  'PAYMENT_SUCCESS',
  'PAYMENT_FAILED',
  'PAYMENT_PENDING',
  'PAYMENT_VERIFIED',
  'PAYMENT_DUPLICATE_DETECTED',
  'PAYMENT_RECONCILIATION',
];

const auditLogSchema = new mongoose.Schema(
  {
    eventType: {
      type: String,
      required: true,
      enum: AUDIT_EVENT_TYPES,
      index: true,
    },

    requestId: {
      type: String,
      index: true,
    },

    bookingId: {
      type: String,
      index: true,
    },

    bookingObjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },

    transactionId: {
      type: String,
      index: true,
    },

    previousState: {
      type: String,
    },

    newState: {
      type: String,
    },

    gateway: {
      type: String,
    },

    source: {
      type: String,
      default: 'backend',
    },

    sourceFile: {
      type: String,
    },

    sourceFunction: {
      type: String,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },

    ip: {
      type: String,
    },

    userAgent: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// ============================================================
// QUERY PERFORMANCE INDEXES
// ============================================================

auditLogSchema.index({
  bookingId: 1,
  createdAt: -1,
});

auditLogSchema.index({
  transactionId: 1,
  createdAt: -1,
});

auditLogSchema.index({
  userId: 1,
  createdAt: -1,
});

auditLogSchema.index({
  requestId: 1,
  createdAt: -1,
});

// ============================================================
// AUTO DELETE AUDIT LOGS AFTER 5 DAYS
// ============================================================

auditLogSchema.index(
  { createdAt: 1 },
  {
    expireAfterSeconds: 60 * 60 * 24 * 8,
  }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);

module.exports.AUDIT_EVENT_TYPES = AUDIT_EVENT_TYPES;