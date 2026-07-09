const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  bookingId: {
    type: String,
    unique: true,
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  visiting_state: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'State',
    required: [true, 'Visiting state is required']
  },
  vehicle_number: {
    type: String,
    required: [true, 'Vehicle number is required'],
    trim: true,
    uppercase: true
  },
  seat_capacity: {
    type: String,
    required: [true, 'Seat capacity is required'],
    trim: true
  },
  whatsapp_number: {
    type: String,
    required: [true, 'WhatsApp number is required'],
    trim: true
  },
  entry_border: {
    type: String,
    required: [true, 'Entry border is required'],
    trim: true
  },
  tax_mode: {
    type: String,
    required: [true, 'Tax mode is required'],
    enum: ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly', 'Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7', 'Day 8', 'Day 9', 'Day 10', 'Day 11', 'Day 12', 'Day 13', 'Day 14', 'Day 15', 'Day 16', 'Day 17', 'Day 18', 'Day 19', 'Day 20'],
    trim: true
  },
  tax_from_date: {
    type: Date,
    required: [true, 'Tax from date is required']
  },
  tax_upto_date: {
    type: Date,
    required: [true, 'Tax upto date is required']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount must be positive']
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'cancelled'],
    default: 'pending'
  },
  payment_id: {
    type: String,
    index: true
  },
  payment_status: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending',
    index: true
  },
  payment_details: {
    transaction_id: String,
    payment_method: String,
    paid_at: Date,
    payment_reference: String,
    /** Cashfree cf_payment_id (gateway payment transaction ID) */
    payment_transaction_id: { type: String, default: null },
    /** Cashfree bank_reference / UTR when provided by the gateway */
    bank_reference: { type: String, default: null },
    /** Cashfree cf_order_id */
    cashfree_order_id: { type: String, default: null },
  },
  validity: {
    valid_from: Date,
    valid_until: Date,
    is_expired: {
      type: Boolean,
      default: false
    }
  },
  processed_by_admin: {
    type: Boolean,
    default: false,
    index: true
  },
  tax_slip_pdf: {
    filename: String,
    original_name: String,
    file_path: String,
    file_size: Number,
    uploaded_at: Date,
    uploaded_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }
}, {
  timestamps: true
});

// Indexes for better query performance
bookingSchema.index({ bookingId: 1 }, { unique: true });
bookingSchema.index({ user: 1, status: 1 });
bookingSchema.index({ visiting_state: 1, status: 1 });
bookingSchema.index({ vehicle_number: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ tax_from_date: 1, tax_upto_date: 1 });
bookingSchema.index({ user: 1, createdAt: -1 });
bookingSchema.index({ 'validity.valid_until': 1, 'validity.is_expired': 1 });
bookingSchema.index({ 'payment_details.transaction_id': 1 });
bookingSchema.index({ 'payment_details.payment_transaction_id': 1 });
bookingSchema.index({ 'payment_details.bank_reference': 1 });
bookingSchema.index({ 'payment_details.cashfree_order_id': 1 });
bookingSchema.index({ payment_id: 1 });
bookingSchema.index({ payment_status: 1 });
bookingSchema.index({ processed_by_admin: 1 });
bookingSchema.index({ 'tax_slip_pdf.uploaded_at': 1 });

// Generate auto fields before saving
bookingSchema.pre('save', function(next) {
  try {
    // Generate unique booking ID if not exists
    if (!this.bookingId) {
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substring(2, 8);
      this.bookingId = `WC${timestamp}${random}`.toUpperCase();
    }
    
    // Auto-set validity dates based on tax dates
    if (this.tax_from_date && this.tax_upto_date) {
      if (!this.validity.valid_from) {
        this.validity.valid_from = this.tax_from_date;
      }
      if (!this.validity.valid_until) {
        this.validity.valid_until = this.tax_upto_date;
      }
      
      // Check if booking is expired
      const now = new Date();
      this.validity.is_expired = now > this.validity.valid_until;
    }
    
    // Auto-generate payment reference when status becomes paid
    if (this.status === 'paid' && !this.payment_details.payment_reference) {
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substring(2, 6);
      this.payment_details.payment_reference = `PAY${timestamp}${random}`.toUpperCase();
      
      // Set paid_at timestamp if not set
      if (!this.payment_details.paid_at) {
        this.payment_details.paid_at = new Date();
      }
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Validate that tax_upto_date is after tax_from_date
bookingSchema.pre('validate', function(next) {
  if (this.tax_from_date && this.tax_upto_date && this.tax_upto_date < this.tax_from_date) {
    this.invalidate('tax_upto_date', 'Tax upto date must be after tax from date');
  }
  next();
});

// Static method to update expired bookings
bookingSchema.statics.updateExpiredBookings = async function() {
  try {
    const now = new Date();
    const result = await this.updateMany(
      { 
        'validity.valid_until': { $lt: now },
        'validity.is_expired': false
      },
      { 
        $set: { 'validity.is_expired': true }
      }
    );
    return result;
  } catch (error) {
    console.error('Error updating expired bookings:', error);
    throw error;
  }
};

// Instance method to check if booking is valid
bookingSchema.methods.isValid = function() {
  const now = new Date();
  return !this.validity.is_expired && 
         this.validity.valid_from <= now && 
         this.validity.valid_until >= now &&
         this.status === 'paid';
};

// Instance method to get booking summary
bookingSchema.methods.getSummary = function() {
  return {
    bookingId: this.bookingId,
    status: this.status,
    amount: this.amount,
    vehicleNumber: this.vehicle_number,
    taxMode: this.tax_mode,
    validFrom: this.validity.valid_from,
    validUntil: this.validity.valid_until,
    isExpired: this.validity.is_expired,
    isValid: this.isValid()
  };
};

const mongooseAuditPlugin = require('../utils/mongooseAuditPlugin');
bookingSchema.plugin(mongooseAuditPlugin, { modelName: 'Booking' });

module.exports = mongoose.model('Booking', bookingSchema); 