const Joi = require('joi');

const objectId = Joi.string()
  .hex()
  .length(24)
  .messages({
    'string.hex': 'Invalid ID format',
    'string.length': 'Invalid ID format',
    'any.required': 'ID is required',
  });

const objectIdParam = (paramName = 'id') =>
  Joi.object({
    [paramName]: objectId.required().messages({
      'any.required': `Invalid ${paramName} format`,
    }),
  });

const paginationQuery = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().trim().max(200).allow('', null),
  action: Joi.string().trim().max(50).allow('', null),
  status: Joi.string().trim().max(50).allow('', null),
});

const locationPoint = Joi.object({
  address: Joi.string().trim().min(3).max(500).required().messages({
    'string.min': 'Address is too short',
    'any.required': 'Address is required',
  }),
  lat: Joi.number().min(-90).max(90).required().messages({
    'any.required': 'Latitude is required',
    'number.min': 'Invalid latitude',
    'number.max': 'Invalid latitude',
  }),
  lng: Joi.number().min(-180).max(180).required().messages({
    'any.required': 'Longitude is required',
    'number.min': 'Invalid longitude',
    'number.max': 'Invalid longitude',
  }),
  placeId: Joi.string().trim().max(200).allow('', null),
});

const indianPhone = Joi.string()
  .pattern(/^[6-9]\d{9}$/)
  .messages({
    'string.pattern.base': 'Please enter a valid 10-digit Indian phone number',
  });

const email = Joi.string()
  .trim()
  .lowercase()
  .email({ tlds: { allow: false } })
  .messages({
    'string.email': 'Please enter a valid email address',
  });

module.exports = {
  objectId,
  objectIdParam,
  paginationQuery,
  locationPoint,
  indianPhone,
  email,
};
