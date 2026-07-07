const Joi = require('joi');
const { objectId, paginationQuery, indianPhone } = require('./common.schemas');

const TAX_MODES = [
  'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly',
  'Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7', 'Day 8', 'Day 9', 'Day 10',
  'Day 11', 'Day 12', 'Day 13', 'Day 14', 'Day 15', 'Day 16', 'Day 17', 'Day 18', 'Day 19', 'Day 20',
];

const SEAT_CAPACITIES = ['5(4+1)', '6(5+1)', '7(6+1)', '8(7+1)', '9(8+1)'];

const vehicleNumber = Joi.string()
  .trim()
  .uppercase()
  .pattern(/^[A-Z]{2}[0-9]{1,2}[A-Z]{1,2}[0-9]{4}$/)
  .messages({
    'string.pattern.base': 'Invalid vehicle number format',
    'any.required': 'Vehicle number is required',
  });

const createBookingBody = Joi.object({
  visiting_state: objectId.required().messages({ 'any.required': 'Visiting state is required' }),
  vehicle_number: vehicleNumber.required(),
  seat_capacity: Joi.string()
    .valid(...SEAT_CAPACITIES)
    .required()
    .messages({
      'any.only': 'Invalid seat capacity',
      'any.required': 'Seat capacity is required',
    }),
  whatsapp_number: indianPhone.required().messages({ 'any.required': 'WhatsApp number is required' }),
  entry_border: Joi.string().trim().min(1).max(200).required().messages({
    'any.required': 'Entry border is required',
  }),
  tax_mode: Joi.string()
    .valid(...TAX_MODES)
    .required()
    .messages({
      'any.only': 'Invalid tax mode',
      'any.required': 'Tax mode is required',
    }),
  tax_from_date: Joi.date().iso().required().messages({ 'any.required': 'Tax from date is required' }),
  tax_upto_date: Joi.date().iso().min(Joi.ref('tax_from_date')).required().messages({
    'any.required': 'Tax upto date is required',
    'date.min': 'Tax upto date must be on or after tax from date',
  }),
  amount: Joi.number().min(0).required().messages({
    'any.required': 'Amount is required',
    'number.min': 'Amount must be zero or greater',
  }),
});

const bookingsQuery = paginationQuery.keys({
  status: Joi.string().valid('pending', 'paid', 'cancelled').allow('', null),
  state_id: objectId.allow('', null),
  all: Joi.boolean().truthy('true').falsy('false').default(false),
});

const updateBookingStatusBody = Joi.object({
  status: Joi.string()
    .valid('pending', 'paid', 'cancelled')
    .required()
    .messages({
      'any.only': 'Invalid status. Must be pending, paid, or cancelled',
      'any.required': 'Status is required',
    }),
  payment_method: Joi.string().trim().max(50).allow('', null),
  transaction_id: Joi.string().trim().max(100).allow('', null),
});

const paymentReferenceParam = Joi.object({
  paymentReference: Joi.string().trim().min(3).max(100).required().messages({
    'any.required': 'Payment reference is required',
  }),
});

module.exports = {
  createBookingBody,
  bookingsQuery,
  updateBookingStatusBody,
  paymentReferenceParam,
  TAX_MODES,
  SEAT_CAPACITIES,
};
