const mongoose = require('mongoose');

const districtSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'District name is required'],
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

// Compound index for unique district per state
districtSchema.index({ name: 1, state_id: 1 }, { unique: true });
districtSchema.index({ state_id: 1, is_active: 1 });

module.exports = mongoose.model('District', districtSchema); 