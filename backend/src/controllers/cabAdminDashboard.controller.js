const cabAdminService = require('../services/cabAdminDashboard.service');
const subscriptionController = require('./subscriptionController');
const CabAdminController = require('./CabAdminController');

function ok(res, data, message = 'Success', extra = {}) {
  return res.status(200).json({ success: true, message, data, ...extra });
}

function fail(res, err, status = 500) {
  const message = err?.message || 'Request failed';
  return res.status(status).json({ success: false, message });
}

const stubUser = (req, _res, next) => {
  req.user = req.user || { _id: null };
  next();
};

exports.getDashboard = async (req, res) => {
  try {
    const data = await cabAdminService.getDashboardStats();
    return ok(res, data, 'Cab dashboard stats retrieved');
  } catch (err) {
    return fail(res, err);
  }
};

exports.getDrivers = async (req, res) => {
  try {
    const result = await cabAdminService.listDrivers(req.query);
    return ok(res, result.items, 'Drivers retrieved', { pagination: result.pagination });
  } catch (err) {
    return fail(res, err);
  }
};

exports.patchDriver = async (req, res) => {
  try {
    const data = await cabAdminService.updateDriverStatus(req.params.id, req.body);
    return ok(res, data, 'Driver updated');
  } catch (err) {
    return fail(res, err, err.message === 'Driver not found' ? 404 : 500);
  }
};

exports.getDriverAnalytics = async (req, res) => {
  try {
    const data = await cabAdminService.getDriverAnalytics(req.params.id);
    return ok(res, data, 'Driver analytics retrieved');
  } catch (err) {
    return fail(res, err);
  }
};

exports.getDriverDetails = async (req, res) => {
  try {
    const data = await cabAdminService.getDriverDetails(req.params.id);
    return ok(res, data, 'Driver details retrieved');
  } catch (err) {
    return fail(res, err, err.message === 'Driver not found' ? 404 : 500);
  }
};

exports.getVehicleDetails = async (req, res) => {
  try {
    const data = await cabAdminService.getVehicleDetails(req.params.id);
    return ok(res, data, 'Vehicle details retrieved');
  } catch (err) {
    return fail(res, err, err.message === 'Vehicle not found' ? 404 : 500);
  }
};

exports.getDocumentDetails = async (req, res) => {
  try {
    const data = await cabAdminService.getDocumentDetails(req.params.id);
    return ok(res, data, 'Document details retrieved');
  } catch (err) {
    return fail(res, err, err.message === 'Document not found' ? 404 : 500);
  }
};

exports.requestDocumentReupload = async (req, res) => {
  try {
    const data = await cabAdminService.requestDocumentReupload(req.params.id, req.body.reason);
    return ok(res, data, 'Re-upload requested');
  } catch (err) {
    return fail(res, err, err.message === 'Document not found' ? 404 : 500);
  }
};

exports.deleteDriverDocument = async (req, res) => {
  try {
    const data = await cabAdminService.deleteDriverDocument(req.params.id);
    return ok(res, data, 'Document deleted successfully');
  } catch (err) {
    return fail(res, err, err.message === 'Document not found' ? 404 : 500);
  }
};

exports.getVerificationHistory = async (req, res) => {
  try {
    const result = await cabAdminService.listVerificationHistory(req.query);
    return ok(res, result.items, 'Verification history retrieved', { pagination: result.pagination });
  } catch (err) {
    return fail(res, err);
  }
};

exports.deleteVerificationHistory = async (req, res) => {
  try {
    await cabAdminService.deleteVerificationHistory(req.params.id);
    return ok(res, { deleted: true }, 'History record deleted');
  } catch (err) {
    return fail(res, err, err.message === 'History record not found' ? 404 : 500);
  }
};

exports.reverifyFromHistory = async (req, res) => {
  try {
    const data = await cabAdminService.reverifyFromHistory(req.params.id);
    return ok(res, data, 'Re-verification initiated');
  } catch (err) {
    return fail(res, err, err.message === 'History record not found' ? 404 : 500);
  }
};

exports.getRideDetails = async (req, res) => {
  try {
    const data = await cabAdminService.getRideDetails(req.params.id);
    return ok(res, data, 'Ride details retrieved');
  } catch (err) {
    return fail(res, err, err.message === 'Ride not found' ? 404 : 500);
  }
};

exports.cancelRide = async (req, res) => {
  try {
    const data = await cabAdminService.cancelRide(req.params.id, req.body.reason);
    return ok(res, data, 'Ride cancelled');
  } catch (err) {
    return fail(res, err, err.message === 'Ride not found' ? 404 : 500);
  }
};

exports.getLiveFleet = async (req, res) => {
  try {
    const data = await cabAdminService.getLiveFleet(req.query);
    return ok(res, data, 'Live fleet retrieved');
  } catch (err) {
    return fail(res, err);
  }
};

exports.getCustomers = async (req, res) => {
  try {
    const result = await cabAdminService.listCustomers(req.query);
    return ok(res, result.items, 'Customers retrieved', { pagination: result.pagination });
  } catch (err) {
    return fail(res, err);
  }
};

exports.getCustomerDetails = async (req, res) => {
  try {
    const data = await cabAdminService.getCustomerDetails(req.params.id);
    return ok(res, data, 'Customer details retrieved');
  } catch (err) {
    return fail(res, err, err.message === 'Customer not found' ? 404 : 500);
  }
};

exports.getRides = async (req, res) => {
  try {
    const result = await cabAdminService.listRides(req.query);
    return ok(res, result.items, 'Rides retrieved', { pagination: result.pagination });
  } catch (err) {
    return fail(res, err);
  }
};

exports.getSubscriptions = async (req, res) => {
  try {
    const result = await cabAdminService.listSubscriptions(req.query);
    return ok(res, result.items, 'Subscriptions retrieved', { pagination: result.pagination });
  } catch (err) {
    return fail(res, err);
  }
};

exports.getSubscriptionHistory = async (req, res) => {
  try {
    const result = await cabAdminService.listSubscriptionHistory(req.query);
    return ok(res, result.items, 'Subscription history retrieved', { pagination: result.pagination });
  } catch (err) {
    return fail(res, err);
  }
};

exports.getSubscriptionPlans = async (req, res) => {
  try {
    const result = await cabAdminService.listSubscriptionPlans(req.query);
    return ok(res, result.items, 'Subscription plans retrieved', { pagination: result.pagination });
  } catch (err) {
    return fail(res, err);
  }
};

exports.createSubscriptionPlan = subscriptionController.createPlan;
exports.updateSubscriptionPlan = subscriptionController.updatePlan;
exports.toggleSubscriptionPlan = subscriptionController.togglePlanStatus;
exports.deleteSubscriptionPlan = subscriptionController.safeDeletePlan;
exports.expireSubscription = async (req, res) => {
  try {
    const data = await cabAdminService.expireSubscription(req.params.id);
    return ok(res, data, 'Subscription expired');
  } catch (err) {
    return fail(res, err, err.message === 'Subscription not found' ? 404 : 500);
  }
};

exports.getWallets = async (req, res) => {
  try {
    const result = await cabAdminService.listWallets(req.query);
    return ok(res, result.items, 'Wallets retrieved', { pagination: result.pagination });
  } catch (err) {
    return fail(res, err);
  }
};

exports.getWalletTransactions = async (req, res) => {
  try {
    const result = await cabAdminService.listWalletTransactions(req.query);
    return ok(res, result.items, 'Wallet transactions retrieved', { pagination: result.pagination });
  } catch (err) {
    return fail(res, err);
  }
};

exports.getPendingVerifications = async (req, res) => {
  try {
    const data = await cabAdminService.listPendingVerifications();
    return ok(res, data, 'Pending verifications retrieved');
  } catch (err) {
    return fail(res, err);
  }
};

exports.verifyDriverDocument = async (req, res) => {
  try {
    const { status, reason } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    const data = await cabAdminService.verifyDriverDocument(req.params.id, { status, reason });
    return ok(res, data, `Document ${status}`);
  } catch (err) {
    return fail(res, err, err.message === 'Document not found' ? 404 : 500);
  }
};

exports.verifyDriverProfile = async (req, res) => {
  try {
    const { status, reason } = req.body;
    if (!['approved', 'rejected', 'under_review'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    const profileStatus = status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'under_review';
    const data = await cabAdminService.updateDriverStatus(req.params.id, {
      isVerified: status === 'approved',
      profileVerificationStatus: profileStatus,
      profileRejectionReason: reason,
    });
    return ok(res, data, `Profile ${status}`);
  } catch (err) {
    return fail(res, err, err.message === 'Driver not found' ? 404 : 500);
  }
};

exports.verifyVehicle = async (req, res) => {
  try {
    const { status, reason } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    const data = await cabAdminService.verifyVehicle(req.params.id, { status, reason });
    return ok(res, data, `Vehicle ${status}`);
  } catch (err) {
    return fail(res, err, err.message === 'Vehicle not found' ? 404 : 500);
  }
};

exports.getReports = async (req, res) => {
  try {
    const data = await cabAdminService.getReports(req.query.period);
    return ok(res, data, 'Reports retrieved');
  } catch (err) {
    return fail(res, err);
  }
};

exports.getAdmins = async (req, res) => {
  try {
    const data = await cabAdminService.listAdmins();
    return ok(res, data, 'Admins retrieved');
  } catch (err) {
    return fail(res, err);
  }
};

exports.createAdmin = async (req, res) => {
  try {
    const data = await cabAdminService.createAdmin(req.body);
    return res.status(201).json({ success: true, message: 'Admin created', data });
  } catch (err) {
    return fail(res, err, err.message === 'Admin already exists' ? 409 : 500);
  }
};

exports.updateAdmin = async (req, res) => {
  try {
    const data = await cabAdminService.updateAdmin(req.params.id, req.body);
    return ok(res, data, 'Admin updated');
  } catch (err) {
    return fail(res, err, err.message === 'Admin not found' ? 404 : 500);
  }
};

exports.deleteAdmin = async (req, res) => {
  try {
    await cabAdminService.deleteAdmin(req.params.id);
    return ok(res, { deleted: true }, 'Admin deleted');
  } catch (err) {
    return fail(res, err, err.message === 'Admin not found' ? 404 : 500);
  }
};

exports.getAllVehicles = CabAdminController.getAllVehicles;
exports.getPendingVehicles = CabAdminController.getPendingVehicles;
exports.verifyVehicleDocument = CabAdminController.verifyDocument;

exports.stubUser = stubUser;
