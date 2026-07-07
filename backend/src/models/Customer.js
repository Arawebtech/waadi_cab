const mongoose = require('mongoose');
const crypto = require('crypto');

const customerSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      trim: true,
      maxLength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },
    phone: {
      type: String,
      trim: true,
      index: true,
      match: [/^[6-9]\d{9}$/, 'Please enter a valid 10-digit phone number'],
    },
    profileImage: {
      secure_url: String,
      public_id: String,
      uploadedAt: Date,
    },
    walletId: { type: mongoose.Schema.Types.ObjectId, ref: 'Wallet' },
    referralCode: { type: String, unique: true, sparse: true, index: true },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    emergencyContacts: [{ name: String, phone: String, relation: String }],
    ridePreferences: {
      vehicleType: String,
      acPreferred: { type: Boolean, default: false },
      quietRide: { type: Boolean, default: false },
    },
    rating: {
      type: Number,
      default: 5,
      min: [0, 'Rating cannot be less than 0'],
      max: [5, 'Rating cannot exceed 5'],
    },
    totalRatings: { type: Number, default: 0, min: 0 },
    language: { type: String, default: 'en', enum: { values: ['en', 'hi'], message: 'Language must be en or hi' } },
    darkMode: { type: Boolean, default: false },
    status: {
      type: String,
      enum: { values: ['active', 'suspended'], message: 'Status must be active or suspended' },
      default: 'active',
      index: true,
    },
    lastLoginAt: { type: Date },
    deviceTokens: [{ type: String }],
    recentSearches: [
      { address: String, lat: Number, lng: Number, placeId: String, searchedAt: { type: Date, default: Date.now } },
    ],
  },
  { timestamps: true }
);

customerSchema.pre('save', function generateReferral(next) {
  if (!this.referralCode) {
    this.referralCode = crypto.randomBytes(4).toString('hex').toUpperCase();
  }
  next();
});

module.exports = mongoose.model('Customer', customerSchema);
