const express = require('express');
const router = express.Router();
const controller = require('../controllers/subscriptionController');
const { authenticate, authorize } = require('../middleware/auth');
const {
  validateBody,
  validateQuery,
  validateParams,
  validateObjectId,
} = require('../middleware/validate.middleware');
const {
  purchaseBody,
  renewBody,
  paymentSuccessBody,
  paymentFailedBody,
  cancelBody,
  createPlanBody,
  updatePlanBody,
  plansQuery,
} = require('../validations/subscription.validation');
const Joi = require('joi');

const driverAuth = authorize('driver', 'owner');
const adminAuth = authorize('agent');

router.get('/plans', authenticate, driverAuth, validateQuery(plansQuery), controller.getPlans);

router.post('/purchase', authenticate, driverAuth, validateBody(purchaseBody), controller.createSubscriptionPayment);
router.post('/purchase/testing', authenticate, driverAuth, validateBody(purchaseBody), controller.purchasePlanTesting);
router.post('/purchase/wallet', authenticate, driverAuth, validateBody(purchaseBody), controller.purchaseByWallet);
router.post('/renew', authenticate, driverAuth, validateBody(renewBody), controller.renewSubscription);
router.post('/payment/success', authenticate, driverAuth, validateBody(paymentSuccessBody), controller.handlePaymentSuccess);
router.post('/payment/failed', authenticate, driverAuth, validateBody(paymentFailedBody), controller.handlePaymentFailed);
router.get('/me', authenticate, driverAuth, controller.getMySubscription);
router.get('/check-status', authenticate, driverAuth, controller.checkSubscriptionStatus);
router.get('/history', authenticate, driverAuth, validateQuery(plansQuery), controller.getMySubscriptionHistory);
router.patch('/cancel', authenticate, driverAuth, validateBody(cancelBody), controller.cancelSubscription);

router.post('/admin/plans', authenticate, adminAuth, validateBody(createPlanBody), controller.createPlan);
router.get('/admin/plans', authenticate, adminAuth, validateQuery(plansQuery), controller.getAllPlansAdmin);
router.put('/admin/plans/:id', authenticate, adminAuth, validateObjectId('id', 'plan ID'), validateBody(updatePlanBody), controller.updatePlan);
router.delete('/admin/plans/:id', authenticate, adminAuth, validateObjectId('id', 'plan ID'), controller.safeDeletePlan);
router.patch(
  '/admin/plans/:id/status',
  authenticate,
  adminAuth,
  validateObjectId('id', 'plan ID'),
  validateBody(Joi.object({ isActive: Joi.boolean().required() })),
  controller.togglePlanStatus
);

router.get('/admin', authenticate, adminAuth, controller.getAllSubscriptionsAdmin);
router.get('/admin/:id', authenticate, adminAuth, validateObjectId('id', 'subscription ID'), controller.getSubscriptionByIdAdmin);
router.patch('/admin/:id/expire', authenticate, adminAuth, validateObjectId('id', 'subscription ID'), controller.expireSubscriptionById);
router.get('/admin/history', authenticate, adminAuth, validateQuery(plansQuery), controller.getAllSubscriptionHistoryAdmin);
router.get('/admin/stats', authenticate, adminAuth, controller.getSubscriptionStats);

module.exports = router;
