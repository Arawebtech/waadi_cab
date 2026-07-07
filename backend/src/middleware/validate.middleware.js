const { validationResult } = require('express-validator');
const mongoose = require('mongoose');
const { validationError } = require('../utils/apiResponse');
const AppError = require('../utils/AppError');

const JOI_OPTIONS = {
  abortEarly: false,
  stripUnknown: true,
  convert: true,
};

function formatJoiErrors(error) {
  return error.details.map((detail) => ({
    field: detail.path.join('.') || 'body',
    message: detail.message.replace(/"/g, ''),
  }));
}

function formatExpressErrors(errors) {
  return errors.map((err) => ({
    field: err.path || err.param || err.location || 'body',
    message: err.msg,
    value: err.value,
  }));
}

/** Express-validator result handler — attach after validation rule arrays */
function handleExpressValidation(req, res, next) {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    const errors = formatExpressErrors(result.array());
    return validationError(res, errors, errors[0]?.message || 'Validation failed', 400);
  }
  next();
}

/** Joi schema validator for request body */
function validateBody(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, JOI_OPTIONS);
    if (error) {
      const errors = formatJoiErrors(error);
      return validationError(res, errors, errors.map((e) => e.message).join('; '), 422);
    }
    req.body = value;
    next();
  };
}

/** Joi schema validator for query string */
function validateQuery(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, JOI_OPTIONS);
    if (error) {
      const errors = formatJoiErrors(error);
      return validationError(res, errors, errors.map((e) => e.message).join('; '), 422);
    }
    req.query = value;
    next();
  };
}

/** Joi schema validator for route params */
function validateParams(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params, JOI_OPTIONS);
    if (error) {
      const errors = formatJoiErrors(error);
      return validationError(res, errors, errors.map((e) => e.message).join('; '), 422);
    }
    req.params = value;
    next();
  };
}

/** Shorthand: validate a single Mongo ObjectId route param */
function validateObjectId(paramName = 'id', label = 'ID') {
  return (req, res, next) => {
    const value = req.params[paramName];
    if (!value || !mongoose.Types.ObjectId.isValid(value)) {
      return validationError(
        res,
        [{ field: paramName, message: `Invalid ${label} format` }],
        `Invalid ${label} format`,
        400
      );
    }
    next();
  };
}

/** Reject empty JSON bodies on write methods */
function rejectEmptyBody(req, res, next) {
  if (!['POST', 'PUT', 'PATCH'].includes(req.method)) return next();
  if (req.is('multipart/form-data')) return next();
  const body = req.body;
  if (body && typeof body === 'object' && !Buffer.isBuffer(body) && Object.keys(body).length === 0) {
    return validationError(
      res,
      [{ field: 'body', message: 'Request body cannot be empty' }],
      'Request body cannot be empty',
      400
    );
  }
  next();
}

/** Strip MongoDB operator keys from user input */
function sanitizeInput(req, _res, next) {
  const scrub = (obj) => {
    if (!obj || typeof obj !== 'object' || Buffer.isBuffer(obj)) return;
    for (const key of Object.keys(obj)) {
      if (key.startsWith('$') || key.includes('.')) {
        delete obj[key];
        continue;
      }
      if (typeof obj[key] === 'object') scrub(obj[key]);
    }
  };
  scrub(req.body);
  scrub(req.query);
  scrub(req.params);
  next();
}

/** Backward-compatible Joi validate(source) factory used by joi.schemas.js */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], JOI_OPTIONS);
    if (error) {
      const errors = formatJoiErrors(error);
      return validationError(res, errors, errors.map((e) => e.message).join('; '), 422);
    }
    req[source] = value;
    next();
  };
}

/** Multer / upload errors → user-friendly JSON (use after upload middleware) */
function handleUploadErrors(err, req, res, next) {
  if (!err) return next();

  if (err.code === 'LIMIT_FILE_SIZE') {
    const maxMb = Math.round((err.limit || 0) / (1024 * 1024)) || 5;
    return validationError(
      res,
      [{ field: 'file', message: `File size must be less than ${maxMb}MB` }],
      `File size must be less than ${maxMb}MB`,
      400
    );
  }

  if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
    return validationError(
      res,
      [{ field: 'file', message: 'Too many files uploaded' }],
      'Too many files uploaded',
      400
    );
  }

  if (err.message === 'Invalid file type' || err.message?.includes('file type')) {
    return validationError(
      res,
      [{ field: 'file', message: 'Only JPG, PNG images and PDF documents are allowed' }],
      'Only JPG, PNG images and PDF documents are allowed',
      400
    );
  }

  if (err instanceof AppError) {
    return validationError(res, [{ field: 'file', message: err.message }], err.message, err.statusCode);
  }

  next(err);
}

module.exports = {
  validate,
  validateBody,
  validateQuery,
  validateParams,
  validateObjectId,
  rejectEmptyBody,
  sanitizeInput,
  handleExpressValidation,
  handleUploadErrors,
  formatJoiErrors,
  formatExpressErrors,
};
