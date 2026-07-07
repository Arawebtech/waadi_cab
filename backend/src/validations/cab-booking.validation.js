const Joi = require('joi');
const { objectId, indianPhone, paginationQuery } = require('./common.schemas');

/** Public legacy intercity cab listing (driver interest board) */
const publicCabBookingsQuery = Joi.object({
  status: Joi.string().trim().max(50).default('unassigned'),
  limit: Joi.number().integer().min(1).max(50).default(10),
});

const submitInterestBody = Joi.object({
  user_id: objectId.required().messages({ 'any.required': 'User ID is required' }),
  phone_number: indianPhone.required().messages({ 'any.required': 'Phone number is required' }),
  first_name: Joi.string().trim().min(1).max(50).required().messages({
    'any.required': 'First name is required',
  }),
  last_name: Joi.string().trim().min(1).max(50).required().messages({
    'any.required': 'Last name is required',
  }),
});

/** Admin legacy intercity cab bookings */
const adminCabBookingsQuery = paginationQuery.keys({
  status: Joi.string().trim().max(50).allow('', null),
  search: Joi.string().trim().max(200).allow('', null),
});

const createLegacyCabBookingBody = Joi.object({
  from_location: Joi.string().trim().min(2).max(200).required().messages({
    'any.required': 'Pickup location is required',
  }),
  to_location: Joi.string().trim().min(2).max(200).required().messages({
    'any.required': 'Drop location is required',
  }),
  start_date: Joi.date().iso().required().messages({
    'any.required': 'Start date is required',
  }),
  trip_type: Joi.string().valid('one_way', 'round_trip').required().messages({
    'any.only': 'Trip type must be one_way or round_trip',
    'any.required': 'Trip type is required',
  }),
  return_date: Joi.when('trip_type', {
    is: 'round_trip',
    then: Joi.date().iso().min(Joi.ref('start_date')).required().messages({
      'any.required': 'Return date is required for round trips',
    }),
    otherwise: Joi.date().iso().allow(null),
  }),
  notes: Joi.string().trim().max(1000).allow('', null),
});

const updateLegacyCabBookingBody = Joi.object({
  status: Joi.string().trim().max(50),
  assigned_driver_id: objectId.allow('', null),
  assigned_driver_phone: indianPhone.allow('', null),
  notes: Joi.string().trim().max(1000).allow('', null),
}).min(1);

module.exports = {
  publicCabBookingsQuery,
  submitInterestBody,
  adminCabBookingsQuery,
  createLegacyCabBookingBody,
  updateLegacyCabBookingBody,
};
