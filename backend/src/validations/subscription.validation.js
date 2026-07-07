const Joi = require('joi');
const { objectId, paginationQuery } = require('./common.schemas');

const purchaseIntent = Joi.string().valid('purchase', 'renew', 'replace').default('purchase');

const purchaseBody = Joi.object({
  planId: objectId.required().messages({ 'any.required': 'Plan ID is required' }),
  intent: purchaseIntent,
});

const renewBody = Joi.object({
  planId: objectId.required().messages({ 'any.required': 'Plan ID is required' }),
});

const paymentSuccessBody = Joi.object({
  txnid: Joi.string().trim().min(3).max(120).required().messages({
    'any.required': 'Transaction ID is required',
  }),
  paymentId: Joi.string().trim().max(120).allow('', null),
  status: Joi.string().trim().max(50).allow('', null),
});

const paymentFailedBody = Joi.object({
  txnid: Joi.string().trim().min(3).max(120).required(),
  reason: Joi.string().trim().max(500).allow('', null),
});

const cancelBody = Joi.object({
  reason: Joi.string().trim().max(500).allow('', null),
});

const createPlanBody = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  slug: Joi.string().trim().min(2).max(100).required(),
  durationDays: Joi.number().integer().min(1).max(3650).required(),
  amount: Joi.number().min(0).max(10000000).required(),
  description: Joi.string().trim().max(1000).allow('', null),
  sortOrder: Joi.number().integer().min(0).max(9999).optional(),
});

const updatePlanBody = Joi.object({
  name: Joi.string().trim().min(2).max(100),
  slug: Joi.string().trim().min(2).max(100),
  durationDays: Joi.number().integer().min(1).max(3650),
  amount: Joi.number().min(0).max(10000000),
  description: Joi.string().trim().max(1000).allow('', null),
  sortOrder: Joi.number().integer().min(0).max(9999),
  badge: Joi.string().trim().max(50).allow('', null),
  color: Joi.string().trim().max(30).allow('', null),
  features: Joi.array().items(Joi.string().trim().max(200)).max(30),
  bookingLimitPerDay: Joi.number().integer().min(0).max(1000),
  prioritySupport: Joi.boolean(),
  instantApproval: Joi.boolean(),
  commissionDiscount: Joi.number().min(0).max(100),
  isPopular: Joi.boolean(),
  isRecommended: Joi.boolean(),
  isTrial: Joi.boolean(),
  isActive: Joi.boolean(),
}).min(1);

const plansQuery = paginationQuery.keys({
  isActive: Joi.string().valid('true', 'false').optional(),
});

module.exports = {
  purchaseBody,
  renewBody,
  paymentSuccessBody,
  paymentFailedBody,
  cancelBody,
  createPlanBody,
  updatePlanBody,
  plansQuery,
};
