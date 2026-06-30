/**
 * Structured JSON logger — stdout for log aggregators + optional MongoDB persistence.
 */

const { getContext, setContext } = require('./correlationContext');
const { maskSensitive } = require('./maskSensitive');

const LOG_TO_DB = String(process.env.LOG_TO_DB || 'true').toLowerCase() === 'true';
const LOG_LEVEL = (process.env.LOG_LEVEL || 'info').toLowerCase();

const LEVEL_RANK = { debug: 10, info: 20, warn: 30, error: 40 };

let SystemLog = null;

function loadSystemLogModel() {
  if (SystemLog) return SystemLog;
  try {
    SystemLog = require('../models/SystemLog');
  } catch {
    SystemLog = null;
  }
  return SystemLog;
}

function shouldLog(level) {
  return (LEVEL_RANK[level] || 20) >= (LEVEL_RANK[LOG_LEVEL] || 20);
}

function buildEntry(level, category, message, data = {}) {
  const ctx = getContext();
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    category,
    message,
    requestId: data.requestId || ctx.requestId,
    bookingId: data.bookingId || ctx.bookingId,
    transactionId: data.transactionId || ctx.transactionId,
    userId: data.userId || ctx.userId,
    source: data.source,
    sourceFile: data.sourceFile,
    sourceFunction: data.sourceFunction,
    ...data,
  };

  delete entry.requestId;
  entry.requestId = data.requestId || ctx.requestId;
  entry.bookingId = data.bookingId || ctx.bookingId;
  entry.transactionId = data.transactionId || ctx.transactionId;
  entry.userId = data.userId || ctx.userId;

  return entry;
}

function persistAsync(entry) {
  if (!LOG_TO_DB) return;
  if (!['error', 'warn', 'security', 'audit'].includes(entry.category) && entry.level !== 'error') {
    return;
  }

  setImmediate(async () => {
    try {
      const Model = loadSystemLogModel();
      if (!Model) return;
      await Model.create({
        level: entry.level,
        category: entry.category,
        message: entry.message,
        requestId: entry.requestId,
        bookingId: entry.bookingId,
        transactionId: entry.transactionId,
        userId: entry.userId,
        data: maskSensitive(entry),
        source: entry.source,
        sourceFile: entry.sourceFile,
        sourceFunction: entry.sourceFunction,
      });
    } catch {
      // Never break app flow for logging failures
    }
  });
}

function write(level, category, message, data = {}) {
  if (!shouldLog(level)) return;

  const entry = buildEntry(level, category, message, data);
  const line = JSON.stringify(entry);

  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }

  persistAsync(entry);
  return entry;
}

function withCorrelation(partial) {
  setContext(partial);
}

function child(meta = {}) {
  return {
    debug: (category, message, data) => write('debug', category, message, { ...meta, ...data }),
    info: (category, message, data) => write('info', category, message, { ...meta, ...data }),
    warn: (category, message, data) => write('warn', category, message, { ...meta, ...data }),
    error: (category, message, data) => write('error', category, message, { ...meta, ...data }),
  };
}

module.exports = {
  debug: (category, message, data) => write('debug', category, message, data),
  info: (category, message, data) => write('info', category, message, data),
  warn: (category, message, data) => write('warn', category, message, data),
  error: (category, message, data) => write('error', category, message, data),
  security: (message, data) => write('warn', 'security', message, data),
  payment: (message, data) => write('info', 'payment', message, data),
  booking: (message, data) => write('info', 'booking', message, data),
  db: (message, data) => write('info', 'database', message, data),
  api: (message, data) => write('info', 'api', message, data),
  mobile: (message, data) => write('info', 'mobile', message, data),
  withCorrelation,
  child,
  mask: maskSensitive,
};
