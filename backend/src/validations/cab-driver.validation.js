const Joi = require('joi');
const { objectId } = require('./common.schemas');
const { RIDE_STATUSES } = require('../models/CabRide');

const updateProfileBody = Joi.object({
  firstName: Joi.string().trim().min(1).max(50),
  lastName: Joi.string().trim().min(1).max(50),
  email: Joi.string().email({ tlds: { allow: false } }).allow('', null),
  emergencyContact: Joi.object({
    name: Joi.string().allow('', null),
    phone: Joi.string().allow('', null),
    relation: Joi.string().allow('', null),
  }),
  address: Joi.object({
    street: Joi.string().allow('', null),
    city: Joi.string().allow('', null),
    state: Joi.string().allow('', null),
    pincode: Joi.string().allow('', null),
  }),
}).min(1);

const registrationStepBody = Joi.object({
  step: Joi.number().integer().min(1).max(4).required().messages({
    'any.required': 'Registration step is required',
  }),
});

const activeVehicleBody = Joi.object({
  vehicleId: objectId.required().messages({ 'any.required': 'Vehicle ID is required' }),
});

const onlineStatusBody = Joi.object({
  isOnline: Joi.boolean().required().messages({ 'any.required': 'Online status is required' }),
  isAvailable: Joi.boolean(),
  vehicleId: objectId,
  coordinates: Joi.object({
    lat: Joi.number().min(-90).max(90).required(),
    lng: Joi.number().min(-180).max(180).required(),
    heading: Joi.number().min(0).max(360),
    speed: Joi.number().min(0),
    accuracy: Joi.number().min(0),
  }),
});

const locationUpdateBody = Joi.object({
  coordinates: Joi.object({
    lat: Joi.number().min(-90).max(90).required(),
    lng: Joi.number().min(-180).max(180).required(),
    heading: Joi.number().min(0).max(360),
    speed: Joi.number().min(0),
    accuracy: Joi.number().min(0),
  }).required(),
  isAvailable: Joi.boolean(),
});

const availabilityBody = Joi.object({
  isAvailable: Joi.boolean().required().messages({ 'any.required': 'Availability status is required' }),
});

const rideStatusBody = Joi.object({
  status: Joi.string()
    .valid(...RIDE_STATUSES.filter((s) => !['REQUESTED', 'SEARCHING_DRIVER', 'EXPIRED'].includes(s)))
    .required()
    .messages({ 'any.required': 'Ride status is required' }),
});

const verifyTripOtpBody = Joi.object({
  otp: Joi.string().length(4).pattern(/^\d+$/).required().messages({
    'string.length': 'OTP must be exactly 4 digits',
    'string.pattern.base': 'OTP must contain only numbers',
    'any.required': 'OTP is required',
  }),
});

const sendMessageBody = Joi.object({
  text: Joi.string().trim().min(1).max(1000).required().messages({
    'any.required': 'Message text is required',
    'string.min': 'Message cannot be empty',
  }),
  message: Joi.string().trim().min(1).max(1000),
}).or('text', 'message');

const purchaseTestingBody = Joi.object({
  planId: objectId.required().messages({ 'any.required': 'Plan ID is required' }),
});

module.exports = {
  updateProfileBody,
  registrationStepBody,
  activeVehicleBody,
  onlineStatusBody,
  locationUpdateBody,
  availabilityBody,
  rideStatusBody,
  verifyTripOtpBody,
  sendMessageBody,
  purchaseTestingBody,
};
