const logger = require('../utils/logger');
const { maskSensitive } = require('../utils/maskSensitive');
const AppError = require('../utils/AppError');

const DUPLICATE_FIELD_LABELS = {
  email: 'Email',
  phoneNumber: 'Phone number',
  phone: 'Phone number',
  vehicleNumber: 'Vehicle number',
  slug: 'Slug',
};

function duplicateKeyMessage(keyValue = {}) {
  const field = Object.keys(keyValue)[0];
  if (!field) return 'Resource already exists';
  const label = DUPLICATE_FIELD_LABELS[field] || field.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
  return `${label} already exists`;
}

function castErrorMessage(err) {
  if (err.path === '_id' || err.kind === 'ObjectId') {
    return 'Invalid ID format';
  }
  return 'Invalid data format';
}

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Server Error';
  let errors = err.errors || null;
  let code = err.code || undefined;

  logger.error('error', message, {
    sourceFile: 'errorHandler.js',
    sourceFunction: 'errorHandler',
    requestId: req.requestId,
    userId: req.user?._id?.toString(),
    bookingId: req.correlation?.bookingId,
    transactionId: req.correlation?.transactionId,
    endpoint: req.originalUrl,
    method: req.method,
    statusCode,
    stack: err.stack,
    errorName: err.name,
    errorCode: err.code,
    request: maskSensitive({
      query: req.query,
      params: req.params,
      body: Buffer.isBuffer(req.body) ? '[RAW_BUFFER]' : req.body,
    }),
  });

  if (err instanceof AppError) {
    statusCode = err.statusCode || statusCode;
    message = err.message;
    errors = err.errors || errors;
    code = err.code || code;
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = castErrorMessage(err);
  } else if (err.code === 11000) {
    statusCode = 409;
    message = duplicateKeyMessage(err.keyValue);
  } else if (err.name === 'ValidationError' && err.errors) {
    statusCode = 400;
    errors = Object.values(err.errors).map((val) => ({
      field: val.path,
      message: val.message,
    }));
    message = errors.map((e) => e.message).join('; ') || 'Validation failed';
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    code = code || 'INVALID_TOKEN';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    code = code || 'TOKEN_EXPIRED';
  } else if (err.name === 'MongoServerError' && err.code === 11000) {
    statusCode = 409;
    message = duplicateKeyMessage(err.keyValue);
  } else if (err.name === 'MongoError' || err.name === 'MongooseError') {
    statusCode = 500;
    message = process.env.NODE_ENV === 'production' ? 'Database error' : err.message;
  } else if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Invalid JSON in request body';
  } else if (statusCode >= 500 && process.env.NODE_ENV === 'production') {
    message = 'Something went wrong. Please try again later.';
  }

  const payload = {
    success: false,
    message,
    ...(req.requestId ? { requestId: req.requestId } : {}),
    ...(code ? { code } : {}),
    ...(errors ? { errors } : {}),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  };

  res.status(statusCode).json(payload);
};

module.exports = errorHandler;
