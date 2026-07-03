const logger = require('../utils/logger');
const { maskSensitive, sanitizeHeaders } = require('../utils/maskSensitive');
const { setContext } = require('../utils/correlationContext');

const SKIP_PATHS = ['/health', '/favicon.ico'];

function getApiName(req) {
  const base = req.baseUrl || '';
  const path = req.route?.path ? `${base}${req.route.path}` : req.originalUrl?.split('?')[0];
  return path || req.originalUrl;
}

function requestLoggerMiddleware(req, res, next) {
  if (SKIP_PATHS.some((p) => req.path === p || req.originalUrl?.startsWith(p))) {
    return next();
  }

  const start = process.hrtime.bigint();
  const apiName = getApiName(req);

  if (req.user?._id) {
    setContext({ userId: req.user._id.toString() });
  }

  const requestBody =
    req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)
      ? maskSensitive(req.body)
      : Buffer.isBuffer(req.body)
        ? '[RAW_BUFFER]'
        : req.body;

  logger.api('API request received', {
    sourceFile: 'requestLogger.js',
    sourceFunction: 'requestLoggerMiddleware',
    apiName,
    endpoint: req.originalUrl,
    method: req.method,
    requestId: req.requestId,
    userId: req.user?._id?.toString(),
    headers: sanitizeHeaders(req.headers),
    query: maskSensitive(req.query),
    body: requestBody,
    ip:
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.ip,
    userAgent: req.headers['user-agent'],
  });

  const originalJson = res.json.bind(res);
  res.json = function jsonLogged(body) {
    res.locals.responseBody = body;
    return originalJson(body);
  };

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    const responseBody = res.locals.responseBody;

    let bookingId;
    let transactionId;

    if (responseBody && typeof responseBody === 'object') {
      bookingId =
        responseBody?.data?.booking?.bookingId ||
        responseBody?.data?.bookingId ||
        responseBody?.bookingId;
      transactionId =
        responseBody?.data?.payment?.paymentData?.txnid ||
        responseBody?.data?.txnid ||
        responseBody?.data?.txnId;
    }

    if (bookingId) setContext({ bookingId });
    if (transactionId) setContext({ transactionId });

    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

    logger[level]('api', 'API response sent', {
      sourceFile: 'requestLogger.js',
      sourceFunction: 'requestLoggerMiddleware',
      apiName,
      endpoint: req.originalUrl,
      method: req.method,
      requestId: req.requestId,
      userId: req.user?._id?.toString(),
      bookingId,
      transactionId,
      statusCode: res.statusCode,
      responseTimeMs: Math.round(durationMs * 100) / 100,
      response: maskSensitive(
        responseBody && typeof responseBody === 'object'
          ? {
              success: responseBody.success,
              message: responseBody.message,
              bookingId,
              transactionId,
            }
          : undefined
      ),
      error: res.statusCode >= 400 ? responseBody?.message : undefined,
    });
  });

  next();
}

module.exports = requestLoggerMiddleware;
