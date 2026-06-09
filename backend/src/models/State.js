const mongoose = require('mongoose');

const stateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'State name is required'],
    trim: true,
    unique: true
  },
  statecode: {
    type: String,
    trim: true,
    uppercase: true,
    default: null
  },
  displayOrder: {
    type: Number,
    default: 999, // Default high value for states without order
    min: 1
  },
  defaultEntryDistrict: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'District',
    default: null
  },
  is_active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for faster queries
stateSchema.index({ is_active: 1 });
stateSchema.index({ name: 1 });
stateSchema.index({ displayOrder: 1 }); // Index for sorting by display order
stateSchema.index({ defaultEntryDistrict: 1 }); // Index for default entry district queries

module.exports = mongoose.model('State', stateSchema); 