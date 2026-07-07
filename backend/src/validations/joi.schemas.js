const Joi = require('joi');
const { validate } = require('../middleware/validate.middleware');

const auth = {
  otpRequest: validate(
    Joi.object({
      email: Joi.string().email().required(),
      role: Joi.string().valid('customer', 'driver', 'rider').default('customer'),
      purpose: Joi.string().valid('login', 'register').default('login'),
    })
  ),
  register: validate(
    Joi.object({
      email: Joi.string().email().required(),
      otp: Joi.string().length(6).pattern(/^\d+$/).required(),
      fullName: Joi.string().min(2).max(100).required(),
      phone: Joi.string().pattern(/^\+?[\d\s-]{10,15}$/).required(),
    })
  ),
  login: validate(
    Joi.object({
      email: Joi.string().email().required(),
      otp: Joi.string().length(6).pattern(/^\d+$/).required(),
    })
  ),
};

const booking = {
  create: validate(
    Joi.object({
      pickup: Joi.object({
        address: Joi.string().required(),
        lat: Joi.number().min(-90).max(90).required(),
        lng: Joi.number().min(-180).max(180).required(),
        placeId: Joi.string().optional(),
      }).required(),
      drop: Joi.object({
        address: Joi.string().required(),
        lat: Joi.number().min(-90).max(90).required(),
        lng: Joi.number().min(-180).max(180).required(),
        placeId: Joi.string().optional(),
      }).required(),
      vehicleId: Joi.string().required(),
      tripType: Joi.string().valid('local', 'intercity').default('local'),
      paymentMethod: Joi.string().valid('cash', 'upi', 'wallet', 'card').default('cash'),
      couponCode: Joi.string().optional(),
      scheduledAt: Joi.date().iso().optional(),
    })
  ),
  fareEstimate: validate(
    Joi.object({
      pickup: Joi.object({ lat: Joi.number().required(), lng: Joi.number().required(), address: Joi.string() }).required(),
      drop: Joi.object({ lat: Joi.number().required(), lng: Joi.number().required(), address: Joi.string() }).required(),
      tripType: Joi.string().valid('local', 'intercity').default('local'),
      couponCode: Joi.string().optional(),
    })
  ),
};

const payment = {
  createOrder: validate(
    Joi.object({
      purpose: Joi.string().valid('wallet_topup', 'subscription', 'booking', 'ride_payment').required(),
      amount: Joi.number().positive().max(100000).required(),
      planId: Joi.string().when('purpose', { is: 'subscription', then: Joi.required() }),
      bookingId: Joi.string().optional(),
    })
  ),
  verify: validate(
    Joi.object({
      orderId: Joi.string().required(),
      razorpayOrderId: Joi.string().optional(),
      razorpayPaymentId: Joi.string().required(),
      razorpaySignature: Joi.string().required(),
    })
  ),
};

const driver = {
  setOnline: validate(
    Joi.object({
      isOnline: Joi.boolean().required(),
      isAvailable: Joi.boolean().optional(),
      coordinates: Joi.when('isOnline', {
        is: true,
        then: Joi.object({
          lat: Joi.number().min(-90).max(90).required(),
          lng: Joi.number().min(-180).max(180).required(),
          heading: Joi.number().min(0).max(360).optional(),
          speed: Joi.number().min(0).optional(),
        }).optional(),
        otherwise: Joi.forbidden(),
      }),
    })
  ),
  updateBank: validate(
    Joi.object({
      accountHolderName: Joi.string().trim().min(2).max(80).required(),
      accountNumber: Joi.string().pattern(/^\d{9,18}$/).required(),
      ifsc: Joi.string().trim().uppercase().length(11).required(),
      bankName: Joi.string().trim().min(2).max(100).required(),
      branchName: Joi.string().trim().max(100).optional(),
    })
  ),
};

module.exports = { auth, booking, payment, driver, validate };
