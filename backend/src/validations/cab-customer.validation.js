const Joi = require('joi');
const { objectId, locationPoint, email, paginationQuery } = require('./common.schemas');

const otpRequestBody = Joi.object({
  email: email.required(),
  purpose: Joi.string().valid('login', 'register').default('login'),
});

const registerBody = Joi.object({
  email: email.required(),
  name: Joi.string().trim().min(2).max(100).required(),
  otp: Joi.string().length(6).pattern(/^\d+$/).required().messages({
    'string.length': 'OTP must be exactly 6 digits',
    'string.pattern.base': 'OTP must contain only numbers',
  }),
  phone: Joi.string().pattern(/^\+?[\d\s-]{10,15}$/).allow('', null),
});

const loginBody = Joi.object({
  email: email.required(),
  otp: Joi.string().length(6).pattern(/^\d+$/).required().messages({
    'string.length': 'OTP must be exactly 6 digits',
    'string.pattern.base': 'OTP must contain only numbers',
  }),
});

const refreshBody = Joi.object({
  refreshToken: Joi.string().trim().min(10).required().messages({
    'any.required': 'Refresh token is required',
  }),
});

const logoutBody = Joi.object({
  refreshToken: Joi.string().trim().min(10).allow('', null),
});

const updateProfileBody = Joi.object({
  name: Joi.string().trim().min(2).max(100),
  fullName: Joi.string().trim().min(2).max(100),
  phone: Joi.string().pattern(/^\+?[\d\s-]{10,15}$/).allow('', null),
  language: Joi.string().valid('en', 'hi').allow('', null),
  darkMode: Joi.boolean(),
}).min(1);

const fareEstimateBody = Joi.object({
  pickup: locationPoint.required(),
  drop: locationPoint.required(),
  tripType: Joi.string().valid('local', 'intercity').default('local'),
  couponCode: Joi.string().trim().max(50).allow('', null),
  intercityPackageId: objectId.allow('', null),
});

const createBookingBody = Joi.object({
  pickup: locationPoint.required(),
  drop: locationPoint.required(),
  vehicleTypeSlug: Joi.string().trim().max(50),
  vehicleId: Joi.alternatives().try(objectId, Joi.string().trim().max(50)),
  tripType: Joi.string().valid('local', 'intercity').default('local'),
  paymentMethod: Joi.string().valid('cash', 'upi', 'wallet', 'card').default('cash'),
  couponCode: Joi.string().trim().max(50).allow('', null),
  intercityPackageId: objectId.allow('', null),
  scheduledAt: Joi.date().iso().allow(null),
}).or('vehicleTypeSlug', 'vehicleId');

const cancelBookingBody = Joi.object({
  reason: Joi.string().trim().max(500).allow('', null),
});

const rateBookingBody = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().trim().max(500).allow('', null),
});

const savePlaceBody = Joi.object({
  label: Joi.string().trim().min(1).max(80).required(),
  address: Joi.string().trim().min(3).max(500).required(),
  lat: Joi.number().min(-90).max(90).required(),
  lng: Joi.number().min(-180).max(180).required(),
  placeId: Joi.string().trim().max(200).allow('', null),
});

const sendMessageBody = Joi.object({
  message: Joi.string().trim().min(1).max(1000).required(),
});

const paymentVerifyBody = Joi.object({
  txnId: Joi.string().trim().required(),
  paymentId: Joi.string().trim().allow('', null),
  orderId: Joi.string().trim().allow('', null),
});

const bookingsQuery = paginationQuery;

const customerRidesQuery = paginationQuery.keys({
  limit: Joi.number().integer().min(1).max(100).default(20),
});

const placesSearchQuery = Joi.object({
  q: Joi.string().trim().min(2).max(200).required(),
  lat: Joi.number().min(-90).max(90),
  lng: Joi.number().min(-180).max(180),
});

const geocodeQuery = Joi.object({
  address: Joi.string().trim().min(3).max(500).required(),
});

const directionsQuery = Joi.object({
  originLat: Joi.number().min(-90).max(90).required(),
  originLng: Joi.number().min(-180).max(180).required(),
  destLat: Joi.number().min(-90).max(90).required(),
  destLng: Joi.number().min(-180).max(180).required(),
});

module.exports = {
  otpRequestBody,
  registerBody,
  loginBody,
  refreshBody,
  logoutBody,
  updateProfileBody,
  fareEstimateBody,
  createBookingBody,
  cancelBookingBody,
  rateBookingBody,
  savePlaceBody,
  sendMessageBody,
  paymentVerifyBody,
  bookingsQuery,
  customerRidesQuery,
  placesSearchQuery,
  geocodeQuery,
  directionsQuery,
};
