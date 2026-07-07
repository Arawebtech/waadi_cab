const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const logsController = require('../controllers/customerLogsController');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { handleExpressValidation, rejectEmptyBody } = require('../middleware/validate.middleware');

const router = express.Router();

// Validation rules
const signupValidation = [
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2-50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('First name should contain only letters'),
  
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2-50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Last name should contain only letters'),
  
  body('phoneNumber')
    .isMobilePhone('en-IN')
    .withMessage('Please enter a valid Indian phone number')
    .isLength({ min: 10, max: 10 })
    .withMessage('Phone number must be exactly 10 digits'),
  
  body('userType')
    .isIn(['driver', 'owner', 'agent'])
    .withMessage('User type must be driver, owner, or agent')
];

const otpVerificationValidation = [
  body('phoneNumber')
    .isMobilePhone('en-IN')
    .withMessage('Please enter a valid Indian phone number'),
  
  body('otp')
    .isLength({ min: 4, max: 4 })
    .withMessage('OTP must be exactly 4 digits')
    .isNumeric()
    .withMessage('OTP must contain only numbers'),
  
  body('verificationId')
    .notEmpty()
    .withMessage('Verification ID is required')
];

const loginValidation = [
  body('phoneNumber')
    .isMobilePhone('en-IN')
    .withMessage('Please enter a valid Indian phone number')
    .isLength({ min: 10, max: 10 })
    .withMessage('Phone number must be exactly 10 digits')
];

const resendOTPValidation = [
  body('phoneNumber')
    .isMobilePhone('en-IN')
    .withMessage('Please enter a valid Indian phone number'),
  
  body('purpose')
    .optional()
    .isIn(['signup', 'login', 'phone_verification', 'password_reset'])
    .withMessage('Invalid OTP purpose')
];

const refreshTokenValidation = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required')
];

// Public routes (no authentication required)

/**
 * @route   POST /api/v1/auth/signup
 * @desc    Register new user (sends OTP)
 * @access  Public
 */
router.post('/signup', rejectEmptyBody, signupValidation, handleExpressValidation, authController.signup);

/**
 * @route   POST /api/v1/auth/verify-signup
 * @desc    Verify OTP and complete signup
 * @access  Public
 */
router.post('/verify-signup', rejectEmptyBody, [
  ...otpVerificationValidation,
  body('firstName').trim().isLength({ min: 2, max: 50 }).withMessage('First name is required'),
  body('lastName').trim().isLength({ min: 2, max: 50 }).withMessage('Last name is required'),
  body('userType').isIn(['driver', 'owner', 'agent']).withMessage('User type is required')
], handleExpressValidation, authController.verifyOTPAndSignup);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user (sends OTP)
 * @access  Public
 */
router.post('/login', rejectEmptyBody, loginValidation, handleExpressValidation, authController.login);


router.get(
  "/customer-logs",
  logsController.getLogs
);

/**
 * @route   POST /api/v1/auth/verify-login
 * @desc    Verify OTP and complete login
 * @access  Public
 */
router.post('/verify-login', rejectEmptyBody, otpVerificationValidation, handleExpressValidation, authController.verifyOTPAndLogin);

/**
 * @route   POST /api/v1/auth/resend-otp
 * @desc    Resend OTP
 * @access  Public
 */
router.post('/resend-otp', rejectEmptyBody, resendOTPValidation, handleExpressValidation, authController.resendOTP);

/**
 * @route   POST /api/v1/auth/refresh-token
 * @desc    Refresh access token using refresh token
 * @access  Public
 */
router.post('/refresh-token', rejectEmptyBody, refreshTokenValidation, handleExpressValidation, authController.refreshToken);

/**
 * @route   GET /api/v1/auth/check
 * @desc    Check authentication status
 * @access  Public (optional auth)
 */
router.get('/check', optionalAuth, (req, res) => {
  if (req.user) {
    return authController.checkAuth(req, res);
  }
  
  res.status(401).json({
    success: false,
    message: 'Not authenticated',
    data: {
      isAuthenticated: false
    }
  });
});

// Protected routes (authentication required)

/**
 * @route   GET /api/v1/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', authenticate, authController.getProfile);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', authenticate, authController.logout);

/**
 * @route   POST /api/v1/auth/verify-phone
 * @desc    Send OTP to verify phone number
 * @access  Private
 */
router.post('/verify-phone', [
  authenticate,
  body('phoneNumber')
    .isMobilePhone('en-IN')
    .withMessage('Please enter a valid Indian phone number')
], handleExpressValidation, authController.verifyPhone);

/**
 * @route   POST /api/v1/auth/verify-phone-otp
 * @desc    Verify phone number with OTP
 * @access  Private
 */
router.post('/verify-phone-otp', [
  authenticate,
  ...otpVerificationValidation
], handleExpressValidation, async (req, res) => {
  try {
    const { phoneNumber, otp, verificationId } = req.body;
    
    // Verify OTP
    const otpService = require('../services/otpService');
    const verificationResult = await otpService.verifyOTP(
      phoneNumber, 
      otp, 
      verificationId, 
      'phone_verification'
    );

    if (!verificationResult.success) {
      return res.status(400).json({
        success: false,
        message: verificationResult.message || 'OTP verification failed'
      });
    }

    // Update user's phone verification status
    const User = require('../models/User');
    await User.updateOne(
      { _id: req.user._id },
      { 
        phoneNumber: phoneNumber,
        isPhoneVerified: true 
      }
    );

    res.status(200).json({
      success: true,
      message: 'Phone number verified successfully',
      data: {
        phoneNumber,
        isVerified: true
      }
    });

  } catch (error) {
    console.error('Phone verification error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Phone verification failed'
    });
  }
});

/**
 * @route   DELETE /api/v1/auth/account
 * @desc    Delete user account
 * @access  Private
 */
router.delete('/account', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Soft delete - mark as inactive
    const User = require('../models/User');
    await User.updateOne(
      { _id: userId },
      { 
        isActive: false,
        deletedAt: new Date()
      }
    );

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully'
    });

  } catch (error) {
    console.error('Account deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete account'
    });
  }
});

module.exports = router; 