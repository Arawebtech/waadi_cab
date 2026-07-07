const express = require('express');
const rateLimit = require('express-rate-limit');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload.middleware');
const controller = require('./controller');
const {
  validateBody,
  validateObjectId,
  rejectEmptyBody,
} = require('../middleware/validate.middleware');
const {
  updateProfileBody,
  registrationStepBody,
  activeVehicleBody,
  onlineStatusBody,
  locationUpdateBody,
  availabilityBody,
  rideStatusBody,
  verifyTripOtpBody,
  sendMessageBody,
  purchaseTestingBody,
} = require('../validations/cab-driver.validation');

const router = express.Router();

const cabDriverLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Try again later.' },
});

router.use(cabDriverLimiter);
router.use(authenticate);
router.use(authorize('driver', 'owner'));

router.get('/profile', controller.getProfile);
router.patch('/profile', rejectEmptyBody, validateBody(updateProfileBody), controller.updateProfile);
router.patch('/registration-step', rejectEmptyBody, validateBody(registrationStepBody), controller.saveRegistrationStep);
router.get('/verification', controller.getVerification);
router.post('/verification/submit', controller.submitVerification);
router.patch('/active-vehicle', rejectEmptyBody, validateBody(activeVehicleBody), controller.setActiveVehicle);

router.get('/subscription/plans', controller.getPlans);
router.get('/subscription/current', controller.getCurrentSubscription);
router.get('/subscription/history', controller.getSubscriptionHistory);
router.post('/subscription/purchase-testing', rejectEmptyBody, validateBody(purchaseTestingBody), controller.purchaseTesting);

router.get('/location', controller.getLocation);
router.get('/location/status', controller.getLocationStatus);
router.patch('/online', rejectEmptyBody, validateBody(onlineStatusBody), controller.setOnline);
router.patch('/availability', rejectEmptyBody, validateBody(availabilityBody), controller.setAvailability);
router.patch('/location', rejectEmptyBody, validateBody(locationUpdateBody), controller.updateLocation);

router.get('/rides/requests', controller.getRideRequests);
router.get('/rides/active', controller.getActiveRide);
router.get('/rides', controller.getMyRides);
router.get('/dashboard', controller.getDashboard);
router.get('/wallet', controller.getWallet);
router.get('/wallet/transactions', controller.getWalletTransactions);

router.get('/rides/:id/messages', validateObjectId('id', 'ride ID'), controller.getRideMessages);
router.post('/rides/:id/messages', validateObjectId('id', 'ride ID'), rejectEmptyBody, validateBody(sendMessageBody), controller.sendRideMessage);
router.post('/rides/:id/verify-otp', validateObjectId('id', 'ride ID'), rejectEmptyBody, validateBody(verifyTripOtpBody), controller.verifyTripOtp);
router.post('/rides/:id/accept', validateObjectId('id', 'ride ID'), controller.acceptRide);
router.post('/rides/:id/reject', validateObjectId('id', 'ride ID'), controller.rejectRide);
router.patch('/rides/:id/status', validateObjectId('id', 'ride ID'), rejectEmptyBody, validateBody(rideStatusBody), controller.updateRideStatus);

module.exports = router;
