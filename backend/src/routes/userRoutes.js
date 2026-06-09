const express = require('express');
const { body } = require('express-validator');
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Import form preferences routes
const formPreferencesRoutes = require('./formPreferencesRoutes');

// Validation rules
const updateProfileValidation = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2-50 characters'),
  
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2-50 characters'),
  
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please enter a valid email address')
];

const vehicleValidation = [
  body('vehicleNumber')
    .matches(/^[A-Z]{2}[0-9]{1,2}[A-Z]{1,2}[0-9]{4}$/)
    .withMessage('Invalid vehicle number format'),
  
  body('seatCapacity')
    .isIn(['5(4+1)', '6(5+1)', '7(6+1)', '8(7+1)', '9(8+1)'])
    .withMessage('Invalid seat capacity'),
  
  body('isDefault')
    .optional()
    .isBoolean()
    .withMessage('isDefault must be a boolean')
];

/**
 * @route   GET /api/v1/users/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get('/profile', authenticate, userController.getProfile);

/**
 * @route   PUT /api/v1/users/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', [authenticate, ...updateProfileValidation], userController.updateProfile);

/**
 * @route   GET /api/v1/users/dashboard
 * @desc    Get user dashboard data
 * @access  Private
 */
router.get('/dashboard', authenticate, userController.getDashboard);

/**
 * @route   GET /api/v1/users/fetch-dashboard
 * @desc    Fetch enhanced dashboard with active passes and recent activity
 * @access  Private
 */
router.get('/fetch-dashboard', authenticate, userController.fetchDashboard);

/**
 * @route   GET /api/v1/users/vehicles
 * @desc    Get user vehicles
 * @access  Private
 */
router.get('/vehicles', authenticate, userController.getVehicles);

/**
 * @route   POST /api/v1/users/vehicles
 * @desc    Add new vehicle
 * @access  Private
 */
router.post('/vehicles', [authenticate, ...vehicleValidation], userController.addVehicle);

/**
 * @route   PUT /api/v1/users/vehicles/:vehicleId
 * @desc    Update vehicle
 * @access  Private
 */
router.put('/vehicles/:vehicleId', authenticate, userController.updateVehicle);

/**
 * @route   DELETE /api/v1/users/vehicles/:vehicleId
 * @desc    Delete vehicle
 * @access  Private
 */
router.delete('/vehicles/:vehicleId', authenticate, userController.deleteVehicle);

// Form preferences routes
router.use('/form-preferences', formPreferencesRoutes);

module.exports = router; 