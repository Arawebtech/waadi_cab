const mongoose = require('mongoose');

const RIDE_STATUSES = [
  'REQUESTED',
  'SEARCHING_DRIVER',
  'DRIVER_ASSIGNED',
  'DRIVER_ARRIVING',
  'DRIVER_ARRIVED',
  'OTP_VERIFICATION',
  'TRIP_STARTED',
  'TRIP_COMPLETED',
  'CANCELLED',
  'EXPIRED',
];

const locationSchema = {
  address: { type: String, required: [true, 'Address is required'], trim: true },
  lat: { type: Number, required: [true, 'Latitude is required'], min: [-90, 'Invalid latitude'], max: [90, 'Invalid latitude'] },
  lng: { type: Number, required: [true, 'Longitude is required'], min: [-180, 'Invalid longitude'], max: [180, 'Invalid longitude'] },
};

const cabRideSchema = new mongoose.Schema(
  {
    rideNumber: {
      type: String,
      required: [true, 'Ride number is required'],
      unique: true,
      index: true,
      trim: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      default: null,
      index: true,
    },
    customerName: { type: String, default: 'Customer', trim: true },
    customerPhone: { type: String, default: null, trim: true },
    vehicleTypeSlug: { type: String, default: 'mini', trim: true },
    tripType: {
      type: String,
      enum: { values: ['local', 'intercity'], message: 'Trip type must be local or intercity' },
      default: 'local',
    },
    intercityPackageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'IntercityPackage',
      default: null,
    },
    rating: {
      score: { type: Number, min: [1, 'Rating must be at least 1'], max: [5, 'Rating cannot exceed 5'] },
      review: { type: String, trim: true, maxLength: [500, 'Review cannot exceed 500 characters'] },
      ratedAt: Date,
    },
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      default: null,
    },
    status: {
      type: String,
      enum: { values: RIDE_STATUSES, message: 'Invalid ride status' },
      default: 'SEARCHING_DRIVER',
      index: true,
    },
    pickup: locationSchema,
    drop: locationSchema,
    fare: {
      base: { type: Number, default: 0, min: 0 },
      distance: { type: Number, default: 0, min: 0 },
      total: { type: Number, required: [true, 'Fare total is required'], min: [0, 'Fare must be zero or greater'] },
    },
    distanceKm: { type: Number, default: 0, min: 0 },
    durationMin: { type: Number, default: 0, min: 0 },
    paymentMethod: {
      type: String,
      enum: { values: ['cash', 'upi', 'wallet', 'card'], message: 'Invalid payment method' },
      default: 'cash',
    },
    paymentStatus: {
      type: String,
      enum: {
        values: ['pending', 'paid', 'paid_by_cash', 'failed'],
        message: 'Invalid payment status',
      },
      default: 'pending',
      index: true,
    },
    paymentDetails: {
      transactionId: String,
      gateway: String,
      gatewayPaymentId: String,
      paidAt: Date,
      initiatedAt: Date,
    },
    adminCommission: { type: Number, default: 0, min: 0 },
    searchExpiresAt: { type: Date, index: true },
    assignedAt: Date,
    arrivedAt: Date,
    startedAt: Date,
    completedAt: Date,
    cancelledBy: {
      type: String,
      enum: { values: ['customer', 'driver', 'system'], message: 'Invalid cancelledBy value' },
    },
    cancelReason: { type: String, trim: true, maxLength: [500, 'Cancel reason is too long'] },
    tripOtp: { type: String, default: null },
    driverEarnings: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

cabRideSchema.index({ driverId: 1, status: 1 });
cabRideSchema.index({ status: 1, createdAt: -1 });
cabRideSchema.index({ customerId: 1, createdAt: -1 });

module.exports = mongoose.model('CabRide', cabRideSchema);
module.exports.RIDE_STATUSES = RIDE_STATUSES;
