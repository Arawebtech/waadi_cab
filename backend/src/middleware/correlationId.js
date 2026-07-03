const { runWithContext, extractCorrelationFromRequest } = require('../utils/correlationContext');

/**
 * Assign/propagate X-Request-ID for end-to-end correlation.
 */
function correlationIdMiddleware(req, res, next) {
  const correlation = extractCorrelationFromRequest(req);
  req.requestId = correlation.requestId;
  req.correlation = correlation;

  res.setHeader('X-Request-ID', correlation.requestId);

  runWithContext(correlation, () => next());
}

module.exports = correlationIdMiddleware;
