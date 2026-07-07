const Joi = require('joi');
const { email } = require('./common.schemas');

const SEAT_CAPACITIES = ['5(4+1)', '6(5+1)', '7(6+1)', '8(7+1)', '9(8+1)'];

const updateProfileBody = Joi.object({
  firstName: Joi.string().trim().min(2).max(50).pattern(/^[a-zA-Z\s]+$/).messages({
    'string.min': 'First name must be between 2-50 characters',
    'string.max': 'First name must be between 2-50 characters',
    'string.pattern.base': 'First name should contain only letters',
  }),
  lastName: Joi.string().trim().min(2).max(50).pattern(/^[a-zA-Z\s]+$/).messages({
    'string.min': 'Last name must be between 2-50 characters',
    'string.max': 'Last name must be between 2-50 characters',
    'string.pattern.base': 'Last name should contain only letters',
  }),
  email: email,
}).min(1);

const addVehicleBody = Joi.object({
  vehicleNumber: Joi.string()
    .trim()
    .uppercase()
    .pattern(/^[A-Z]{2}[0-9]{1,2}[A-Z]{1,2}[0-9]{4}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid vehicle number format',
      'any.required': 'Vehicle number is required',
    }),
  seatCapacity: Joi.string()
    .valid(...SEAT_CAPACITIES)
    .required()
    .messages({
      'any.only': 'Invalid seat capacity',
      'any.required': 'Seat capacity is required',
    }),
  isDefault: Joi.boolean().default(false),
});

const updateVehicleBody = Joi.object({
  vehicleNumber: Joi.string()
    .trim()
    .uppercase()
    .pattern(/^[A-Z]{2}[0-9]{1,2}[A-Z]{1,2}[0-9]{4}$/)
    .messages({ 'string.pattern.base': 'Invalid vehicle number format' }),
  seatCapacity: Joi.string()
    .valid(...SEAT_CAPACITIES)
    .messages({ 'any.only': 'Invalid seat capacity' }),
  isDefault: Joi.boolean(),
}).min(1);

module.exports = {
  updateProfileBody,
  addVehicleBody,
  updateVehicleBody,
};
