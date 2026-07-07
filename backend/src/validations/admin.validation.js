const Joi = require('joi');
const { objectId, paginationQuery, indianPhone, email } = require('./common.schemas');
const { createBookingBody, TAX_MODES } = require('./booking.validation');
const { createPlanBody, updatePlanBody, plansQuery } = require('./subscription.validation');

const adminBookingsQuery = paginationQuery.keys({
  search: Joi.string().trim().max(200).allow('', null),
  status: Joi.string().valid('pending', 'paid', 'cancelled').allow('', null),
  processed: Joi.string().valid('true', 'false').allow('', null),
  state_id: objectId.allow('', null),
  state_ids: Joi.string().trim().max(500).allow('', null),
  user: objectId.allow('', null),
  tax_mode: Joi.string().trim().max(50).allow('', null),
  date_from: Joi.date().iso().allow('', null),
  date_to: Joi.date().iso().allow('', null),
  date_on: Joi.string().valid('createdAt', 'updatedAt', 'tax_from_date').default('createdAt'),
  sort_by: Joi.string()
    .valid('createdAt', 'updatedAt', 'amount', 'status', 'bookingCount', 'totalSpent')
    .default('createdAt'),
  sort_order: Joi.string().valid('asc', 'desc').default('desc'),
});

const adminCreateBookingBody = createBookingBody.keys({
  user_id: objectId.required().messages({ 'any.required': 'User ID is required' }),
  status: Joi.string().valid('pending', 'paid', 'cancelled').default('pending'),
});

const adminUpdateBookingBody = Joi.object({
  status: Joi.string().valid('pending', 'paid', 'cancelled'),
  amount: Joi.number().min(0),
  tax_mode: Joi.string().valid(...TAX_MODES),
  tax_from_date: Joi.date().iso(),
  tax_upto_date: Joi.date().iso(),
  visiting_state: objectId,
  processed_by_admin: Joi.boolean(),
  payment_details: Joi.object({
    payment_method: Joi.string().trim().max(50).allow('', null),
    transaction_id: Joi.string().trim().max(100).allow('', null),
  }),
}).min(1);

const bulkStateReferenceBody = Joi.object({
  source_state_id: objectId.required().messages({ 'any.required': 'Source state ID is required' }),
  target_state_id: objectId.required().messages({ 'any.required': 'Target state ID is required' }),
});

const analyticsQuery = Joi.object({
  period: Joi.string().valid('7d', '30d', '90d', '1y').default('30d'),
});

const adminUsersQuery = paginationQuery.keys({
  search: Joi.string().trim().max(200).allow('', null),
  sort_by: Joi.string()
    .valid('createdAt', 'firstName', 'lastName', 'bookingCount', 'totalSpent')
    .default('createdAt'),
  sort_order: Joi.string().valid('asc', 'desc').default('desc'),
  date_from: Joi.date().iso().allow('', null),
  date_to: Joi.date().iso().allow('', null),
  min_bookings: Joi.number().integer().min(0).allow('', null),
  after_id: objectId.allow('', null),
  after_sort_value: Joi.alternatives().try(Joi.string(), Joi.number()).allow('', null),
});

const insuranceInquiriesQuery = paginationQuery.keys({
  search: Joi.string().trim().max(200).allow('', null),
  status: Joi.string().valid('new', 'contacted', 'closed').allow('', null),
  dateFrom: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).allow('', null),
  dateTo: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).allow('', null),
});

const updateInsuranceInquiryBody = Joi.object({
  status: Joi.string().valid('new', 'contacted', 'closed').required().messages({
    'any.required': 'Status is required',
    'any.only': 'Invalid inquiry status',
  }),
});

const auditTrailQuery = Joi.object({
  bookingId: Joi.string().trim().max(100).allow('', null),
  transactionId: Joi.string().trim().max(100).allow('', null),
  requestId: Joi.string().trim().max(100).allow('', null),
  userId: objectId.allow('', null),
  limit: Joi.number().integer().min(1).max(500).default(100),
}).or('bookingId', 'transactionId', 'requestId', 'userId');

const systemLogsQuery = Joi.object({
  bookingId: Joi.string().trim().max(100).allow('', null),
  transactionId: Joi.string().trim().max(100).allow('', null),
  requestId: Joi.string().trim().max(100).allow('', null),
  category: Joi.string().trim().max(50).allow('', null),
  level: Joi.string().valid('error', 'warn', 'info', 'debug', 'security', 'audit', 'mobile', 'api').allow('', null),
  limit: Joi.number().integer().min(1).max(500).default(100),
});

const journeyReportQuery = Joi.object({
  bookingId: Joi.string().trim().max(100).allow('', null),
  transactionId: Joi.string().trim().max(100).allow('', null),
  userId: objectId.allow('', null),
}).or('bookingId', 'transactionId', 'userId');

const cabListQuery = paginationQuery.keys({
  search: Joi.string().trim().max(200).allow('', null),
  status: Joi.string().trim().max(50).allow('', null),
  category: Joi.string().trim().max(50).allow('', null),
});

const cabDriversQuery = cabListQuery;
const cabCustomersQuery = cabListQuery;
const cabRidesQuery = cabListQuery;
const cabSubscriptionsQuery = paginationQuery.keys({
  status: Joi.string().trim().max(50).allow('', null),
});
const cabSubscriptionHistoryQuery = paginationQuery.keys({
  action: Joi.string().trim().max(50).allow('', null),
});
const cabWalletsQuery = paginationQuery.keys({
  ownerType: Joi.string().valid('Driver', 'Customer', 'User').allow('', null),
});
const cabWalletTransactionsQuery = paginationQuery.keys({
  type: Joi.string().trim().max(50).allow('', null),
  purpose: Joi.string().trim().max(50).allow('', null),
  ownerType: Joi.string().valid('Driver', 'Customer', 'User').allow('', null),
});

const cabReportsQuery = Joi.object({
  period: Joi.string().valid('7d', '30d', '90d', '1y').default('30d'),
});

const cabLiveFleetQuery = Joi.object({
  status: Joi.string().valid('online', 'offline', 'on_trip', 'all').allow('', null),
  vehicleType: Joi.string().trim().max(50).allow('', null),
});

const verificationStatusBody = Joi.object({
  status: Joi.string().valid('approved', 'rejected').required().messages({
    'any.required': 'Status is required',
    'any.only': 'Status must be approved or rejected',
  }),
  reason: Joi.string().trim().max(500).allow('', null),
});

const profileVerificationBody = Joi.object({
  status: Joi.string().valid('approved', 'rejected', 'under_review').required().messages({
    'any.required': 'Status is required',
  }),
  reason: Joi.string().trim().max(500).allow('', null),
});

const patchDriverBody = Joi.object({
  isActive: Joi.boolean(),
  isVerified: Joi.boolean(),
  profileVerificationStatus: Joi.string().valid('pending', 'under_review', 'approved', 'rejected'),
  profileRejectionReason: Joi.string().trim().max(500).allow('', null),
}).min(1);

const cancelRideBody = Joi.object({
  reason: Joi.string().trim().max(500).allow('', null),
});

const reuploadDocumentBody = Joi.object({
  reason: Joi.string().trim().max(500).allow('', null),
});

const documentIdParam = Joi.object({
  id: Joi.string()
    .pattern(/^[a-fA-F0-9]{24}:(rc|insurance|puc|license|aadhaar|pan)$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid document ID format',
      'any.required': 'Document ID is required',
    }),
});

const vehicleDocumentTypeParam = Joi.object({
  id: objectId.required(),
  documentType: Joi.string()
    .valid('rc', 'insurance', 'puc', 'license', 'aadhaar', 'pan')
    .required()
    .messages({ 'any.only': 'Invalid document type' }),
});

const cabVehiclesQuery = paginationQuery.keys({
  status: Joi.string().valid('draft', 'pending', 'under_review', 'approved', 'rejected').allow('', null),
  vehicleType: Joi.string().valid('sedan', 'suv', 'hatchback', 'tempo', 'bus').allow('', null),
  search: Joi.string().trim().max(30).allow('', null),
});

const createAdminBody = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({
    'any.required': 'Name is required',
  }),
  email: email.required().messages({ 'any.required': 'Email is required' }),
  password: Joi.string().min(8).max(128).required().messages({
    'string.min': 'Password must be at least 8 characters',
    'any.required': 'Password is required',
  }),
  role: Joi.string()
    .valid('admin', 'finance_manager', 'operations_manager', 'kyc_executive', 'support_executive')
    .required()
    .messages({
      'any.required': 'Role is required',
      'any.only': 'Invalid admin role',
    }),
});

const updateAdminBody = Joi.object({
  name: Joi.string().trim().min(2).max(100),
  email: email,
  password: Joi.string().min(8).max(128),
  role: Joi.string().valid(
    'admin',
    'finance_manager',
    'operations_manager',
    'kyc_executive',
    'support_executive'
  ),
  isActive: Joi.boolean(),
}).min(1);

const togglePlanStatusBody = Joi.object({
  isActive: Joi.boolean().required().messages({ 'any.required': 'isActive is required' }),
});

const clientLogsBody = Joi.object({
  logs: Joi.array()
    .items(
      Joi.object({
        message: Joi.string().max(2000).allow('', null),
        level: Joi.string().valid('error', 'warn', 'info', 'debug').allow('', null),
        category: Joi.string().max(50).allow('', null),
        sourceFile: Joi.string().max(200).allow('', null),
        sourceFunction: Joi.string().max(200).allow('', null),
        requestId: Joi.string().max(100).allow('', null),
        bookingId: Joi.string().max(100).allow('', null),
        transactionId: Joi.string().max(100).allow('', null),
        userId: Joi.string().max(100).allow('', null),
        platform: Joi.string().max(50).allow('', null),
        journeyEventType: Joi.string().max(100).allow('', null),
        data: Joi.object().unknown(true),
      }).unknown(true)
    )
    .min(1)
    .max(50)
    .required()
    .messages({
      'array.min': 'logs array is required',
      'any.required': 'logs array is required',
    }),
});

module.exports = {
  adminBookingsQuery,
  adminCreateBookingBody,
  adminUpdateBookingBody,
  bulkStateReferenceBody,
  analyticsQuery,
  adminUsersQuery,
  insuranceInquiriesQuery,
  updateInsuranceInquiryBody,
  auditTrailQuery,
  systemLogsQuery,
  journeyReportQuery,
  cabDriversQuery,
  cabCustomersQuery,
  cabRidesQuery,
  cabSubscriptionsQuery,
  cabSubscriptionHistoryQuery,
  cabWalletsQuery,
  cabWalletTransactionsQuery,
  cabReportsQuery,
  cabLiveFleetQuery,
  verificationStatusBody,
  profileVerificationBody,
  patchDriverBody,
  cancelRideBody,
  reuploadDocumentBody,
  documentIdParam,
  vehicleDocumentTypeParam,
  cabVehiclesQuery,
  createAdminBody,
  updateAdminBody,
  createPlanBody,
  updatePlanBody,
  plansQuery,
  togglePlanStatusBody,
  clientLogsBody,
};
