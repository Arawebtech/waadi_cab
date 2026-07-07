const Joi = require('joi');
const { email } = require('./common.schemas');

const createAdminManagementBody = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({
    'any.required': 'Name is required',
  }),
  email: email.required().messages({ 'any.required': 'Email is required' }),
  password: Joi.string().min(8).max(128).required().messages({
    'string.min': 'Password must be at least 8 characters',
    'any.required': 'Password is required',
  }),
  role: Joi.string()
    .valid('admin', 'finance_manager', 'operations_manager', 'kyc_executive', 'support_executive')
    .required()
    .messages({
      'any.required': 'Role is required',
      'any.only': 'Invalid admin role',
    }),
});

const updateAdminManagementBody = Joi.object({
  name: Joi.string().trim().min(2).max(100),
  email: email,
  password: Joi.string().min(8).max(128),
  role: Joi.string().valid(
    'admin',
    'finance_manager',
    'operations_manager',
    'kyc_executive',
    'support_executive'
  ),
  isActive: Joi.boolean(),
}).min(1);

const adminManagementQuery = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  role: Joi.string()
    .valid('admin', 'finance_manager', 'operations_manager', 'kyc_executive', 'support_executive')
    .allow('', null),
  search: Joi.string().trim().max(200).allow('', null),
});

module.exports = {
  createAdminManagementBody,
  updateAdminManagementBody,
  adminManagementQuery,
};
