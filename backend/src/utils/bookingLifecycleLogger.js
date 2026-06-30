/**
 * Booking lifecycle + PayU payment structured logging helpers.
 * Additive only — does not alter business logic.
 */

const logger = require('./logger');
const { recordAuditEvent } = require('./auditTrail');
const { setContext } = require('./correlationContext');
const { maskSensitive } = require('./maskSensitive');

const SRC = 'bookingLifecycleLogger.js';

function propagateIds({ bookingId, transactionId, userId }) {
  if (bookingId) setContext({ bookingId });
  if (transactionId) setContext({ transactionId });
  if (userId) setContext({ userId: userId?.toString?.() || userId });
}

// ─── Booking ────────────────────────────────────────────────────────────────

function logBookingRequestReceived(req) {
  logger.booking('Booking request received', {
    sourceFile: SRC,
    sourceFunction: 'logBookingRequestReceived',
    userId: req.user?._id?.toString(),
    body: maskSensitive(req.body),
    vehicleNumber: req.body?.vehicle_number,
    visitingState: req.body?.visiting_state,
    taxMode: req.body?.tax_mode,
    amount: req.body?.amount,
  });
}

function logBookingValidationFailed(req, reason) {
  logger.warn('booking', 'Booking validation failed', {
    sourceFile: SRC,
    sourceFunction: 'logBookingValidationFailed',
    userId: req.user?._id?.toString(),
    reason,
    body: maskSensitive(req.body),
  });
  recordAuditEvent({
    eventType: 'VALIDATION_FAILED',
    userId: req.user?._id,
    sourceFile: SRC,
    sourceFunction: 'logBookingValidationFailed',
    metadata: { reason, body: maskSensitive(req.body) },
    req,
  });
}

function logBookingCreationStarted(req) {
  logger.booking('Booking creation started', {
    sourceFile: SRC,
    sourceFunction: 'logBookingCreationStarted',
    userId: req.user?._id?.toString(),
  });
}

function logBookingCreated(booking, req, extra = {}) {
  propagateIds({
    bookingId: booking.bookingId,
    userId: booking.user?._id || booking.user,
    transactionId: booking.payment_details?.transaction_id,
  });

  logger.booking('Booking created successfully', {
    sourceFile: SRC,
    sourceFunction: 'logBookingCreated',
    bookingId: booking.bookingId,
    bookingObjectId: booking._id?.toString(),
    userId: booking.user?._id?.toString() || booking.user?.toString(),
    status: booking.status,
    amount: booking.amount,
    vehicleNumber: booking.vehicle_number,
    taxMode: booking.tax_mode,
    ...extra,
  });

  recordAuditEvent({
    eventType: 'BOOKING_CREATED',
    bookingId: booking.bookingId,
    bookingObjectId: booking._id,
    userId: booking.user?._id || booking.user,
    previousState: null,
    newState: booking.status,
    metadata: {
      amount: booking.amount,
      vehicleNumber: booking.vehicle_number,
      taxMode: booking.tax_mode,
      ...extra,
    },
    sourceFile: SRC,
    sourceFunction: 'logBookingCreated',
    req,
  });
}

function logBookingCreationFailed(req, error) {
  logger.error('booking', 'Booking creation failed', {
    sourceFile: SRC,
    sourceFunction: 'logBookingCreationFailed',
    userId: req.user?._id?.toString(),
    error: error?.message || String(error),
    stack: error?.stack,
  });
}

function logBookingStatusChange(booking, previousStatus, newStatus, req, extra = {}) {
  propagateIds({
    bookingId: booking.bookingId,
    userId: booking.user?._id || booking.user,
    transactionId: booking.payment_details?.transaction_id,
  });

  logger.booking('Booking status changed', {
    sourceFile: SRC,
    sourceFunction: 'logBookingStatusChange',
    bookingId: booking.bookingId,
    previousStatus,
    newStatus,
    ...extra,
  });

  const eventType =
    newStatus === 'cancelled'
      ? 'BOOKING_CANCELLED'
      : newStatus === 'paid'
        ? 'BOOKING_COMPLETED'
        : 'BOOKING_UPDATED';

  recordAuditEvent({
    eventType,
    bookingId: booking.bookingId,
    bookingObjectId: booking._id,
    userId: booking.user?._id || booking.user,
    transactionId: booking.payment_details?.transaction_id,
    previousState: previousStatus,
    newState: newStatus,
    metadata: extra,
    sourceFile: SRC,
    sourceFunction: 'logBookingStatusChange',
    req,
  });
}

// ─── Payment (PayU) ─────────────────────────────────────────────────────────

function logPaymentInitiated({ booking, txnid, gateway, req, payload }) {
  propagateIds({ bookingId: booking?.bookingId, transactionId: txnid, userId: booking?.user?._id || booking?.user });

  logger.payment('Payment initiated', {
    sourceFile: SRC,
    sourceFunction: 'logPaymentInitiated',
    bookingId: booking?.bookingId,
    transactionId: txnid,
    gateway: gateway || 'payu',
    amount: booking?.amount,
    paymentUrl: payload?.paymentUrl,
    payload: maskSensitive(payload?.paymentData),
  });

  recordAuditEvent({
    eventType: 'PAYMENT_INITIATED',
    bookingId: booking?.bookingId,
    bookingObjectId: booking?._id,
    userId: booking?.user?._id || booking?.user,
    transactionId: txnid,
    previousState: booking?.status,
    newState: booking?.status,
    gateway: gateway || 'payu',
    metadata: { amount: booking?.amount, payload: maskSensitive(payload?.paymentData) },
    sourceFile: SRC,
    sourceFunction: 'logPaymentInitiated',
    req,
  });
}

function logPayUTransactionIdGenerated(txnid, bookingId) {
  logger.payment('PayU transaction ID generated', {
    sourceFile: SRC,
    sourceFunction: 'logPayUTransactionIdGenerated',
    transactionId: txnid,
    bookingId,
  });
}

function logPayUHashGenerated(txnid, bookingId) {
  logger.payment('PayU hash generated', {
    sourceFile: SRC,
    sourceFunction: 'logPayUHashGenerated',
    transactionId: txnid,
    bookingId,
  });
}

function logPayURedirect({ txnid, paymentUrl, platform, req }) {
  logger.payment('Redirect to PayU', {
    sourceFile: SRC,
    sourceFunction: 'logPayURedirect',
    transactionId: txnid,
    paymentUrl,
    platform,
  });

  recordAuditEvent({
    eventType: 'PAYMENT_REDIRECT_PAYU',
    transactionId: txnid,
    gateway: 'payu',
    metadata: { paymentUrl, platform },
    sourceFile: SRC,
    sourceFunction: 'logPayURedirect',
    req,
  });
}

function logPayUCallbackReceived(type, payuResponse, req) {
  const txnid = payuResponse?.txnid;
  propagateIds({ transactionId: txnid });

  logger.payment(`PayU ${type} callback received`, {
    sourceFile: SRC,
    sourceFunction: 'logPayUCallbackReceived',
    callbackType: type,
    transactionId: txnid,
    status: payuResponse?.status,
    amount: payuResponse?.amount,
    mihpayid: payuResponse?.mihpayid,
    payload: maskSensitive(payuResponse),
    ip: req?.ip,
    userAgent: req?.headers?.['user-agent'],
  });
}

function logPayUHashVerification({ txnid, verified, req }) {
  logger.payment('PayU hash verification', {
    sourceFile: SRC,
    sourceFunction: 'logPayUHashVerification',
    transactionId: txnid,
    verified,
  });

  if (!verified) {
    logger.security('PayU hash verification failed', {
      sourceFile: SRC,
      sourceFunction: 'logPayUHashVerification',
      transactionId: txnid,
    });
  }
}

function logPaymentSuccess({ booking, txnid, paymentId, req, gateway = 'payu' }) {
  propagateIds({ bookingId: booking?.bookingId, transactionId: txnid });

  logger.payment('Payment success', {
    sourceFile: SRC,
    sourceFunction: 'logPaymentSuccess',
    bookingId: booking?.bookingId,
    transactionId: txnid,
    paymentId,
    gateway,
    amount: booking?.amount,
  });

  recordAuditEvent({
    eventType: 'PAYMENT_SUCCESS',
    bookingId: booking?.bookingId,
    bookingObjectId: booking?._id,
    userId: booking?.user?._id || booking?.user,
    transactionId: txnid,
    previousState: 'pending',
    newState: 'paid',
    gateway,
    metadata: { paymentId, amount: booking?.amount },
    sourceFile: SRC,
    sourceFunction: 'logPaymentSuccess',
    req,
  });

  logBookingConfirmed({
    bookingId: booking?.bookingId,
    transactionId: txnid,
    userId: booking?.user?._id || booking?.user,
    req,
    metadata: { paymentId, amount: booking?.amount, gateway },
  });

  logBookingStatusChange(booking, 'pending', 'paid', req, { paymentId, gateway });
}

function logPaymentFailure({ booking, txnid, reason, req, gateway = 'payu', status = 'failure' }) {
  propagateIds({ bookingId: booking?.bookingId, transactionId: txnid });

  logger.payment('Payment failed', {
    sourceFile: SRC,
    sourceFunction: 'logPaymentFailure',
    bookingId: booking?.bookingId,
    transactionId: txnid,
    reason,
    gateway,
    status,
  });

  recordAuditEvent({
    eventType: status === 'pending' ? 'PAYMENT_PENDING' : 'PAYMENT_FAILED',
    bookingId: booking?.bookingId,
    bookingObjectId: booking?._id,
    userId: booking?.user?._id || booking?.user,
    transactionId: txnid,
    previousState: booking?.status,
    newState: status,
    gateway,
    metadata: { reason },
    sourceFile: SRC,
    sourceFunction: 'logPaymentFailure',
    req,
  });
}

function logPaymentVerified({ booking, txnid, verified, req }) {
  logger.payment('Payment verification completed', {
    sourceFile: SRC,
    sourceFunction: 'logPaymentVerified',
    bookingId: booking?.bookingId,
    transactionId: txnid,
    verified,
  });

  recordAuditEvent({
    eventType: 'PAYMENT_VERIFIED',
    bookingId: booking?.bookingId,
    bookingObjectId: booking?._id,
    userId: booking?.user?._id || booking?.user,
    transactionId: txnid,
    metadata: { verified },
    sourceFile: SRC,
    sourceFunction: 'logPaymentVerified',
    req,
  });
}

function logDuplicatePayment({ txnid, bookingId, req }) {
  logger.warn('payment', 'Duplicate payment detected', {
    sourceFile: SRC,
    sourceFunction: 'logDuplicatePayment',
    transactionId: txnid,
    bookingId,
  });

  logger.security('Duplicate transaction attempt', {
    sourceFile: SRC,
    sourceFunction: 'logDuplicatePayment',
    transactionId: txnid,
    bookingId,
  });

  recordAuditEvent({
    eventType: 'PAYMENT_DUPLICATE_DETECTED',
    bookingId,
    transactionId: txnid,
    sourceFile: SRC,
    sourceFunction: 'logDuplicatePayment',
    req,
  });
}

function logPaymentReconciliation({ txnid, bookingId, details }) {
  logger.payment('Payment reconciliation', {
    sourceFile: SRC,
    sourceFunction: 'logPaymentReconciliation',
    transactionId: txnid,
    bookingId,
    details: maskSensitive(details),
  });

  recordAuditEvent({
    eventType: 'PAYMENT_RECONCILIATION',
    bookingId,
    transactionId: txnid,
    metadata: maskSensitive(details),
    sourceFile: SRC,
    sourceFunction: 'logPaymentReconciliation',
  });
}

function logDatabasePaymentUpdate({ operation, model, docId, txnid, bookingId, success, error }) {
  logger.db(`Payment ${operation}`, {
    sourceFile: SRC,
    sourceFunction: 'logDatabasePaymentUpdate',
    model,
    docId: docId?.toString?.(),
    transactionId: txnid,
    bookingId,
    success,
    error: error?.message,
  });
}

function logValidationSuccess(req, data) {
  logger.booking('Booking validation success', {
    sourceFile: SRC,
    sourceFunction: 'logValidationSuccess',
    userId: req.user?._id?.toString(),
    data: maskSensitive(data),
  });

  recordAuditEvent({
    eventType: 'VALIDATION_SUCCESS',
    userId: req.user?._id,
    metadata: maskSensitive(data),
    sourceFile: SRC,
    sourceFunction: 'logValidationSuccess',
    req,
  });
}

// ─── Customer journey (auth, checkout, confirmation) ───────────────────────

function logUserLogin(user, req, extra = {}) {
  propagateIds({ userId: user?._id || user?.id });
  logger.info('journey', 'User login', {
    sourceFile: SRC,
    sourceFunction: 'logUserLogin',
    userId: user?._id?.toString() || user?.id,
    phoneNumber: user?.phoneNumber,
    ...extra,
  });
  recordAuditEvent({
    eventType: 'USER_LOGIN',
    userId: user?._id || user?.id,
    metadata: maskSensitive({ phoneNumber: user?.phoneNumber, ...extra }),
    sourceFile: SRC,
    sourceFunction: 'logUserLogin',
    req,
  });
}

function logUserLogout(userId, req, extra = {}) {
  logger.info('journey', 'User logout', {
    sourceFile: SRC,
    sourceFunction: 'logUserLogout',
    userId: userId?.toString?.() || userId,
    ...extra,
  });
  recordAuditEvent({
    eventType: 'USER_LOGOUT',
    userId,
    metadata: maskSensitive(extra),
    sourceFile: SRC,
    sourceFunction: 'logUserLogout',
    req,
  });
}

function logProductSelected({ userId, req, metadata }) {
  recordAuditEvent({
    eventType: 'PRODUCT_SELECTED',
    userId,
    metadata: maskSensitive(metadata),
    sourceFile: SRC,
    sourceFunction: 'logProductSelected',
    req,
  });
}

function logCheckoutOpened({ userId, bookingId, transactionId, req, metadata }) {
  propagateIds({ bookingId, transactionId, userId });
  recordAuditEvent({
    eventType: 'CHECKOUT_OPENED',
    userId,
    bookingId,
    transactionId,
    metadata: maskSensitive(metadata),
    sourceFile: SRC,
    sourceFunction: 'logCheckoutOpened',
    req,
  });
}

function logCheckoutSubmitted({ userId, bookingId, transactionId, req, metadata }) {
  propagateIds({ bookingId, transactionId, userId });
  recordAuditEvent({
    eventType: 'CHECKOUT_SUBMITTED',
    userId,
    bookingId,
    transactionId,
    metadata: maskSensitive(metadata),
    sourceFile: SRC,
    sourceFunction: 'logCheckoutSubmitted',
    req,
  });
}

function logCheckoutPayClicked({ userId, bookingId, transactionId, req, metadata }) {
  propagateIds({ bookingId, transactionId, userId });
  recordAuditEvent({
    eventType: 'CHECKOUT_PAY_CLICKED',
    userId,
    bookingId,
    transactionId,
    metadata: maskSensitive(metadata),
    sourceFile: SRC,
    sourceFunction: 'logCheckoutPayClicked',
    req,
  });
}

function logBookingConfirmed({ bookingId, transactionId, userId, req, metadata }) {
  propagateIds({ bookingId, transactionId, userId });
  recordAuditEvent({
    eventType: 'BOOKING_CONFIRMED',
    bookingId,
    transactionId,
    userId,
    newState: 'confirmed',
    metadata: maskSensitive(metadata),
    sourceFile: SRC,
    sourceFunction: 'logBookingConfirmed',
    req,
  });
}

function logPaymentPendingEvent({ booking, txnid, req, gateway = 'payu', metadata }) {
  propagateIds({ bookingId: booking?.bookingId, transactionId: txnid });
  recordAuditEvent({
    eventType: 'PAYMENT_PENDING',
    bookingId: booking?.bookingId,
    bookingObjectId: booking?._id,
    userId: booking?.user?._id || booking?.user,
    transactionId: txnid,
    gateway,
    metadata: maskSensitive(metadata),
    sourceFile: SRC,
    sourceFunction: 'logPaymentPendingEvent',
    req,
  });
}

/**
 * Persist a client-side journey step into AuditLog (from POST /logs/client).
 */
function recordClientJourneyEvent({
  eventType,
  userId,
  bookingId,
  transactionId,
  requestId,
  metadata,
  sourceFile,
  sourceFunction,
  req,
}) {
  const { AUDIT_EVENT_TYPES } = require('../models/AuditLog');
  if (!AUDIT_EVENT_TYPES.includes(eventType)) {
    logger.warn('journey', 'Unknown client journey event type', { eventType });
    return;
  }

  recordAuditEvent({
    eventType,
    userId,
    bookingId,
    transactionId,
    source: 'frontend',
    sourceFile: sourceFile || 'client',
    sourceFunction: sourceFunction || 'recordClientJourneyEvent',
    metadata: maskSensitive(metadata),
    req,
  });
}

module.exports = {
  logBookingRequestReceived,
  logBookingValidationFailed,
  logBookingCreationStarted,
  logBookingCreated,
  logBookingCreationFailed,
  logBookingStatusChange,
  logPaymentInitiated,
  logPayUTransactionIdGenerated,
  logPayUHashGenerated,
  logPayURedirect,
  logPayUCallbackReceived,
  logPayUHashVerification,
  logPaymentSuccess,
  logPaymentFailure,
  logPaymentVerified,
  logDuplicatePayment,
  logPaymentReconciliation,
  logDatabasePaymentUpdate,
  logValidationSuccess,
  logUserLogin,
  logUserLogout,
  logProductSelected,
  logCheckoutOpened,
  logCheckoutSubmitted,
  logCheckoutPayClicked,
  logBookingConfirmed,
  logPaymentPendingEvent,
  recordClientJourneyEvent,
};
