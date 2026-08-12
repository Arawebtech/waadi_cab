const express = require('express');
const router = express.Router();
const razorpayController = require('../controllers/razorpayController');
const { authenticate } = require('../middleware/auth');

router.get('/relay', razorpayController.renderCheckoutRelay.bind(razorpayController));
router.post('/relay', razorpayController.renderCheckoutRelay.bind(razorpayController));
router.get('/success', razorpayController.handleSuccess.bind(razorpayController));
router.post('/success', razorpayController.handleSuccess.bind(razorpayController));
router.get('/failure', razorpayController.handleFailure.bind(razorpayController));
router.post('/webhook', razorpayController.handleWebhook.bind(razorpayController));

router.post('/initiate', authenticate, razorpayController.initiatePayment.bind(razorpayController));
router.post('/verify', authenticate, razorpayController.verifyPayment.bind(razorpayController));
router.get('/status/:txnId', authenticate, razorpayController.getPaymentStatus.bind(razorpayController));
router.get('/test', authenticate, razorpayController.testConfig.bind(razorpayController));

module.exports = router;
