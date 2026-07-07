const Joi = require('joi');
const { objectId, paginationQuery } = require('./common.schemas');

const createIntercityPackageBody = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({
    'any.required': 'Package name is required',
  }),
  slug: Joi.string().trim().min(2).max(100).required().messages({
    'any.required': 'Slug is required',
  }),
  description: Joi.string().trim().max(1000).allow('', null),
  fromCity: Joi.string().trim().min(2).max(100).required().messages({
    'any.required': 'From city is required',
  }),
  toCity: Joi.string().trim().min(2).max(100).required().messages({
    'any.required': 'To city is required',
  }),
  distanceKm: Joi.number().min(1).max(10000).required().messages({
    'any.required': 'Distance is required',
  }),
  durationHours: Joi.number().min(0.5).max(500).allow(null),
  basePrice: Joi.number().min(0).max(10000000).required().messages({
    'any.required': 'Base price is required',
  }),
  vehicleId: objectId.allow('', null),
  tripType: Joi.string()
    .valid('one_way', 'round_trip', 'multi_city', 'airport', 'outstation_package')
    .required()
    .messages({
      'any.required': 'Trip type is required',
      'any.only': 'Invalid trip type',
    }),
  includesToll: Joi.boolean().default(false),
});

const updateIntercityPackageBody = Joi.object({
  name: Joi.string().trim().min(2).max(100),
  slug: Joi.string().trim().min(2).max(100),
  description: Joi.string().trim().max(1000).allow('', null),
  fromCity: Joi.string().trim().min(2).max(100),
  toCity: Joi.string().trim().min(2).max(100),
  distanceKm: Joi.number().min(1).max(10000),
  durationHours: Joi.number().min(0.5).max(500).allow(null),
  basePrice: Joi.number().min(0).max(10000000),
  vehicleId: objectId.allow('', null),
  tripType: Joi.string().valid('one_way', 'round_trip', 'multi_city', 'airport', 'outstation_package'),
  includesToll: Joi.boolean(),
  isActive: Joi.boolean(),
}).min(1);

const intercityPackagesQuery = paginationQuery.keys({
  fromCity: Joi.string().trim().max(100).allow('', null),
  toCity: Joi.string().trim().max(100).allow('', null),
  isActive: Joi.string().valid('true', 'false').allow('', null),
});

const publicIntercityQuery = Joi.object({
  fromCity: Joi.string().trim().max(100).allow('', null),
  toCity: Joi.string().trim().max(100).allow('', null),
});

module.exports = {
  createIntercityPackageBody,
  updateIntercityPackageBody,
  intercityPackagesQuery,
  publicIntercityQuery,
};
