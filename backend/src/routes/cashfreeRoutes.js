
const express = require('express');
const router = express.Router();
const cashfreeController = require('../controllers/cashfreeController');
const { authenticate } = require('../middleware/auth');

// ─── Public / Cashfree-callback routes (no user auth needed) ─────────────────
// Cashfree redirects the user browser here after payment
router.get('/success', cashfreeController.handleSuccess.bind(cashfreeController));
router.get('/failure', cashfreeController.handleFailure.bind(cashfreeController));

// Cashfree server-to-server webhook (no user session available)
router.post('/webhook', cashfreeController.handleWebhook.bind(cashfreeController));

// ─── Authenticated routes ─────────────────────────────────────────────────────
// Initiate a new Cashfree payment session for a booking
router.post('/initiate', authenticate, cashfreeController.initiatePayment.bind(cashfreeController));

// On-demand order verification (called by React app after redirect)
router.post('/verify', authenticate, cashfreeController.verifyPayment.bind(cashfreeController));

// Config sanity check (admin/dev convenience)
router.get('/test', authenticate, cashfreeController.testConfig.bind(cashfreeController));

module.exports = router;