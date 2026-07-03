/**
 * gatewayCredentials.js
 *
 * Credentials always come from .env. MongoDB (PaymentGatewayConfig) only
 * determines which gateway is active via activeGateway.
 */

const payuService = require('../services/payuService');
const cashfreeService = require('../services/cashfreeService');

const VALID_GATEWAYS = ['payu', 'cashfree'];

function getPayuEnvCredentials() {
  return {
    key: process.env.PAYU_MERCHANT_KEY || process.env.PAYU_KEY || '',
    salt: process.env.PAYU_MERCHANT_SALT || process.env.PAYU_SALT || '',
    successUrl: process.env.PAYU_SUCCESS_URL || '',
    failureUrl: process.env.PAYU_FAILURE_URL || '',
  };
}

function getCashfreeEnvCredentials() {
  return {
    appId: process.env.CASHFREE_APP_ID || '',
    secretKey: process.env.CASHFREE_SECRET_KEY || '',
    webhookSecret: process.env.CASHFREE_WEBHOOK_SECRET || '',
    environment: (process.env.CASHFREE_ENVIRONMENT || 'sandbox').trim().toLowerCase(),
  };
}

function validatePayuEnv() {
  const credentials = getPayuEnvCredentials();
  const errors = [];
  if (!credentials.key) errors.push('PayU Merchant Key is not set in .env');
  if (!credentials.salt) errors.push('PayU Merchant Salt is not set in .env');
  return { isValid: errors.length === 0, errors, credentials };
}

function validateCashfreeEnv() {
  const credentials = getCashfreeEnvCredentials();
  const errors = [];
  if (!credentials.appId) errors.push('Cashfree App ID is not set in .env');
  if (!credentials.secretKey) errors.push('Cashfree Secret Key is not set in .env');
  return { isValid: errors.length === 0, errors, credentials };
}

function syncPayuService() {
  const validation = validatePayuEnv();
  if (!validation.isValid) {
    return { ...validation, service: payuService };
  }

  const { key, salt, successUrl, failureUrl } = validation.credentials;
  payuService.key = key;
  payuService.salt = salt;
  if (successUrl) payuService.successUrl = successUrl;
  if (failureUrl) payuService.failureUrl = failureUrl;

  return { ...validation, service: payuService };
}

function syncCashfreeService() {
  const validation = validateCashfreeEnv();
  if (!validation.isValid) {
    return { ...validation, service: cashfreeService };
  }

  const { appId, secretKey, webhookSecret, environment } = validation.credentials;
  cashfreeService.appId = appId;
  cashfreeService.secretKey = secretKey;
  if (webhookSecret) cashfreeService.webhookSecret = webhookSecret;
  cashfreeService.environment = (environment || 'sandbox').trim().toLowerCase();
  cashfreeService.baseUrl =
    cashfreeService.environment === 'production'
      ? 'https://api.cashfree.com/pg'
      : 'https://sandbox.cashfree.com/pg';

  return { ...validation, service: cashfreeService };
}

function validateAndSync(gatewayName) {
  if (gatewayName === 'cashfree') {
    return syncCashfreeService();
  }
  return syncPayuService();
}

module.exports = {
  VALID_GATEWAYS,
  getPayuEnvCredentials,
  getCashfreeEnvCredentials,
  validatePayuEnv,
  validateCashfreeEnv,
  validateAndSync,
};
