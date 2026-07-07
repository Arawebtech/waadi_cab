const authService = require('../services/auth.service');
const kycService = require('../services/kyc.service');
const subscriptionService = require('../services/subscription.service');
const adminService = require('../services/admin.service');
const matchingService = require('../services/matching.service');
const cloudinaryService = require('../services/cloudinary.service');
const { success, asyncHandler } = require('../utils/apiResponse');

exports.getKycStatus = asyncHandler(async (req, res) => {
  const data = await kycService.getKycStatus(req.user._id);
  return success(res, data);
});

exports.updatePersonalInfo = asyncHandler(async (req, res) => {
  const data = await kycService.updatePersonalInfo(req.user._id, req.body);
  return success(res, data);
});

exports.uploadDocument = asyncHandler(async (req, res) => {
  const { docType } = req.body;
  if (!req.file) return res.status(400).json({ success: false, message: 'File required' });
  const data = await kycService.uploadDocument(req.user._id, docType, req.file);
  return success(res, data, 'Document uploaded');
});

exports.updateVehicleInfo = asyncHandler(async (req, res) => {
  const data = await kycService.updateVehicleInfo(req.user._id, req.body);
  return success(res, data);
});

exports.acceptTerms = asyncHandler(async (req, res) => {
  const data = await kycService.acceptTerms(req.user._id);
  return success(res, data);
});

exports.submitKyc = asyncHandler(async (req, res) => {
  const data = await kycService.submitKyc(req.user._id);
  return success(res, data, 'KYC submitted for review');
});

exports.getPlans = asyncHandler(async (_req, res) => {
  const data = await subscriptionService.getActivePlans();
  return success(res, data);
});

exports.getCurrentSubscription = asyncHandler(async (req, res) => {
  const data = await subscriptionService.getCurrentSubscription(req.user._id);
  const summary = await subscriptionService.getSubscriptionSummary(req.user._id);
  const rider = await authService.enrichRiderProfile(req.user);
  return success(res, { subscription: data, summary, rider });
});

exports.purchaseSubscription = asyncHandler(async (req, res) => {
  const data = await subscriptionService.purchasePlan(req.user._id, req.body.planId, req.body.paymentMethod);
  return success(res, data, 'Subscription activated', 201);
});

exports.subscriptionHistory = asyncHandler(async (req, res) => {
  const data = await subscriptionService.getHistory(req.user._id);
  return success(res, data);
});

exports.uploadProfileImage = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'File required' });
  const uploaded = await cloudinaryService.uploadDocument({
    buffer: req.file.buffer,
    mimetype: req.file.mimetype,
    docType: 'profile',
    resourceId: req.user._id.toString(),
  });
  const { Customer } = require('../models');
  const customer = await Customer.findByIdAndUpdate(
    req.user._id,
    { profileImage: uploaded },
    { new: true }
  );
  return success(res, authService.sanitizeCustomer(customer));
});

// Admin
exports.adminDashboard = asyncHandler(async (_req, res) => success(res, await adminService.dashboardStats()));
exports.adminPlans = asyncHandler(async (_req, res) => success(res, await adminService.listPlans()));
exports.adminCreatePlan = asyncHandler(async (req, res) => success(res, await adminService.createPlan(req.body), 'Plan created', 201));
exports.adminUpdatePlan = asyncHandler(async (req, res) => success(res, await adminService.updatePlan(req.params.id, req.body)));
exports.adminDeletePlan = asyncHandler(async (req, res) => { await adminService.deletePlan(req.params.id); return success(res, {}); });
exports.adminSubscriptionReports = asyncHandler(async (_req, res) => success(res, await adminService.subscriptionReports()));
exports.adminPendingRiders = asyncHandler(async (_req, res) => success(res, await adminService.getPendingRiders()));
exports.adminApproveRider = asyncHandler(async (req, res) => success(res, await adminService.approveRider(req.params.id, req.user._id)));
exports.adminRejectRider = asyncHandler(async (req, res) => success(res, await adminService.rejectRider(req.params.id, req.user._id, req.body.reason)));
exports.adminRiderDocuments = asyncHandler(async (req, res) => success(res, await adminService.getRiderDocuments(req.params.id)));
exports.adminCustomers = asyncHandler(async (req, res) => success(res, await adminService.listCustomers(req.query)));
exports.adminRiders = asyncHandler(async (req, res) => success(res, await adminService.listRiders(req.query)));
exports.adminRiderDetail = asyncHandler(async (req, res) => success(res, await adminService.getRiderDetail(req.params.id)));
exports.adminForceOffline = asyncHandler(async (req, res) => success(res, await adminService.forceRiderOffline(req.params.id, req.user._id)));
exports.adminDocuments = asyncHandler(async (req, res) => success(res, await adminService.listDocuments(req.query)));
exports.adminApproveDocument = asyncHandler(async (req, res) => success(res, await adminService.approveDocument(req.params.id, req.user._id, req.body.reviewNotes)));
exports.adminRejectDocument = asyncHandler(async (req, res) => success(res, await adminService.rejectDocument(req.params.id, req.user._id, req.body.reason, req.body.reviewNotes)));
exports.adminBankDetails = asyncHandler(async (req, res) => success(res, await adminService.listBankDetails(req.query)));
exports.adminBankDetail = asyncHandler(async (req, res) => success(res, await adminService.getBankDetail(req.params.riderId)));
exports.adminApproveBank = asyncHandler(async (req, res) => success(res, await adminService.approveBank(req.params.riderId, req.user._id)));
exports.adminRejectBank = asyncHandler(async (req, res) => success(res, await adminService.rejectBank(req.params.riderId, req.user._id, req.body.reason)));
exports.adminVehicles = asyncHandler(async (req, res) => success(res, await adminService.listVehicles(req.query)));
exports.adminVehicleDetail = asyncHandler(async (req, res) => success(res, await adminService.getVehicleDetail(req.params.id)));
exports.adminApproveVehicle = asyncHandler(async (req, res) => success(res, await adminService.approveVehicle(req.params.id, req.user._id)));
exports.adminRejectVehicle = asyncHandler(async (req, res) =>
  success(res, await adminService.rejectVehicle(req.params.id, req.user._id, req.body.reason))
);
exports.adminSubscriptions = asyncHandler(async (req, res) => success(res, await adminService.listSubscriptions(req.query)));
exports.adminRiderSubscriptions = asyncHandler(async (req, res) =>
  success(res, await adminService.getRiderSubscriptions(req.params.id))
);
exports.adminDriverLocations = asyncHandler(async (_req, res) => success(res, await adminService.listDriverLocations()));
exports.adminSuspendCustomer = asyncHandler(async (req, res) => success(res, await adminService.setCustomerStatus(req.params.id, 'suspended')));
exports.adminActivateCustomer = asyncHandler(async (req, res) => success(res, await adminService.setCustomerStatus(req.params.id, 'active')));
exports.adminSuspendRider = asyncHandler(async (req, res) => success(res, await adminService.setRiderStatus(req.params.id, 'suspended', req.user._id)));
exports.adminActivateRider = asyncHandler(async (req, res) => success(res, await adminService.setRiderStatus(req.params.id, 'active', req.user._id)));
exports.adminBookings = asyncHandler(async (req, res) => success(res, await adminService.listBookings(req.query)));
exports.adminLiveRiders = asyncHandler(async (_req, res) => success(res, await matchingService.getOnlineRiderLocations()));
exports.adminRevenueAnalytics = asyncHandler(async (_req, res) => success(res, await adminService.revenueAnalytics()));
exports.adminDriverPerformance = asyncHandler(async (_req, res) => success(res, await adminService.driverPerformance()));
