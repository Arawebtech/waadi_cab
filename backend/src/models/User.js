const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxLength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxLength: [50, 'Last name cannot exceed 50 characters']
  },
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    match: [/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian phone number']
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  userType: {
    type: String,
    enum: ['driver', 'owner', 'agent'],
    required: [true, 'User type is required']
  },
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  // Version tracking fields
  appVersion: {
    type: String,
    default: null
  },
  platform: {
    type: String,
    enum: ['android', 'ios', 'web'],
    default: 'web'
  },
  lastVersionUpdate: {
    type: Date,
    default: null
  },
  // Authentication tokens
  refreshTokens: [{
    token: String,
    createdAt: { type: Date, default: Date.now },
    expiresAt: Date
  }],
  lastLogin: Date,
  // Push notifications
  fcmToken: {
    type: String,
    default: null
  },
  // Additional user data
  vehicles: [{
    vehicleNumber: {
      type: String,
      required: true,
      uppercase: true
    },
    seatCapacity: {
      type: String,
      enum: ['5(4+1)', '6(5+1)', '7(6+1)', '8(7+1)', '9(8+1)'],
      required: true
    },
    isDefault: {
      type: Boolean,
      default: false
    },
    documents: [{
      type: String,
      docType: {
        type: String,
        enum: ['rc', 'insurance', 'puc', 'license']
      }
    }],
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  profile: {
    avatar: String,
    address: {
      street: String,
      city: String,
      state: String,
      pincode: String
    },
    emergencyContact: {
      name: String,
      phone: String,
      relation: String
    }
  },
  preferences: {
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      push: { type: Boolean, default: true }
    },
    language: {
      type: String,
      enum: ['en', 'hi'],
      default: 'en'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Instance method to get full name
userSchema.methods.getFullName = function() {
  return `${this.firstName} ${this.lastName}`;
};

// Instance method to get public profile
userSchema.methods.getPublicProfile = function() {
  const user = this.toObject();
  delete user.fcmToken;
  return user;
};

// Static method to find by phone number
userSchema.statics.findByPhoneNumber = function(phoneNumber) {
  return this.findOne({ phoneNumber });
};

// Static method to find user by email (handles null values properly)
userSchema.statics.findByEmail = function(email) {
  // Return null if email is null/undefined to avoid finding users with null emails
  if (!email) {
    return null;
  }
  return this.findOne({ email: email.toLowerCase().trim() });
};

// Indexes
userSchema.index({ phoneNumber: 1 });
userSchema.index({ email: 1 }, { sparse: true }); // Sparse index allows multiple null values
userSchema.index({ appVersion: 1 });
userSchema.index({ platform: 1 });
userSchema.index({ lastVersionUpdate: 1 });

module.exports = mongoose.model('User', userSchema);