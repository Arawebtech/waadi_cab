const mongoose = require('mongoose');

const driverLocationSchema = new mongoose.Schema(
  {
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },

    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },

    isOnline: {
      type: Boolean,
      default: false,
      index: true,
    },

    isAvailable: {
      type: Boolean,
      default: false,
      index: true,
    },

    heading: {
      type: Number,
      min: 0,
      max: 360,
      default: 0,
    },

    speed: {
      type: Number,
      default: 0,
    },

    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CabBooking',
      default: null,
    },
   vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle',
      default: null,
    },

    lastSeen: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

driverLocationSchema.index({ location: '2dsphere' });
driverLocationSchema.index({ isOnline: 1, isAvailable: 1 });
driverLocationSchema.index({ lastSeen: 1 });

module.exports = mongoose.model('DriverLocation', driverLocationSchema);
