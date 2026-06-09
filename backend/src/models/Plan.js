const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
  vehicle_type_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VehicleType',
    required: [true, 'Vehicle type ID is required']
  },
  plan_type: {
    type: String,
    required: [true, 'Plan type is required'],
    enum: ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly', 'Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7', 'Day 8', 'Day 9', 'Day 10', 'Day 11', 'Day 12', 'Day 13', 'Day 14', 'Day 15', 'Day 16', 'Day 17', 'Day 18', 'Day 19', 'Day 20'],
    trim: true
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount must be positive']
  },
  is_active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound index for unique plan per vehicle type (only for active plans)
planSchema.index({ vehicle_type_id: 1, plan_type: 1, is_active: 1 }, { 
  unique: true, 
  partialFilterExpression: { is_active: true } 
});
planSchema.index({ vehicle_type_id: 1, is_active: 1 });

module.exports = mongoose.model('Plan', planSchema); 