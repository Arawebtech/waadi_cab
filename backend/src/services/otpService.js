const axios = require('axios');
const OTP = require('../models/OTP');

class OTPService {
  constructor() {
    this.baseURL = process.env.OTP_BASE_URL;
    this.authToken = process.env.OTP_AUTH_TOKEN;
    this.customerId = process.env.OTP_CUSTOMER_ID;
    this.countryCode = process.env.OTP_COUNTRY_CODE || '91';
  }

  // Send 4-digit OTP via MessageCentral
  async sendOTP(phoneNumber, purpose = 'signup', userAgent = '', ipAddress = '') {
    try {
      // Clean up old OTP records for this phone number and purpose
      await OTP.updateMany(
        { 
          phoneNumber, 
          purpose, 
          isVerified: false,
          expiresAt: { $lt: new Date() }
        },
        { deliveryStatus: 'expired' }
      );

      // Check for existing pending OTP for this phone number and purpose
      const existingOTP = await OTP.findOne({
        phoneNumber,
        purpose,
        isVerified: false,
        expiresAt: { $gt: new Date() },
        deliveryStatus: { $in: ['pending', 'sent'] }
      });

      if (existingOTP) {
        // If there's an existing valid OTP, return it instead of creating a new one
        const timeSinceLastOTP = Date.now() - existingOTP.createdAt.getTime();
        const twoMinutesAgo = 2 * 60 * 1000; // 2 minutes

        if (timeSinceLastOTP < twoMinutesAgo) {
          return {
            success: true,
            message: 'OTP already sent. Please wait 2 minutes before requesting another.',
            data: {
              verificationId: existingOTP.verificationId,
              expiresAt: existingOTP.expiresAt,
              phoneNumber: phoneNumber,
              purpose: purpose
            }
          };
        }
      }

      // Create OTP record in database first
      const otpRecord = await OTP.createNewOTP(phoneNumber, purpose, userAgent, ipAddress);
      
      // Prepare MessageCentral API request
      const url = `${this.baseURL}/send`;
      const params = {
        countryCode: this.countryCode,
        customerId: this.customerId,
        flowType: 'SMS',
        mobileNumber: phoneNumber
      };

      const headers = {
        'authToken': this.authToken,
        'Content-Type': 'application/json'
      };

      console.log('📤 Sending OTP to MessageCentral:', { phoneNumber, purpose });

      // Call MessageCentral API
      const response = await axios.post(url, {}, { 
        headers,
        params,
        timeout: 10000 // 10 seconds timeout
      });

      console.log('📥 MessageCentral Response:', response.data);

      // Check if API call was successful
      if (response.data.responseCode === 200 && response.data.message === 'SUCCESS') {
        // Update OTP record with MessageCentral response
        otpRecord.verificationId = response.data.data.verificationId;
        otpRecord.messageId = response.data.data.messageId || null;
        otpRecord.deliveryStatus = 'sent';
        
        await otpRecord.save();

        return {
          success: true,
          message: 'OTP sent successfully',
          data: {
            verificationId: otpRecord.verificationId,
            expiresAt: otpRecord.expiresAt,
            phoneNumber: phoneNumber,
            purpose: purpose
          }
        };
      } else {
        // Handle API error
        throw new Error(response.data.message || 'Failed to send OTP');
      }

    } catch (error) {
      console.error('❌ OTP Send Error:', error);
      
      // Update delivery status if OTP record exists
      try {
        await OTP.updateOne(
          { phoneNumber, purpose, deliveryStatus: 'pending' },
          { deliveryStatus: 'failed' }
        );
      } catch (updateError) {
        console.error('Failed to update OTP delivery status:', updateError);
      }

      if (error.response) {
        // API responded with error
        const apiError = error.response.data;
        
        // Handle specific MessageCentral errors
        if (apiError.message === 'REQUEST_ALREADY_EXISTS') {
          throw new Error('OTP request already exists. Please wait 2 minutes before requesting another.');
        } else if (apiError.message === 'INVALID_MOBILE_NUMBER') {
          throw new Error('Invalid mobile number format');
        } else if (apiError.message === 'RATE_LIMIT_EXCEEDED') {
          throw new Error('Too many OTP requests. Please try again after some time.');
        } else {
          throw new Error(apiError.message || `API Error: ${error.response.status}`);
        }
      } else if (error.request) {
        // Network error
        throw new Error('Network error: Unable to connect to OTP service');
      } else {
        // Other error
        throw new Error(error.message || 'Failed to send OTP');
      }
    }
  }

  // Verify OTP with MessageCentral
  async verifyOTP(phoneNumber, otp, verificationId, purpose = 'signup') {
    try {
      // Find OTP record in database
      const otpRecord = await OTP.findOne({
        phoneNumber,
        verificationId,
        purpose,
        isVerified: false
      }).sort({ createdAt: -1 });

      if (!otpRecord) {
        throw new Error('OTP not found or already verified');
      }

      // Check if OTP is expired
      if (otpRecord.isExpired()) {
        throw new Error('OTP has expired');
      }

      // Check attempt count
      if (otpRecord.attemptCount >= 3) {
        throw new Error('Maximum verification attempts exceeded');
      }

      // Increment attempt count
      otpRecord.attemptCount += 1;

      // Verify with MessageCentral API
      const url = `${this.baseURL}/validateOtp`;
      const params = {
        countryCode: this.countryCode,
        mobileNumber: phoneNumber,
        verificationId: verificationId,
        customerId: this.customerId,
        code: otp
      };

      const headers = {
        'authToken': this.authToken,
        'Content-Type': 'application/json'
      };

      console.log('🔍 Verifying OTP with MessageCentral:', { phoneNumber, verificationId, otp });

      const response = await axios.get(url, { 
        headers,
        params,
        timeout: 10000
      });

      console.log('📥 MessageCentral Verification Response:', response.data);

      // Check MessageCentral verification response
      if (response.data.responseCode === 200 && 
          response.data.data.verificationStatus === 'VERIFICATION_COMPLETED') {
        
        // Mark as verified in database
        otpRecord.isVerified = true;
        otpRecord.verifiedAt = new Date();
        await otpRecord.save();

        return {
          success: true,
          message: 'OTP verified successfully',
          data: {
            phoneNumber: phoneNumber,
            verificationId: verificationId,
            verifiedAt: otpRecord.verifiedAt,
            purpose: purpose
          }
        };
      } else {
        // Save the attempt count and throw error
        await otpRecord.save();
        throw new Error('Invalid OTP');
      }

    } catch (error) {
      console.error('❌ OTP Verification Error:', error);
      
      if (error.message === 'Invalid OTP' || error.message.includes('attempts')) {
        throw error; // Re-throw validation errors as-is
      }
      
      if (error.response) {
        const apiError = error.response.data;
        throw new Error(apiError.message || `Verification failed: ${error.response.status}`);
      } else if (error.request) {
        // Network error - MessageCentral is unreachable
        // Save attempt count and return network error
        const otpRecord = await OTP.findOne({
          phoneNumber,
          verificationId,
          purpose,
          isVerified: false
        }).sort({ createdAt: -1 });
        
        if (otpRecord) {
          await otpRecord.save();
        }
        
        throw new Error('Network error: Unable to verify OTP. Please try again.');
      } else {
        throw new Error(error.message || 'OTP verification failed');
      }
    }
  }

  // Resend OTP
  async resendOTP(phoneNumber, purpose = 'signup', userAgent = '', ipAddress = '') {
    try {
      // Find existing OTP record
      const existingOTP = await OTP.findValidOTP(phoneNumber, purpose);
      
      if (existingOTP && !existingOTP.canResend()) {
        throw new Error('Please wait before requesting another OTP');
      }

      // Mark existing OTP as resent
      if (existingOTP) {
        existingOTP.markAsResent();
        await existingOTP.save();
      }

      // Send new OTP
      return await this.sendOTP(phoneNumber, purpose, userAgent, ipAddress);

    } catch (error) {
      console.error('❌ OTP Resend Error:', error);
      throw error;
    }
  }

  // Get OTP status
  async getOTPStatus(verificationId) {
    try {
      const otpRecord = await OTP.findByVerificationId(verificationId);
      
      if (!otpRecord) {
        throw new Error('OTP not found');
      }

      return {
        success: true,
        data: {
          phoneNumber: otpRecord.phoneNumber,
          purpose: otpRecord.purpose,
          isVerified: otpRecord.isVerified,
          isExpired: otpRecord.isExpired(),
          attemptCount: otpRecord.attemptCount,
          resendCount: otpRecord.resendCount,
          canResend: otpRecord.canResend(),
          expiresAt: otpRecord.expiresAt,
          createdAt: otpRecord.createdAt
        }
      };

    } catch (error) {
      console.error('❌ Get OTP Status Error:', error);
      throw error;
    }
  }

  // Generate test OTP (for development)
  generateTestOTP() {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  // Validate phone number format
  validatePhoneNumber(phoneNumber) {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phoneNumber);
  }

  // Clean up expired OTPs (scheduled task)
  async cleanupExpiredOTPs() {
    try {
      const result = await OTP.cleanupExpired();
      console.log(`🧹 Cleaned up ${result.deletedCount} expired OTPs`);
      return result;
    } catch (error) {
      console.error('❌ OTP Cleanup Error:', error);
      throw error;
    }
  }

  // Get OTP statistics
  async getOTPStats(fromDate, toDate) {
    try {
      const stats = await OTP.getStats(fromDate, toDate);
      return {
        success: true,
        data: stats
      };
    } catch (error) {
      console.error('❌ OTP Stats Error:', error);
      throw error;
    }
  }

  // Check rate limiting for phone number
  async checkRateLimit(phoneNumber) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentOTPCount = await OTP.countDocuments({
      phoneNumber,
      createdAt: { $gte: oneHourAgo }
    });
    
    return {
      allowed: recentOTPCount < 3,
      remainingAttempts: Math.max(0, 3 - recentOTPCount),
      resetTime: new Date(Date.now() + 60 * 60 * 1000)
    };
  }
}

module.exports = new OTPService(); 