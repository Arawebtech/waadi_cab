const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian phone number']
  },
  otp: {
    type: String,
    required: [true, 'OTP is required'],
    length: [4, 'OTP must be exactly 4 digits']
  },
  verificationId: {
    type: String,
    required: true // This comes from MessageCentral API
  },
  purpose: {
    type: String,
    enum: ['signup', 'login', 'password_reset', 'phone_verification'],
    required: [true, 'OTP purpose is required']
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  attemptCount: {
    type: Number,
    default: 0,
    max: [3, 'Maximum 3 verification attempts allowed']
  },
  expiresAt: {
    type: Date,
    required: true,
    default: function() {
      return new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
    }
  },
  verifiedAt: Date,
  
  // MessageCentral specific fields
  messageId: String,
  deliveryStatus: {
    type: String,
    enum: ['sent', 'delivered', 'failed', 'pending'],
    default: 'pending'
  },
  
  // Additional tracking
  userAgent: String,
  ipAddress: String,
  
  // Rate limiting
  resendCount: {
    type: Number,
    default: 0,
    max: [3, 'Maximum 3 resend attempts allowed per hour']
  },
  lastResentAt: Date
}, {
  timestamps: true
});

// TTL index - documents will be automatically deleted after expiration
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound index for efficient querying
otpSchema.index({ phoneNumber: 1, purpose: 1, isVerified: 1 });
otpSchema.index({ verificationId: 1 });

// Instance methods
otpSchema.methods.isExpired = function() {
  return new Date() > this.expiresAt;
};

otpSchema.methods.canResend = function() {
  if (this.resendCount >= 3) return false;
  if (!this.lastResentAt) return true;
  
  // Allow resend after 2 minutes
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
  return this.lastResentAt < twoMinutesAgo;
};

otpSchema.methods.verify = function(inputOtp) {
  if (this.isExpired()) {
    throw new Error('OTP has expired');
  }
  
  if (this.attemptCount >= 3) {
    throw new Error('Maximum verification attempts exceeded');
  }
  
  this.attemptCount += 1;
  
  if (this.otp === inputOtp) {
    this.isVerified = true;
    this.verifiedAt = new Date();
    return true;
  }
  
  return false;
};

otpSchema.methods.markAsResent = function() {
  this.resendCount += 1;
  this.lastResentAt = new Date();
  this.attemptCount = 0; // Reset attempt count on resend
};

// Static methods
otpSchema.statics.findValidOTP = function(phoneNumber, purpose) {
  return this.findOne({
    phoneNumber,
    purpose,
    isVerified: false,
    expiresAt: { $gt: new Date() },
    attemptCount: { $lt: 3 }
  }).sort({ createdAt: -1 });
};

otpSchema.statics.findByVerificationId = function(verificationId) {
  return this.findOne({ verificationId });
};

otpSchema.statics.generateOTP = function() {
  // Generate 4-digit OTP
  return Math.floor(1000 + Math.random() * 9000).toString();
};

otpSchema.statics.createNewOTP = async function(phoneNumber, purpose, userAgent, ipAddress) {
  // Check rate limiting - max 3 OTPs per phone number per hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentOTPCount = await this.countDocuments({
    phoneNumber,
    createdAt: { $gte: oneHourAgo }
  });
  
  if (recentOTPCount >= 3) {
    throw new Error('Too many OTP requests. Please try again after 1 hour.');
  }
  
  // Invalidate any existing OTPs for this phone and purpose
  await this.updateMany(
    { phoneNumber, purpose, isVerified: false },
    { expiresAt: new Date() }
  );
  
  // For MessageCentral integration, we don't store the actual OTP 
  // since MessageCentral generates and sends it directly
  const otp = 'XXXX'; // Placeholder - actual OTP is handled by MessageCentral
  
  return new this({
    phoneNumber,
    otp,
    purpose,
    userAgent,
    ipAddress,
    verificationId: `temp_${Date.now()}` // Will be updated with actual verification ID from MessageCentral
  });
};

otpSchema.statics.cleanupExpired = function() {
  return this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
};

// Get statistics for monitoring
otpSchema.statics.getStats = function(fromDate, toDate) {
  const matchStage = {};
  if (fromDate && toDate) {
    matchStage.createdAt = {
      $gte: new Date(fromDate),
      $lte: new Date(toDate)
    };
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          purpose: '$purpose'
        },
        totalSent: { $sum: 1 },
        verified: {
          $sum: { $cond: [{ $eq: ['$isVerified', true] }, 1, 0] }
        },
        expired: {
          $sum: { $cond: [{ $lt: ['$expiresAt', new Date()] }, 1, 0] }
        },
        averageAttempts: { $avg: '$attemptCount' }
      }
    },
    {
      $group: {
        _id: '$_id.date',
        purposes: {
          $push: {
            purpose: '$_id.purpose',
            totalSent: '$totalSent',
            verified: '$verified',
            expired: '$expired',
            successRate: {
              $multiply: [
                { $divide: ['$verified', '$totalSent'] },
                100
              ]
            }
          }
        },
        dailyTotal: { $sum: '$totalSent' },
        dailyVerified: { $sum: '$verified' }
      }
    },
    { $sort: { _id: -1 } }
  ]);
};

// Pre-save middleware
otpSchema.pre('save', function(next) {
  // Ensure OTP is always 4 digits
  if (this.isModified('otp') && this.otp.length !== 4) {
    return next(new Error('OTP must be exactly 4 digits'));
  }
  next();
});

module.exports = mongoose.model('OTP', otpSchema); 