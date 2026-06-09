const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  id: {
    type: String,
    unique: true,
    index: true
  },
  txn_id: {
    type: String,
    unique: true,
    required: [true, 'Transaction ID is required'],
    index: true
  },
  payu_payment_id: {
    type: String,
    index: true
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount must be positive']
  },
  status: {
    type: String,
    enum: ['pending', 'success', 'failure'],
    default: 'pending',
    index: true
  },
  payment_method: {
    type: String,
    default: 'payu'
  },
  bank_ref_number: {
    type: String
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  },
  payment_data: {
    productinfo: String,
    firstname: String,
    email: String,
    phone: String,
    udf1: String,
    udf2: String,
    udf3: String,
    udf4: String,
    udf5: String
  },
  response_data: {
    type: mongoose.Schema.Types.Mixed
  },
  failure_reason: String,
  hash: String,
  verified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Generate auto fields before saving
paymentSchema.pre('save', function(next) {
  try {
    // Generate unique payment ID if not exists
    if (!this.id) {
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substring(2, 8);
      this.id = `PAY_${timestamp}${random}`.toUpperCase();
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Indexes for better query performance
paymentSchema.index({ txn_id: 1 }, { unique: true });
paymentSchema.index({ status: 1 });
paymentSchema.index({ user: 1, status: 1 });
paymentSchema.index({ payu_payment_id: 1 });
paymentSchema.index({ createdAt: -1 });

// Static method to find payment by transaction ID
paymentSchema.statics.findByTxnId = function(txnId) {
  return this.findOne({ txn_id: txnId });
};

// Instance method to mark payment as verified
paymentSchema.methods.markAsVerified = function() {
  this.verified = true;
  this.status = 'success';
  return this.save();
};

// Instance method to mark payment as failed
paymentSchema.methods.markAsFailed = function(reason = null) {
  this.status = 'failure';
  if (reason) {
    this.failure_reason = reason;
  }
  return this.save();
};

// Instance method to get payment summary
paymentSchema.methods.getSummary = function() {
  return {
    id: this.id,
    txnId: this.txn_id,
    payuPaymentId: this.payu_payment_id,
    amount: this.amount,
    status: this.status,
    paymentMethod: this.payment_method,
    verified: this.verified,
    createdAt: this.createdAt
  };
};

module.exports = mongoose.model('Payment', paymentSchema);