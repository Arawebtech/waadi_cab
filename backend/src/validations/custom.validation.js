const Joi = require('joi');

exports.createPlanValidation = Joi.object({
  name: Joi.string().required(),
  slug: Joi.string().required(),
  durationDays: Joi.number().min(1).required(),
  amount: Joi.number().min(0).required(),
  description: Joi.string().allow(''),
  sortOrder: Joi.number()
});

exports.purchaseValidation = Joi.object({
  planId: Joi.string().required(),
  gateway: Joi.string().valid('payu', 'cashfree').required()
});