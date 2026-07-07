const express = require('express');
const rateLimit = require('express-rate-limit');
const env = require('../config/env');
const controller = require('./controller');
const { authenticateCustomer } = require('./middleware');
const {
  validateBody,
  validateQuery,
  validateObjectId,
  rejectEmptyBody,
} = require('../middleware/validate.middleware');
const {
  otpRequestBody,
  registerBody,
  loginBody,
  refreshBody,
  logoutBody,
  updateProfileBody,
  fareEstimateBody,
  createBookingBody,
  cancelBookingBody,
  rateBookingBody,
  savePlaceBody,
  sendMessageBody,
  paymentVerifyBody,
  bookingsQuery,
  customerRidesQuery,
  placesSearchQuery,
  geocodeQuery,
  directionsQuery,
} = require('../validations/cab-customer.validation');

const router = express.Router();

const otpLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.otpMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many OTP requests. Try again later.' },
});

router.post('/auth/otp/request', otpLimiter, rejectEmptyBody, validateBody(otpRequestBody), controller.requestOtp);
router.post('/auth/otp/resend', otpLimiter, rejectEmptyBody, validateBody(otpRequestBody), controller.resendOtp);
router.post('/auth/register', otpLimiter, rejectEmptyBody, validateBody(registerBody), controller.register);
router.post('/auth/login', otpLimiter, rejectEmptyBody, validateBody(loginBody), controller.login);
router.post('/auth/refresh', rejectEmptyBody, validateBody(refreshBody), controller.refresh);
router.post('/auth/logout', validateBody(logoutBody), controller.logout);

router.get('/vehicle-types', controller.vehicleTypes);
router.get('/intercity-packages', controller.intercityPackages);
router.post('/fare/estimate', rejectEmptyBody, validateBody(fareEstimateBody), controller.fareEstimate);
router.get('/routes/directions', validateQuery(directionsQuery), controller.getDirections);
router.get('/places/search', validateQuery(placesSearchQuery), controller.searchPlaces);
router.get('/places/geocode', validateQuery(geocodeQuery), controller.geocodeAddress);
router.get('/drivers/live', controller.liveDrivers);

router.use(authenticateCustomer);

router.get('/auth/me', controller.me);
router.patch('/profile', rejectEmptyBody, validateBody(updateProfileBody), controller.updateProfile);
router.get('/bookings/active', controller.activeBooking);
router.post('/bookings', rejectEmptyBody, validateBody(createBookingBody), controller.createBooking);
router.get('/bookings/mine', validateQuery(customerRidesQuery), controller.myBookings);
router.get('/bookings/:id', validateObjectId('id', 'booking ID'), controller.getBooking);
router.get('/bookings/:id/trip-otp', validateObjectId('id', 'booking ID'), controller.getTripOtp);
router.get('/bookings/:id/invoice', validateObjectId('id', 'booking ID'), controller.getInvoice);
router.post('/bookings/:id/cancel', validateObjectId('id', 'booking ID'), validateBody(cancelBookingBody), controller.cancelBooking);
router.post('/bookings/:id/rate', validateObjectId('id', 'booking ID'), rejectEmptyBody, validateBody(rateBookingBody), controller.rateBooking);
router.post('/bookings/:id/pay', validateObjectId('id', 'booking ID'), controller.payForRide);
router.post('/payments/initiate', controller.initiateRidePayment);
router.post('/bookings/:id/payments/initiate', validateObjectId('id', 'booking ID'), controller.initiateRidePayment);
router.post('/payments/verify', rejectEmptyBody, validateBody(paymentVerifyBody), controller.verifyRidePayment);
router.get('/payments/status/:txnId', controller.getRidePaymentStatus);
router.get('/places/saved', controller.savedPlaces);
router.post('/places/saved', rejectEmptyBody, validateBody(savePlaceBody), controller.savePlace);
router.get('/wallet', controller.wallet);
router.get('/wallet/transactions', validateQuery(bookingsQuery), controller.transactions);
router.get('/rides/:id/messages', validateObjectId('id', 'ride ID'), controller.getMessages);
router.post('/rides/:id/messages', validateObjectId('id', 'ride ID'), rejectEmptyBody, validateBody(sendMessageBody), controller.sendMessage);

module.exports = router;
