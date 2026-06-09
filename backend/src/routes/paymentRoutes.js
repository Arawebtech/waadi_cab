const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate } = require('../middleware/auth');

// POST /payment/generate-hash - Generate PayU payment hash (requires authentication)
router.post('/generate-hash', authenticate, paymentController.generateHash);

// POST /payment/verify - Verify PayU payment and create booking (requires authentication)
router.post('/verify', authenticate, paymentController.verifyPayment);

// GET /payment/status/:txnId - Check payment status by transaction ID (requires authentication)
router.get('/status/:txnId', authenticate, paymentController.getPaymentStatusByTxnId);

// POST /payment/test-hash - Test hash generation with sample data (requires authentication)
router.post('/test-hash', authenticate, paymentController.testHashGeneration);

// POST /payment/test-hash-verification - Test hash verification with JSON data (no auth required for testing)
router.post('/test-hash-verification', paymentController.testHashVerification);

// POST /payment/test-form-data - Test form data parsing (no auth required for testing)
router.post('/test-form-data', paymentController.testFormData);

// POST /payment/initiate - Initiate payment for a booking (requires authentication)
router.post('/initiate', authenticate, paymentController.initiatePayment);

// POST /payment/success - Handle PayU success callback (no auth required - PayU callback)
router.post('/success', paymentController.handlePaymentSuccess);

// POST /payment/failure - Handle PayU failure callback (no auth required - PayU callback)
router.post('/failure', paymentController.handlePaymentFailure);

// GET/POST /payment/relay - Render auto-submitting PayU form (for native apps)
router.get('/relay', paymentController.renderPayURelay);
router.post('/relay', paymentController.renderPayURelay);

// GET /payment/status/:txnid - Check payment status (requires authentication) - Legacy endpoint
router.get('/status-legacy/:txnid', authenticate, paymentController.getPaymentStatus);

// GET /payment/test - Test PayU configuration (requires authentication)
router.get('/test', authenticate, paymentController.testPayUConfig);

module.exports = router; 