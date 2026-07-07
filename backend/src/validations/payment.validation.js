const Joi = require('joi');
const { objectId } = require('./common.schemas');

const generateHashBody = Joi.object({
  txnid: Joi.string().trim().min(1).max(100).required().messages({
    'any.required': 'Transaction ID is required',
  }),
  amount: Joi.alternatives()
    .try(Joi.number().positive(), Joi.string().trim().min(1))
    .required()
    .messages({ 'any.required': 'Amount is required' }),
  productinfo: Joi.string().trim().min(1).max(500).required().messages({
    'any.required': 'Product info is required',
  }),
  firstname: Joi.string().trim().min(1).max(100).required().messages({
    'any.required': 'First name is required',
  }),
  email: Joi.string().trim().email({ tlds: { allow: false } }).allow('', null),
  phone: Joi.string().trim().max(20).allow('', null),
  udf1: Joi.string().max(255).allow('', null),
  udf2: Joi.string().max(255).allow('', null),
  udf3: Joi.string().max(255).allow('', null),
  udf4: Joi.string().max(255).allow('', null),
  udf5: Joi.string().max(255).allow('', null),
  udf6: Joi.string().max(255).allow('', null),
  udf7: Joi.string().max(255).allow('', null),
  udf8: Joi.string().max(255).allow('', null),
  udf9: Joi.string().max(255).allow('', null),
  udf10: Joi.string().max(255).allow('', null),
});

const verifyPaymentBody = Joi.object({
  txnId: Joi.string().trim().min(1).max(100).required().messages({
    'any.required': 'Transaction ID is required',
  }),
  status: Joi.string().trim().min(1).max(50).required().messages({
    'any.required': 'Payment status is required',
  }),
  amount: Joi.alternatives()
    .try(Joi.number().positive(), Joi.string().trim().min(1))
    .required()
    .messages({ 'any.required': 'Amount is required' }),
  payuMoneyId: Joi.string().trim().max(100).allow('', null),
  bookingData: Joi.object().unknown(true).required().messages({
    'any.required': 'Booking data is required',
  }),
});

const initiatePaymentBody = Joi.object({
  bookingId: objectId.required().messages({
    'any.required': 'Booking ID is required',
  }),
});

const txnIdParam = Joi.object({
  txnId: Joi.string().trim().min(1).max(100).required().messages({
    'any.required': 'Transaction ID is required',
  }),
});

const txnidLegacyParam = Joi.object({
  txnid: Joi.string().trim().min(1).max(100).required().messages({
    'any.required': 'Transaction ID is required',
  }),
});

const relayQuery = Joi.object({
  platform: Joi.string().valid('app', 'web').allow('', null),
});

const cashfreeInitiateBody = Joi.object({
  bookingId: objectId.required().messages({
    'any.required': 'Booking ID is required',
  }),
});

const cashfreeVerifyBody = Joi.object({
  orderId: Joi.string().trim().min(1).max(100),
  txnId: Joi.string().trim().min(1).max(100),
  bookingId: objectId.allow('', null),
}).or('orderId', 'txnId').messages({
  'object.missing': 'Order ID or transaction ID is required',
});

module.exports = {
  generateHashBody,
  verifyPaymentBody,
  initiatePaymentBody,
  txnIdParam,
  txnidLegacyParam,
  relayQuery,
  cashfreeInitiateBody,
  cashfreeVerifyBody,
};
