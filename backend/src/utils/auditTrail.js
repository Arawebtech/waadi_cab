/**
 * Append-only booking/payment audit trail with duplicate journey event prevention.
 */

const AuditLog = require('../models/AuditLog');
const logger = require('./logger');
const { getContext, setContext } = require('./correlationContext');
const { maskSensitive } = require('./maskSensitive');

/** Same user/booking/txn + same eventType within this window = duplicate flow event */
const JOURNEY_DEDUP_WINDOW_MS = Number(process.env.JOURNEY_DEDUP_WINDOW_MS) || 120000;

async function findRecentDuplicateAuditEntry(entry) {
  if (!entry.eventType) return null;

  const since = new Date(Date.now() - JOURNEY_DEDUP_WINDOW_MS);
  const filter = {
    eventType: entry.eventType,
    createdAt: { $gte: since },
  };

  if (entry.bookingId) filter.bookingId = entry.bookingId;
  if (entry.transactionId) filter.transactionId = entry.transactionId;
  if (entry.userId) filter.userId = entry.userId;

  // Auth / pre-booking events: require userId so we do not collapse different users
  if (!entry.bookingId && !entry.transactionId && !entry.userId) {
    return null;
  }

  return AuditLog.findOne(filter).sort({ createdAt: -1 }).lean();
}

async function recordAuditEvent({
  eventType,
  bookingId,
  bookingObjectId,
  userId,
  transactionId,
  previousState,
  newState,
  gateway,
  source = 'backend',
  sourceFile,
  sourceFunction,
  metadata,
  req,
}) {
  const ctx = getContext();

  const entry = {
    eventType,
    requestId: ctx.requestId,
    bookingId: bookingId || ctx.bookingId,
    bookingObjectId,
    userId: userId?.toString?.() || userId || ctx.userId,
    transactionId: transactionId || ctx.transactionId,
    previousState,
    newState,
    gateway,
    source,
    sourceFile,
    sourceFunction,
    metadata: maskSensitive(metadata),
    ip:
      req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
      req?.ip ||
      undefined,
    userAgent: req?.headers?.['user-agent'],
  };

  if (bookingId) setContext({ bookingId });
  if (transactionId) setContext({ transactionId });
  if (userId) setContext({ userId: userId?.toString?.() || userId });

  logger.info('audit', `Audit: ${eventType}`, {
    category: 'audit',
    ...entry,
  });

  setImmediate(async () => {
    try {
      const duplicate = await findRecentDuplicateAuditEntry(entry);
      if (duplicate) {
        logger.info('audit', 'Skipped duplicate journey audit event', {
          category: 'audit',
          eventType: entry.eventType,
          bookingId: entry.bookingId,
          transactionId: entry.transactionId,
          userId: entry.userId,
          existingId: String(duplicate._id),
          sourceFile: 'auditTrail.js',
          sourceFunction: 'recordAuditEvent',
        });
        return;
      }

      await AuditLog.create(entry);
    } catch (err) {
      logger.error('audit', 'Failed to persist audit event', {
        eventType,
        error: err.message,
        sourceFile: 'auditTrail.js',
        sourceFunction: 'recordAuditEvent',
      });
    }
  });
}

async function getAuditTrailByBookingId(bookingId, limit = 100) {
  return AuditLog.find({ bookingId }).sort({ createdAt: -1 }).limit(limit).lean();
}

async function getAuditTrailByTransactionId(transactionId, limit = 100) {
  return AuditLog.find({ transactionId }).sort({ createdAt: -1 }).limit(limit).lean();
}

async function getAuditTrailByRequestId(requestId, limit = 200) {
  return AuditLog.find({ requestId }).sort({ createdAt: -1 }).limit(limit).lean();
}

async function getAuditTrailByUserId(userId, limit = 200) {
  return AuditLog.find({ userId }).sort({ createdAt: -1 }).limit(limit).lean();
}

module.exports = {
  recordAuditEvent,
  findRecentDuplicateAuditEntry,
  getAuditTrailByBookingId,
  getAuditTrailByTransactionId,
  getAuditTrailByRequestId,
  getAuditTrailByUserId,
  JOURNEY_DEDUP_WINDOW_MS,
};
