
const express = require('express');
const router = express.Router();
const cashfreeController = require('../controllers/cashfreeController');
const { authenticate } = require('../middleware/auth');
const {
  validateBody,
  validateParams,
  rejectEmptyBody,
} = require('../middleware/validate.middleware');
const {
  cashfreeInitiateBody,
  cashfreeVerifyBody,
  txnIdParam,
} = require('../validations/payment.validation');

router.get('/relay', cashfreeController.renderCheckoutRelay.bind(cashfreeController));
router.post('/relay', cashfreeController.renderCheckoutRelay.bind(cashfreeController));
router.get('/success', cashfreeController.handleSuccess.bind(cashfreeController));
router.get('/failure', cashfreeController.handleFailure.bind(cashfreeController));
router.post('/webhook', cashfreeController.handleWebhook.bind(cashfreeController));

router.post('/initiate', authenticate, rejectEmptyBody, validateBody(cashfreeInitiateBody), cashfreeController.initiatePayment.bind(cashfreeController));
router.post('/verify', authenticate, rejectEmptyBody, validateBody(cashfreeVerifyBody), cashfreeController.verifyPayment.bind(cashfreeController));
router.get('/status/:txnId', authenticate, validateParams(txnIdParam), cashfreeController.getPaymentStatus.bind(cashfreeController));
router.get('/test', authenticate, cashfreeController.testConfig.bind(cashfreeController));

module.exports = router;
