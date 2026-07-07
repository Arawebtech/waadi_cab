const express = require('express');
const rateLimit = require('express-rate-limit');
const env = require('../config/env');
const authController = require('../controllers/auth.controller');
const bookingController = require('../controllers/booking.controller');
const platformController = require('../controllers/platform.controller');
const paymentController = require('../controllers/payment.controller');
const joiSchemas = require('../validations/joi.schemas');
const { authenticate, authorize, requireAdmin } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const upload = require('../middleware/upload.middleware');
const authValidation = require('../validations/auth.validation');
const bookingValidation = require('../validations/booking.validation');

const router = express.Router();

const { fail } = require('../utils/apiResponse');

const otpLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.otpMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many OTP requests. Try again later.' },
  handler: (req, res) => {
    fail(res, 'Too many OTP requests. Try again later.', 429);
  },
});

const otpVerifyLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.otpMax * 2,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    fail(res, 'Too many verification attempts. Try again later.', 429);
  },
});

const adminLoginLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.otpMax,
  message: { success: false, message: 'Too many login attempts' },
});


router.get('/vehicle-types', bookingController.vehicleTypes);
router.get('/intercity-packages', bookingController.intercityPackages);
router.get('/coupons', bookingController.coupons);
router.get('/subscription/plans', platformController.getPlans);
router.post('/fare/estimate', bookingValidation.fareEstimate, validate, bookingController.fareEstimate);
router.get('/routes/directions', bookingController.getDirections);

router.use(authenticate);


router.post('/bookings', authorize('customer'), bookingValidation.createBooking, validate, bookingController.createBooking);
router.get('/bookings/mine', authorize('customer'), bookingController.myBookings);
router.get('/bookings/:id', bookingController.getBooking);
router.get('/bookings/:id/trip-otp', authorize('customer'), bookingController.getTripOtp);
router.patch('/bookings/:id/status', bookingController.updateStatus);
router.post('/bookings/:id/cancel', bookingController.cancelBooking);
router.post('/bookings/:id/rate', authorize('customer'), bookingController.rateBooking);
router.get('/places/saved', authorize('customer'), bookingController.savedPlaces);
router.post('/places/saved', authorize('customer'), bookingController.savePlace);
router.get('/places/search', bookingController.searchPlaces);
router.get('/places/geocode', bookingController.geocodeAddress);
router.get('/drivers/nearby', bookingController.nearbyDrivers);
router.get('/drivers/live', paymentController.liveDrivers);

router.get('/wallet', bookingController.wallet);
router.get('/wallet/transactions', bookingController.transactions);
router.post('/wallet/withdraw', authorize('driver'), bookingController.withdraw);

router.post('/payments/create-order', joiSchemas.payment.createOrder, paymentController.createOrder);
router.post('/payments/verify', joiSchemas.payment.verify, paymentController.verifyPayment);
router.post('/payments/dev-verify', paymentController.devVerify);

router.get('/notifications', bookingController.notifications);
router.patch('/notifications/:id/read', bookingController.markNotificationRead);

router.get('/driver/profile', authorize('driver'), bookingController.driverProfile);
router.patch('/driver/online', authorize('driver'), joiSchemas.driver.setOnline, bookingController.driverOnline);
router.get('/driver/earnings', authorize('driver'), bookingController.driverEarnings);
router.get('/driver/requests', authorize('driver'), bookingController.driverRequests);
router.post('/driver/bookings/:id/accept', authorize('driver'), bookingController.acceptBooking);
router.get('/driver/bookings', authorize('driver'), bookingController.driverBookings);
router.patch('/driver/bank', authorize('driver'), joiSchemas.driver.updateBank, bookingController.updateBankDetails);

router.get('/kyc/status', authorize('driver'), platformController.getKycStatus);
router.patch('/kyc/personal', authorize('driver'), platformController.updatePersonalInfo);
router.post('/kyc/document', authorize('driver'), upload.single('file'), platformController.uploadDocument);
router.patch('/kyc/vehicle', authorize('driver'), platformController.updateVehicleInfo);
router.post('/kyc/terms', authorize('driver'), platformController.acceptTerms);
router.post('/kyc/submit', authorize('driver'), platformController.submitKyc);

router.get('/subscription/current', authorize('driver'), platformController.getCurrentSubscription);
router.post('/subscription/purchase', authorize('driver'), platformController.purchaseSubscription);
router.get('/subscription/history', authorize('driver'), platformController.subscriptionHistory);

router.use(requireAdmin);

router.get('/admin/dashboard', platformController.adminDashboard);
router.get('/admin/plans', platformController.adminPlans);
router.post('/admin/plans', platformController.adminCreatePlan);
router.patch('/admin/plans/:id', platformController.adminUpdatePlan);
router.delete('/admin/plans/:id', platformController.adminDeletePlan);
router.get('/admin/subscriptions/reports', platformController.adminSubscriptionReports);
router.get('/admin/riders/pending', platformController.adminPendingRiders);
router.post('/admin/riders/:id/approve', platformController.adminApproveRider);
router.post('/admin/riders/:id/reject', platformController.adminRejectRider);
router.get('/admin/riders/:id/documents', platformController.adminRiderDocuments);
router.get('/admin/customers', platformController.adminCustomers);
router.get('/admin/riders', platformController.adminRiders);
router.get('/admin/riders/:id', platformController.adminRiderDetail);
router.post('/admin/riders/:id/force-offline', platformController.adminForceOffline);
router.get('/admin/documents', platformController.adminDocuments);
router.post('/admin/documents/:id/approve', platformController.adminApproveDocument);
router.post('/admin/documents/:id/reject', platformController.adminRejectDocument);
router.get('/admin/bank-details', platformController.adminBankDetails);
router.get('/admin/bank-details/:driverId', platformController.adminBankDetail);
router.post('/admin/bank-details/:driverId/approve', platformController.adminApproveBank);
router.post('/admin/bank-details/:driverId/reject', platformController.adminRejectBank);
router.get('/admin/vehicles', platformController.adminVehicles);
router.get('/admin/vehicles/:id', platformController.adminVehicleDetail);
router.post('/admin/vehicles/:id/approve', platformController.adminApproveVehicle);
router.post('/admin/vehicles/:id/reject', platformController.adminRejectVehicle);
router.get('/admin/subscriptions', platformController.adminSubscriptions);
router.get('/admin/riders/:id/subscriptions', platformController.adminRiderSubscriptions);
router.get('/admin/driver-locations', platformController.adminDriverLocations);
router.post('/admin/customers/:id/suspend', platformController.adminSuspendCustomer);
router.post('/admin/customers/:id/activate', platformController.adminActivateCustomer);
router.post('/admin/riders/:id/suspend', platformController.adminSuspendRider);
router.post('/admin/riders/:id/activate', platformController.adminActivateRider);
router.get('/admin/bookings', platformController.adminBookings);
router.get('/admin/riders/live', platformController.adminLiveRiders);
router.get('/admin/analytics/revenue', platformController.adminRevenueAnalytics);
router.get('/admin/analytics/drivers', platformController.adminDriverPerformance);

module.exports = router;
