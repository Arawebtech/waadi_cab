const express = require('express');
const { body } = require('express-validator');
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const {
  validateBody,
  validateObjectId,
  handleExpressValidation,
  rejectEmptyBody,
} = require('../middleware/validate.middleware');
const {
  updateProfileBody,
  addVehicleBody,
  updateVehicleBody,
} = require('../validations/user.validation');

const router = express.Router();

const formPreferencesRoutes = require('./formPreferencesRoutes');

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
    .withMessage('Please enter a valid email address'),
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
    .withMessage('isDefault must be a boolean'),
];

router.get('/profile', authenticate, userController.getProfile);
router.put(
  '/profile',
  authenticate,
  rejectEmptyBody,
  validateBody(updateProfileBody),
  ...updateProfileValidation,
  handleExpressValidation,
  userController.updateProfile
);
router.get('/dashboard', authenticate, userController.getDashboard);
router.get('/fetch-dashboard', authenticate, userController.fetchDashboard);
router.get('/vehicles', authenticate, userController.getVehicles);
router.post(
  '/vehicles',
  authenticate,
  rejectEmptyBody,
  validateBody(addVehicleBody),
  ...vehicleValidation,
  handleExpressValidation,
  userController.addVehicle
);
router.put(
  '/vehicles/:vehicleId',
  authenticate,
  validateObjectId('vehicleId', 'vehicle ID'),
  rejectEmptyBody,
  validateBody(updateVehicleBody),
  userController.updateVehicle
);
router.delete('/vehicles/:vehicleId', authenticate, validateObjectId('vehicleId', 'vehicle ID'), userController.deleteVehicle);

router.use('/form-preferences', formPreferencesRoutes);

module.exports = router;
