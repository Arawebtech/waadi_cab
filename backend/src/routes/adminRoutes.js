const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const cabAdminController = require('../controllers/cabAdminDashboard.controller');
const customerLogs = require('../controllers/customerLogsController');
const logController = require('../controllers/logController');
const InsuranceInquiry = require('../models/InsuranceInquiry');
const CabBooking = require('../models/CabBooking');
const {
  validateBody,
  validateQuery,
  validateParams,
  validateObjectId,
  rejectEmptyBody,
  handleUploadErrors,
} = require('../middleware/validate.middleware');
const {
  adminBookingsQuery,
  adminCreateBookingBody,
  adminUpdateBookingBody,
  bulkStateReferenceBody,
  analyticsQuery,
  adminUsersQuery,
  insuranceInquiriesQuery,
  updateInsuranceInquiryBody,
  auditTrailQuery,
  systemLogsQuery,
  journeyReportQuery,
  cabDriversQuery,
  cabCustomersQuery,
  cabRidesQuery,
  cabSubscriptionsQuery,
  cabSubscriptionHistoryQuery,
  cabWalletsQuery,
  cabWalletTransactionsQuery,
  cabReportsQuery,
  cabLiveFleetQuery,
  verificationStatusBody,
  profileVerificationBody,
  patchDriverBody,
  cancelRideBody,
  reuploadDocumentBody,
  documentIdParam,
  vehicleDocumentTypeParam,
  cabVehiclesQuery,
  createAdminBody,
  updateAdminBody,
  createPlanBody,
  updatePlanBody,
  plansQuery,
  togglePlanStatusBody,
} = require('../validations/admin.validation');
const {
  adminCabBookingsQuery,
  createLegacyCabBookingBody,
  updateLegacyCabBookingBody,
} = require('../validations/cab-booking.validation');

router.get('/dashboard', adminController.getDashboardStats);
router.get('/analytics', validateQuery(analyticsQuery), adminController.getAnalytics);
router.get('/customer-logs', customerLogs.getLogs);
router.get('/audit-trail', validateQuery(auditTrailQuery), logController.getAuditTrail.bind(logController));
router.get('/audit-trail/report', validateQuery(journeyReportQuery), logController.downloadJourneyReportPdf.bind(logController));
router.get('/system-logs', validateQuery(systemLogsQuery), logController.getSystemLogs.bind(logController));

router.get('/bookings', validateQuery(adminBookingsQuery), adminController.getAllBookings);
router.post('/bookings', rejectEmptyBody, validateBody(adminCreateBookingBody), adminController.createBooking);
router.put('/bookings/bulk/state-reference', rejectEmptyBody, validateBody(bulkStateReferenceBody), adminController.bulkReplaceStateReference);
router.put('/bookings/:id', validateObjectId('id', 'booking ID'), rejectEmptyBody, validateBody(adminUpdateBookingBody), adminController.updateBooking);
router.get('/bookings/:id/pdf', validateObjectId('id', 'booking ID'), adminController.downloadTaxSlipPdf);
router.get('/bookings/:id/pdf-info', validateObjectId('id', 'booking ID'), adminController.getTaxSlipPdfInfo);
router.post(
  '/bookings/:id/upload-pdf',
  validateObjectId('id', 'booking ID'),
  adminController.uploadTaxSlipPdfMiddleware,
  handleUploadErrors,
  adminController.uploadTaxSlipPdf
);

router.get('/cab-bookings', validateQuery(adminCabBookingsQuery), async (req, res) => {
  try {
    const { page, limit, status, search } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { from_location: { $regex: search, $options: 'i' } },
        { to_location: { $regex: search, $options: 'i' } },
      ];
    }
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await CabBooking.countDocuments(filter);
    const pages = Math.ceil(total / parseInt(limit, 10));
    const items = await CabBooking.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit, 10));
    res.json({
      success: true,
      message: 'Cab bookings retrieved',
      data: items,
      pagination: { total, page: parseInt(page, 10), limit: parseInt(limit, 10), pages },
    });
  } catch (e) {
    console.error('Admin get cab bookings error:', e);
    res.status(500).json({ success: false, message: 'Failed to retrieve cab bookings' });
  }
});

router.post('/cab-bookings', rejectEmptyBody, validateBody(createLegacyCabBookingBody), async (req, res) => {
  try {
    const { from_location, to_location, start_date, trip_type, return_date, notes } = req.body;
    const doc = await CabBooking.create({ from_location, to_location, start_date, trip_type, return_date, notes });
    res.status(201).json({ success: true, message: 'Cab booking created', data: doc });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to create cab booking' });
  }
});

router.put('/cab-bookings/:id', validateObjectId('id', 'cab booking ID'), rejectEmptyBody, validateBody(updateLegacyCabBookingBody), async (req, res) => {
  try {
    const { id } = req.params;
    const allowed = ['status', 'assigned_driver_id', 'assigned_driver_phone', 'notes'];
    const updates = {};
    Object.keys(req.body).forEach((k) => {
      if (allowed.includes(k)) updates[k] = req.body[k];
    });
    const doc = await CabBooking.findByIdAndUpdate(id, updates, { new: true });
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Cab booking updated', data: doc });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to update cab booking' });
  }
});

router.get('/insurance-inquiries', validateQuery(insuranceInquiriesQuery), async (req, res) => {
  try {
    const { page, limit, search, status, dateFrom, dateTo } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { vehicle_number: { $regex: search, $options: 'i' } },
        { phone_number: { $regex: search, $options: 'i' } },
      ];
    }

    if (dateFrom || dateTo) {
      const start = dateFrom ? new Date(`${dateFrom}T00:00:00+05:30`) : null;
      const end = dateTo ? new Date(`${dateTo}T23:59:59.999+05:30`) : null;

      filter.createdAt = {};
      if (start) filter.createdAt.$gte = start;
      if (end) filter.createdAt.$lte = end;
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await InsuranceInquiry.countDocuments(filter);
    const pages = Math.ceil(total / parseInt(limit, 10));
    const inquiries = await InsuranceInquiry.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));
    res.status(200).json({
      success: true,
      message: 'Inquiries retrieved',
      data: inquiries,
      pagination: { total, page: parseInt(page, 10), limit: parseInt(limit, 10), pages },
    });
  } catch (error) {
    console.error('Get insurance inquiries error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve insurance inquiries' });
  }
});

router.put('/insurance-inquiries/:id', validateObjectId('id', 'inquiry ID'), rejectEmptyBody, validateBody(updateInsuranceInquiryBody), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const inquiry = await InsuranceInquiry.findByIdAndUpdate(id, { status }, { new: true });
    if (!inquiry) return res.status(404).json({ success: false, message: 'Inquiry not found' });
    res.status(200).json({ success: true, message: 'Inquiry updated', data: inquiry });
  } catch (error) {
    console.error('Update insurance inquiry error:', error);
    res.status(500).json({ success: false, message: 'Failed to update insurance inquiry' });
  }
});

router.get('/users', validateQuery(adminUsersQuery), adminController.getAllUsers);
router.get('/states', adminController.getAllStatesWithStats);

router.get('/cab/dashboard', cabAdminController.getDashboard);
router.get('/cab/reports', validateQuery(cabReportsQuery), cabAdminController.getReports);

router.get('/cab/drivers', validateQuery(cabDriversQuery), cabAdminController.getDrivers);
router.get('/cab/drivers/:id/details', validateObjectId('id', 'driver ID'), cabAdminController.getDriverDetails);
router.patch('/cab/drivers/:id', validateObjectId('id', 'driver ID'), rejectEmptyBody, validateBody(patchDriverBody), cabAdminController.patchDriver);
router.get('/cab/drivers/:id/analytics', validateObjectId('id', 'driver ID'), cabAdminController.getDriverAnalytics);
router.patch('/cab/drivers/:id/profile-verification', validateObjectId('id', 'driver ID'), rejectEmptyBody, validateBody(profileVerificationBody), cabAdminController.verifyDriverProfile);

router.get('/cab/customers', validateQuery(cabCustomersQuery), cabAdminController.getCustomers);
router.get('/cab/customers/:id', validateObjectId('id', 'customer ID'), cabAdminController.getCustomerDetails);

router.get('/cab/rides', validateQuery(cabRidesQuery), cabAdminController.getRides);
router.get('/cab/rides/:id/details', validateObjectId('id', 'ride ID'), cabAdminController.getRideDetails);
router.patch('/cab/rides/:id/cancel', validateObjectId('id', 'ride ID'), rejectEmptyBody, validateBody(cancelRideBody), cabAdminController.cancelRide);

router.get('/cab/fleet/live', validateQuery(cabLiveFleetQuery), cabAdminController.getLiveFleet);

router.get('/cab/subscriptions', validateQuery(cabSubscriptionsQuery), cabAdminController.getSubscriptions);
router.get('/cab/subscription-history', validateQuery(cabSubscriptionHistoryQuery), cabAdminController.getSubscriptionHistory);
router.patch('/cab/subscriptions/:id/expire', validateObjectId('id', 'subscription ID'), cabAdminController.expireSubscription);
router.get('/cab/subscription-plans', validateQuery(plansQuery), cabAdminController.getSubscriptionPlans);
router.post('/cab/subscription-plans', rejectEmptyBody, validateBody(createPlanBody), cabAdminController.createSubscriptionPlan);
router.put('/cab/subscription-plans/:id', validateObjectId('id', 'plan ID'), rejectEmptyBody, validateBody(updatePlanBody), cabAdminController.updateSubscriptionPlan);
router.patch('/cab/subscription-plans/:id/status', validateObjectId('id', 'plan ID'), rejectEmptyBody, validateBody(togglePlanStatusBody), cabAdminController.toggleSubscriptionPlan);
router.delete('/cab/subscription-plans/:id', validateObjectId('id', 'plan ID'), cabAdminController.deleteSubscriptionPlan);

router.get('/cab/wallets', validateQuery(cabWalletsQuery), cabAdminController.getWallets);
router.get('/cab/wallet-transactions', validateQuery(cabWalletTransactionsQuery), cabAdminController.getWalletTransactions);

router.get('/cab/verifications/pending', cabAdminController.getPendingVerifications);
router.get('/cab/verifications/history', validateQuery(cabSubscriptionHistoryQuery), cabAdminController.getVerificationHistory);
router.delete('/cab/verifications/history/:id', validateObjectId('id', 'history ID'), cabAdminController.deleteVerificationHistory);
router.post('/cab/verifications/history/:id/reverify', validateObjectId('id', 'history ID'), cabAdminController.reverifyFromHistory);
router.get('/cab/documents/:id/details', validateParams(documentIdParam), cabAdminController.getDocumentDetails);
router.patch('/cab/documents/:id/verify', validateParams(documentIdParam), rejectEmptyBody, validateBody(verificationStatusBody), cabAdminController.verifyDriverDocument);
router.patch('/cab/documents/:id/reupload', validateParams(documentIdParam), validateBody(reuploadDocumentBody), cabAdminController.requestDocumentReupload);
router.delete('/cab/documents/:id', validateParams(documentIdParam), cabAdminController.deleteDriverDocument);

router.get('/cab/vehicles', validateQuery(cabVehiclesQuery), cabAdminController.getAllVehicles);
router.get('/cab/vehicles/pending', cabAdminController.getPendingVehicles);
router.get('/cab/vehicles/:id/details', validateObjectId('id', 'vehicle ID'), cabAdminController.getVehicleDetails);
router.patch('/cab/vehicles/:id/verify', validateObjectId('id', 'vehicle ID'), rejectEmptyBody, validateBody(verificationStatusBody), cabAdminController.verifyVehicle);
router.patch(
  '/cab/vehicles/:id/documents/:documentType/verify',
  validateParams(vehicleDocumentTypeParam),
  rejectEmptyBody,
  validateBody(verificationStatusBody),
  cabAdminController.stubUser,
  cabAdminController.verifyVehicleDocument
);

router.get('/cab/admins', cabAdminController.getAdmins);
router.post('/cab/admins', rejectEmptyBody, validateBody(createAdminBody), cabAdminController.createAdmin);
router.put('/cab/admins/:id', validateObjectId('id', 'admin ID'), rejectEmptyBody, validateBody(updateAdminBody), cabAdminController.updateAdmin);
router.delete('/cab/admins/:id', validateObjectId('id', 'admin ID'), cabAdminController.deleteAdmin);

module.exports = router;
