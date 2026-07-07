const mongoose = require('mongoose');

const intercityPackageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Package name is required'],
      trim: true,
      maxLength: [100, 'Name cannot exceed 100 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: { type: String, trim: true, maxLength: [1000, 'Description is too long'] },
    fromCity: {
      type: String,
      required: [true, 'From city is required'],
      trim: true,
      index: true,
    },
    toCity: {
      type: String,
      required: [true, 'To city is required'],
      trim: true,
      index: true,
    },
    distanceKm: {
      type: Number,
      required: [true, 'Distance is required'],
      min: [1, 'Distance must be at least 1 km'],
    },
    durationHours: { type: Number, min: [0, 'Duration cannot be negative'] },
    basePrice: {
      type: Number,
      required: [true, 'Base price is required'],
      min: [0, 'Base price must be zero or greater'],
    },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
    tripType: {
      type: String,
      enum: {
        values: ['one_way', 'round_trip', 'multi_city', 'airport', 'outstation_package'],
        message: 'Invalid trip type',
      },
      required: [true, 'Trip type is required'],
    },
    includesToll: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('IntercityPackage', intercityPackageSchema);
