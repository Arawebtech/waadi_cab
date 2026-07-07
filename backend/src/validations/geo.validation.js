const Joi = require('joi');
const { objectId, paginationQuery } = require('./common.schemas');

const createStateBody = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({
    'any.required': 'State name is required',
  }),
  statecode: Joi.string().trim().min(1).max(10).required().messages({
    'any.required': 'State code is required',
  }),
  displayOrder: Joi.number().integer().min(0).default(0),
  defaultEntryDistrict: objectId.allow('', null),
});

const updateStateBody = Joi.object({
  name: Joi.string().trim().min(2).max(100),
  statecode: Joi.string().trim().min(1).max(10),
  is_active: Joi.boolean(),
  displayOrder: Joi.number().integer().min(0),
  defaultEntryDistrict: objectId.allow('', null),
}).min(1);

const createDistrictBody = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({
    'any.required': 'District name is required',
  }),
  state_id: objectId.required().messages({ 'any.required': 'State is required' }),
  displayOrder: Joi.number().integer().min(0).default(0),
});

const updateDistrictBody = Joi.object({
  name: Joi.string().trim().min(2).max(100),
  state_id: objectId,
  is_active: Joi.boolean(),
  displayOrder: Joi.number().integer().min(0),
}).min(1);

const plansQuery = Joi.object({
  vehicle_type_id: objectId.required().messages({
    'any.required': 'Vehicle type ID is required',
  }),
});

const createPlanBody = Joi.object({
  vehicle_type_id: objectId.required().messages({
    'any.required': 'Vehicle type ID is required',
  }),
  plan_type: Joi.string().trim().min(1).max(50).required().messages({
    'any.required': 'Plan type is required',
  }),
  amount: Joi.number().min(0).required().messages({
    'any.required': 'Amount is required',
    'number.min': 'Amount must be zero or greater',
  }),
});

const updatePlanBody = Joi.object({
  vehicle_type_id: objectId,
  plan_type: Joi.string().trim().min(1).max(50),
  amount: Joi.number().min(0),
  is_active: Joi.boolean(),
}).min(1);

const vehicleTypesQuery = Joi.object({
  state_id: objectId.required().messages({ 'any.required': 'State ID is required' }),
});

const createVehicleTypeBody = Joi.object({
  name: Joi.string().trim().min(1).max(100).required().messages({
    'any.required': 'Vehicle type name is required',
  }),
  state_id: objectId.required().messages({ 'any.required': 'State ID is required' }),
  displayOrder: Joi.number().integer().min(0).default(0),
});

const updateVehicleTypeBody = Joi.object({
  name: Joi.string().trim().min(1).max(100),
  state_id: objectId,
  is_active: Joi.boolean(),
  displayOrder: Joi.number().integer().min(0),
}).min(1);

module.exports = {
  createStateBody,
  updateStateBody,
  createDistrictBody,
  updateDistrictBody,
  plansQuery,
  createPlanBody,
  updatePlanBody,
  vehicleTypesQuery,
  createVehicleTypeBody,
  updateVehicleTypeBody,
};
