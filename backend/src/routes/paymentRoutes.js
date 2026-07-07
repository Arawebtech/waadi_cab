const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate } = require('../middleware/auth');
const {
  validateBody,
  validateQuery,
  validateParams,
  rejectEmptyBody,
} = require('../middleware/validate.middleware');
const {
  generateHashBody,
  verifyPaymentBody,
  initiatePaymentBody,
  txnIdParam,
  txnidLegacyParam,
  relayQuery,
} = require('../validations/payment.validation');

router.post('/generate-hash', authenticate, rejectEmptyBody, validateBody(generateHashBody), paymentController.generateHash);
router.post('/verify', authenticate, rejectEmptyBody, validateBody(verifyPaymentBody), paymentController.verifyPayment);
router.get('/status/:txnId', authenticate, validateParams(txnIdParam), paymentController.getPaymentStatusByTxnId);
router.post('/test-hash', authenticate, rejectEmptyBody, validateBody(generateHashBody), paymentController.testHashGeneration);
router.post('/test-hash-verification', rejectEmptyBody, paymentController.testHashVerification);
router.post('/test-form-data', paymentController.testFormData);
router.post('/initiate', authenticate, rejectEmptyBody, validateBody(initiatePaymentBody), paymentController.initiatePayment);
router.post('/success', paymentController.handlePaymentSuccess);
router.post('/failure', paymentController.handlePaymentFailure);
router.get('/relay', validateQuery(relayQuery), paymentController.renderPayURelay);
router.post('/relay', validateQuery(relayQuery), paymentController.renderPayURelay);
router.get('/status-legacy/:txnid', authenticate, validateParams(txnidLegacyParam), paymentController.getPaymentStatus);
router.get('/test', authenticate, paymentController.testPayUConfig);

module.exports = router;
