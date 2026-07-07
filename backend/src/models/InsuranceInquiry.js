const mongoose = require('mongoose');

const insuranceInquirySchema = new mongoose.Schema({
  vehicle_number: {
    type: String,
    required: [true, 'Vehicle number is required'],
    trim: true,
    uppercase: true,
    index: true,
    match: [/^[A-Z]{2}[0-9]{1,2}[A-Z]{1,2}[0-9]{4}$/, 'Invalid vehicle number format'],
  },
  phone_number: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    index: true,
    match: [/^[6-9]\d{9}$/, 'Please enter a valid 10-digit phone number'],
  },
  status: {
    type: String,
    enum: { values: ['new', 'contacted', 'closed'], message: 'Invalid inquiry status' },
    default: 'new',
    index: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('InsuranceInquiry', insuranceInquirySchema);
