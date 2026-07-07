const mongoose = require('mongoose');

const savedPlaceSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    label: { type: String, enum: ['home', 'work', 'other'], required: true },
    name: { type: String, required: true },
    address: { type: String, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    placeId: { type: String },
  },
  { timestamps: true }
);

savedPlaceSchema.index({ customerId: 1, label: 1 });

module.exports = mongoose.model('SavedPlace', savedPlaceSchema);
