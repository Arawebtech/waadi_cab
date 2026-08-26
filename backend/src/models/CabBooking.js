
const mongoose = require('mongoose');

const cabBookingSchema = new mongoose.Schema({
  from_location: { type: String, required: true, trim: true },
  to_location: { type: String, required: true, trim: true },
  start_date: { type: Date, required: true, index: true },
  trip_type: { type: String, enum: ['one_way', 'round_trip'], required: true },
  return_date: { type: Date },
  status: { type: String, enum: ['unassigned', 'assigned', 'closed'], default: 'unassigned', index: true },
  assigned_driver_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  assigned_driver_phone: { type: String, default: '' },
  notes: { type: String, default: '' },
  interests: [
    {
      user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      phone_number: { type: String, required: true },
      first_name: { type: String, required: true },
      last_name: { type: String, required: true },
      createdAt: { type: Date, default: Date.now }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('CabBooking', cabBookingSchema);


