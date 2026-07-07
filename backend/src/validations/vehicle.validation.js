const Joi = require('joi');
const { objectId, paginationQuery } = require('./common.schemas');

const SEAT_CAPACITIES = ['2(1+1)', '5(4+1)', '6(5+1)', '7(6+1)', '8(7+1)', '9(8+1)'];
const VEHICLE_TYPES = ['sedan', 'suv', 'hatchback', 'tempo', 'bus'];
const DOCUMENT_TYPES = ['rc', 'insurance', 'puc', 'license', 'aadhaar', 'pan'];

const createVehicleBody = Joi.object({
  vehicleNumber: Joi.string()
    .trim()
    .min(4)
    .max(20)
    .required()
    .messages({ 'any.required': 'Vehicle number is required' }),
  seatCapacity: Joi.string()
    .valid(...SEAT_CAPACITIES)
    .required()
    .messages({ 'any.only': 'Invalid seat capacity' }),
  vehicleType: Joi.string()
    .valid(...VEHICLE_TYPES)
    .required()
    .messages({ 'any.only': 'Invalid vehicle type' }),
  isDefault: Joi.boolean().optional(),
});

const updateVehicleBody = Joi.object({
  vehicleNumber: Joi.string().trim().min(4).max(20),
  seatCapacity: Joi.string().valid(...SEAT_CAPACITIES),
  vehicleType: Joi.string().valid(...VEHICLE_TYPES),
  isDefault: Joi.boolean(),
}).min(1);

const documentTypeParam = Joi.object({
  id: objectId.required(),
  documentType: Joi.string()
    .valid(...DOCUMENT_TYPES)
    .required()
    .messages({ 'any.only': 'Invalid document type' }),
});

const vehiclesQuery = paginationQuery;

module.exports = {
  createVehicleBody,
  updateVehicleBody,
  documentTypeParam,
  vehiclesQuery,
  DOCUMENT_TYPES,
};
