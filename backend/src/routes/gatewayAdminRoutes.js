/**
 * gatewayAdminRoutes.js
 *
 * Mounted in server.js under /api/v1/admin/payment-gateway
 * (nested inside the existing adminRoutes mount or added alongside it).
 *
 * How to mount in server.js:
 *   const gatewayAdminRoutes = require('./src/routes/gatewayAdminRoutes');
 *   app.use('/api/v1/admin/payment-gateway', gatewayAdminRoutes);
 *
 * All routes require isAdmin middleware (same as your existing adminRoutes).
 */

const express = require('express');
const router = express.Router();
const gatewayAdminController = require('../controllers/gatewayAdminController');
// const {   authenticate } = require('../middleware/auth'); // adjust path if needed

// Apply auth + admin guard to all routes in this file
// router.use(authenticate);

// GET  /admin/payment-gateway         – full config (masked secrets)
router.get('/', gatewayAdminController.getConfig.bind(gatewayAdminController));

// GET  /admin/payment-gateway/active  – lightweight active-gateway info (used by checkout)
router.get('/active', gatewayAdminController.getActiveGateway.bind(gatewayAdminController));

// POST /admin/payment-gateway/switch  – { gateway: 'payu'|'cashfree' }
router.post('/switch', gatewayAdminController.switchGateway.bind(gatewayAdminController));

// PUT  /admin/payment-gateway/cashfree – save Cashfree credentials
router.put('/cashfree', gatewayAdminController.updateCashfreeConfig.bind(gatewayAdminController));

// PUT  /admin/payment-gateway/payu    – optionally override PayU credentials in DB
router.put('/payu', gatewayAdminController.updatePayuConfig.bind(gatewayAdminController));
router.put('/razorpay', gatewayAdminController.updateRazorpayConfig.bind(gatewayAdminController));

module.exports = router;