/**
 * Standard API response helpers — matches existing { success, message, data? } contract.
 */

function success(res, data = null, message = 'Success', statusCode = 200) {
  const payload = { success: true, message };
  if (data !== null && data !== undefined) payload.data = data;
  if (res.req?.requestId) payload.requestId = res.req.requestId;
  return res.status(statusCode).json(payload);
}

function fail(res, message = 'Something went wrong', statusCode = 500, extras = {}) {
  return res.status(statusCode).json({
    success: false,
    message,
    ...(res.req?.requestId ? { requestId: res.req.requestId } : {}),
    ...extras,
  });
}

function paginated(res, data, pagination, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    pagination,
    ...(res.req?.requestId ? { requestId: res.req.requestId } : {}),
  });
}

function validationError(res, errors, message = 'Validation failed', statusCode = 422) {
  return res.status(statusCode).json({
    success: false,
    message,
    errors: Array.isArray(errors) ? errors : [errors],
    ...(res.req?.requestId ? { requestId: res.req.requestId } : {}),
  });
}

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  success,
  fail,
  paginated,
  validationError,
  asyncHandler,
};
