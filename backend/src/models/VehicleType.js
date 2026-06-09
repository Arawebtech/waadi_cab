const mongoose = require('mongoose');

const vehicleTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Vehicle type name is required'],
    trim: true
  },
  state_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'State',
    required: [true, 'State ID is required']
  },
  is_active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound index for unique vehicle type per state (only for active vehicle types)
vehicleTypeSchema.index({ name: 1, state_id: 1, is_active: 1 }, { 
  unique: true, 
  partialFilterExpression: { is_active: true } 
});
vehicleTypeSchema.index({ state_id: 1, is_active: 1 });

module.exports = mongoose.model('VehicleType', vehicleTypeSchema); 