const mongoose = require('mongoose');

const insuranceInquirySchema = new mongoose.Schema({
  vehicle_number: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    index: true
  },
  phone_number: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  status: {
    type: String,
    enum: ['new', 'contacted', 'closed'],
    default: 'new',
    index: true
  }
}, { timestamps: true });

module.exports = mongoose.model('InsuranceInquiry', insuranceInquirySchema);


