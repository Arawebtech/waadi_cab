
const mongoose = require('mongoose');

const locationSchema = {
  address: { type: String, required: [true, 'Address is required'], trim: true },
  lat: { type: Number, required: [true, 'Latitude is required'], min: [-90, 'Invalid latitude'], max: [90, 'Invalid latitude'] },
  lng: { type: Number, required: [true, 'Longitude is required'], min: [-180, 'Invalid longitude'], max: [180, 'Invalid longitude'] },
  placeId: { type: String, trim: true },
};

const fareBreakdownSchema = {
  base: { type: Number, default: 0, min: 0 },
  distance: { type: Number, default: 0, min: 0 },
  time: { type: Number, default: 0, min: 0 },
  surge: { type: Number, default: 0, min: 0 },
  night: { type: Number, default: 0, min: 0 },
  waiting: { type: Number, default: 0, min: 0 },
  toll: { type: Number, default: 0, min: 0 },
  intercity: { type: Number, default: 0, min: 0 },
  discount: { type: Number, default: 0, min: 0 },
  total: { type: Number, required: [true, 'Fare total is required'], min: [0, 'Fare must be zero or greater'] },
};

const BOOKING_STATUS = [
  'REQUESTED',
  'SEARCHING_DRIVER',
  'DRIVER_ASSIGNED',
  'DRIVER_ARRIVING',
  'DRIVER_ARRIVED',
  'OTP_VERIFICATION',
  'TRIP_STARTED',
  'TRIP_COMPLETED',
  'CANCELLED',
  'PACKAGE_SELECTED',
  'INTERCITY_CONFIRMED',
  'ROUTE_ASSIGNED',
  // Legacy intercity listing board
  'unassigned',
  'assigned',
];

const bookingSchema = new mongoose.Schema(
  {
    bookingNumber: { type: String, required: [true, 'Booking number is required'], unique: true, index: true, trim: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: [true, 'Customer is required'], index: true },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: [true, 'Vehicle is required'] },
    status: {
      type: String,
      enum: { values: BOOKING_STATUS, message: 'Invalid booking status' },
      default: 'REQUESTED',
      index: true,
    },
    tripType: {
      type: String,
      enum: { values: ['local', 'intercity'], message: 'Trip type must be local or intercity' },
      default: 'local',
      index: true,
    },
    intercityType: {
      type: String,
      enum: {
        values: ['one_way', 'round_trip', 'multi_city', 'airport', 'outstation_package'],
        message: 'Invalid intercity type',
      },
    },
    intercityPackageId: { type: mongoose.Schema.Types.ObjectId, ref: 'IntercityPackage' },
    pickup: locationSchema,
    drop: locationSchema,
    stops: [locationSchema],
    returnPickup: locationSchema,
    scheduledAt: { type: Date, index: true },
    distanceKm: { type: Number, default: 0, min: 0 },
    durationMin: { type: Number, default: 0, min: 0 },
    fare: fareBreakdownSchema,
    paymentMethod: {
      type: String,
      enum: { values: ['cash', 'upi', 'wallet', 'card'], message: 'Invalid payment method' },
      default: 'cash',
    },
    paymentStatus: {
      type: String,
      enum: { values: ['pending', 'paid', 'failed', 'refunded'], message: 'Invalid payment status' },
      default: 'pending',
    },
    tripOtpHash: { type: String, select: false },
    couponCode: { type: String, trim: true },
    cancelledBy: {
      type: String,
      enum: { values: ['customer', 'driver', 'system'], message: 'Invalid cancelledBy value' },
    },
    cancelReason: { type: String, trim: true, maxLength: [500, 'Cancel reason is too long'] },
    ratingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Rating' },
    driverAssignedAt: Date,
    driverArrivedAt: Date,
    tripStartedAt: Date,
    tripCompletedAt: Date,
    searchExpiresAt: Date,
    // Legacy intercity listing fields (admin dashboard / driver interest board)
    from_location: { type: String, trim: true },
    to_location: { type: String, trim: true },
    start_date: Date,
    return_date: Date,
    notes: { type: String, trim: true, maxLength: 1000 },
    assigned_driver_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assigned_driver_phone: { type: String, trim: true },
    interests: [{
      user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      phone_number: { type: String, trim: true },
      first_name: { type: String, trim: true },
      last_name: { type: String, trim: true },
    }],
  },
  { timestamps: true }
);

bookingSchema.index({ customerId: 1, createdAt: -1 });
bookingSchema.index({ driverId: 1, status: 1 });
bookingSchema.index({ status: 1, scheduledAt: 1 });

module.exports = mongoose.model('CabBooking', bookingSchema);
module.exports.BOOKING_STATUS = BOOKING_STATUS;
