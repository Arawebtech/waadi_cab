const logger = require('../utils/logger');
const { maskSensitive } = require('../utils/maskSensitive');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  logger.error('error', err.message || 'Unhandled error', {
    sourceFile: 'errorHandler.js',
    sourceFunction: 'errorHandler',
    requestId: req.requestId,
    userId: req.user?._id?.toString(),
    bookingId: req.correlation?.bookingId,
    transactionId: req.correlation?.transactionId,
    endpoint: req.originalUrl,
    method: req.method,
    statusCode: error.statusCode || 500,
    stack: err.stack,
    errorName: err.name,
    errorCode: err.code,
    request: maskSensitive({
      query: req.query,
      params: req.params,
      body: Buffer.isBuffer(req.body) ? '[RAW_BUFFER]' : req.body,
    }),
  });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = { message, statusCode: 404 };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Resource already exists';
    error = { message, statusCode: 409 };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = { message, statusCode: 400 };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = { message, statusCode: 401 };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = { message, statusCode: 401 };
  }

  // Multer / payload too large (should be rare — Nginx usually returns 413 first)
  if (err.code === 'LIMIT_FILE_SIZE' || err.type === 'entity.too.large' || err.status === 413) {
    return res.status(413).json({
      success: false,
      message: 'Upload too large. ZIP must be 100MB or less.',
      requestId: req.requestId,
    });
  }

  if (err.name === 'MulterError') {
    return res.status(400).json({
      success: false,
      message: err.message || 'File upload failed',
      requestId: req.requestId,
    });
  }

  // MongoDB connection errors
  if (err.name === 'MongoError' || err.name === 'MongooseError') {
    const message = 'Database connection error';
    error = { message, statusCode: 500 };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Server Error',
    requestId: req.requestId,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
