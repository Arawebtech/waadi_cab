/**
 * Authoritative Cashfree payment confirmation.
 * Primary: webhook → API verify → reconciliation.
 * Redirect callbacks are navigation-only; they delegate here but never mark failed on redirect alone.
 */
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const PaymentEvent = require('../models/PaymentEvent');
const cashfreeService = require('./cashfreeService');
const whatsappService = require('../services/whatsappService');
const { emitPaymentVerified } = require('../utils/socketEvents');
const { logPayment } = require('../utils/paymentLogger');

function buildEventKey(orderId, source, suffix = '') {
  return `${orderId}:${source}${suffix ? `:${suffix}` : ''}`;
}

async function recordPaymentEvent({
  orderId,
  bookingId,
  source,
  eventKey,
  eventType,
  status,
  gatewayStatus,
  paymentStatus,
  payload,
  result,
  error,
}) {
  try {
    const existing = await PaymentEvent.findOne({ event_key: eventKey });
    if (existing) {
      logPayment('payment_event_duplicate', { orderId, source, eventKey });
      return { duplicate: true, event: existing };
    }
    const event = await PaymentEvent.create({
      order_id: orderId,
      booking_id: bookingId,
      event_key: eventKey,
      source,
      event_type: eventType,
      status,
      gateway_status: gatewayStatus,
      payment_status: paymentStatus,
      payload,
      result,
      error,
    });
    return { duplicate: false, event };
  } catch (err) {
    if (err.code === 11000) {
      return { duplicate: true };
    }
    logPayment('payment_event_log_error', { orderId, error: err.message });
    return { duplicate: false };
  }
}

async function findBookingByOrderId(orderId) {
  if (!orderId) return null;
  return Booking.findOne({ 'payment_details.transaction_id': orderId })
    .populate('visiting_state', 'name')
    .populate('user', 'firstName lastName phoneNumber email');
}

async function applyTracking(booking, orderId, context = {}) {
  const tracking = await cashfreeService.resolvePaymentTrackingDetails(orderId, context);
  cashfreeService.applyPaymentTrackingToBooking(booking, tracking);

  const webhookPayment = context.webhookPayment;
  if (webhookPayment?.payment_method) {
    booking.payment_details.payment_mode = webhookPayment.payment_method;
  }
  if (webhookPayment?.payment_group) {
    booking.payment_details.payment_group = webhookPayment.payment_group;
  }
}

/**
 * Confirm SUCCESS — idempotent MongoDB update.
 */
async function confirmSuccess({
  orderId,
  verification,
  source,
  webhookPayment,
  webhookOrder,
  eventSuffix = '',
}) {
  logPayment('confirm_success_start', { orderId, source });

  const booking = await findBookingByOrderId(orderId);
  if (!booking) {
    logPayment('confirm_success_no_booking', { orderId, source });
    await recordPaymentEvent({
      orderId,
      source,
      eventKey: buildEventKey(orderId, source, eventSuffix || 'no-booking'),
      status: 'failed',
      error: 'BOOKING_NOT_FOUND',
    });
    return { ok: false, reason: 'BOOKING_NOT_FOUND' };
  }

  if (!verification?.verified) {
    return { ok: false, reason: 'NOT_VERIFIED', booking };
  }

  if (!cashfreeService.amountsMatch(verification.amount, booking.amount)) {
    logPayment('confirm_success_amount_mismatch', {
      orderId,
      expected: booking.amount,
      received: verification.amount,
    });
    return { ok: false, reason: 'AMOUNT_MISMATCH', booking };
  }

  const eventKey = buildEventKey(
    orderId,
    source,
    eventSuffix || webhookPayment?.cf_payment_id || verification.paymentId || 'success'
  );

  if (booking.status === 'paid' && booking.payment_status === 'paid') {
    await recordPaymentEvent({
      orderId,
      bookingId: booking.bookingId,
      source,
      eventKey,
      eventType: 'PAYMENT_ALREADY_CONFIRMED',
      status: 'skipped',
      gatewayStatus: verification.status,
      paymentStatus: 'SUCCESS',
      result: { alreadyPaid: true },
    });
    if (!booking.payment_details?.payment_transaction_id) {
      booking.payment_details = booking.payment_details || {};
      await applyTracking(booking, orderId, { verification, webhookPayment, webhookOrder });
      await booking.save();
    }
    return { ok: true, alreadyPaid: true, booking };
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const locked = await Booking.findById(booking._id).session(session);
    if (!locked) {
      await session.abortTransaction();
      return { ok: false, reason: 'BOOKING_NOT_FOUND' };
    }

    if (locked.status === 'paid') {
      await session.abortTransaction();
      return { ok: true, alreadyPaid: true, booking: locked };
    }

    locked.status = 'paid';
    locked.payment_status = 'paid';
    locked.payment_details = locked.payment_details || {};
    locked.payment_details.payment_method = 'cashfree';
    locked.payment_details.paid_at = new Date();
    locked.payment_details.verification_method = `cashfree_${source}`;

    await applyTracking(locked, orderId, { verification, webhookPayment, webhookOrder });
    await locked.save({ session });

    const gatewayPaymentId =
      webhookPayment?.cf_payment_id?.toString() ||
      verification.paymentId?.toString() ||
      locked.payment_details.payment_transaction_id ||
      '';

    const responseData = {
      order: webhookOrder || verification.rawData || {},
      payment: webhookPayment || verification.paymentDetails || {},
      verification_status: verification.status,
      source,
    };

    let payment = await Payment.findOne({ txn_id: orderId }).session(session);
    if (!payment) {
      payment = new Payment({
        txn_id: orderId,
        payu_payment_id: gatewayPaymentId,
        bank_ref_number: locked.payment_details.bank_reference || undefined,
        amount: parseFloat(verification.amount) || locked.amount,
        status: 'success',
        payment_method: 'cashfree',
        user: locked.user,
        booking: locked._id,
        verified: true,
        response_data: responseData,
      });
      await payment.save({ session });
    } else {
      payment.status = 'success';
      payment.verified = true;
      if (gatewayPaymentId) payment.payu_payment_id = gatewayPaymentId;
      payment.response_data = responseData;
      await payment.save({ session });
    }

    await session.commitTransaction();

    await locked.populate([
      { path: 'visiting_state', select: 'name' },
      { path: 'user', select: 'firstName lastName phoneNumber email' },
    ]);

    await recordPaymentEvent({
      orderId,
      bookingId: locked.bookingId,
      source,
      eventKey,
      eventType: 'PAYMENT_SUCCESS',
      status: 'processed',
      gatewayStatus: verification.status,
      paymentStatus: 'SUCCESS',
      result: { bookingId: locked.bookingId, paymentId: payment.id },
    });

    logPayment('confirm_success_done', {
      orderId,
      source,
      bookingId: locked.bookingId,
      amount: locked.amount,
    });

    emitPaymentVerified(locked, {
      gateway: 'cashfree',
      source,
      payment: payment.getSummary(),
    });

    if (whatsappService.isReady) {
      whatsappService.sendPaymentConfirmation(locked, locked.user).catch(() => {});
    }

    return { ok: true, newlyConfirmed: true, booking: locked, payment };
  } catch (error) {
    await session.abortTransaction();
    logPayment('confirm_success_error', { orderId, source, error: error.message });
    throw error;
  } finally {
    session.endSession();
  }
}

/**
 * Mark FAILED only when Cashfree API confirms failure (not redirect alone).
 */
async function confirmFailed({ orderId, reason, source, webhookPayment, webhookOrder, verification }) {
  const booking = await findBookingByOrderId(orderId);
  if (!booking || booking.status === 'paid') {
    return { ok: false, reason: 'SKIP' };
  }

  booking.payment_status = 'failed';
  booking.payment_details = booking.payment_details || {};
  booking.payment_details.failure_reason = reason || 'Payment failed';
  await booking.save();

  let payment = await Payment.findOne({ txn_id: orderId });
  if (!payment) {
    payment = new Payment({
      txn_id: orderId,
      amount: booking.amount,
      status: 'failure',
      payment_method: 'cashfree',
      user: booking.user._id || booking.user,
      booking: booking._id,
      verified: false,
      failure_reason: reason,
      response_data: { order: webhookOrder, payment: webhookPayment, verification },
    });
    await payment.save();
  }

  await recordPaymentEvent({
    orderId,
    bookingId: booking.bookingId,
    source,
    eventKey: buildEventKey(orderId, source, 'failed'),
    eventType: 'PAYMENT_FAILED',
    status: 'processed',
    gatewayStatus: verification?.status,
    paymentStatus: 'FAILED',
    result: { reason },
  });

  logPayment('confirm_failed', { orderId, source, bookingId: booking.bookingId, reason });
  return { ok: true, booking };
}

/**
 * Verify via Cashfree API and confirm if SUCCESS.
 */
async function verifyAndConfirm(orderId, source, options = {}) {
  const useRetry = options.useRetry !== false;
  const verification = useRetry
    ? await cashfreeService.verifyOrderWithRetry(orderId, options.retryOptions)
    : await cashfreeService.verifyOrder(orderId);

  logPayment('cashfree_api_verify', {
    orderId,
    source,
    verified: verification.verified,
    status: verification.status,
  });

  if (verification.verified) {
    const result = await confirmSuccess({
      orderId,
      verification,
      source,
      eventSuffix: verification.paymentId,
    });
    return { ...result, verification };
  }

  const upper = (verification.status || '').toUpperCase();
  if (upper === 'FAILED' || upper === 'CANCELLED' || upper === 'EXPIRED') {
    const result = await confirmFailed({
      orderId,
      reason: `Cashfree order status: ${upper}`,
      source,
      verification,
    });
    return { ...result, verification };
  }

  return { ok: false, reason: 'PENDING', verification };
}

/**
 * Process Cashfree PAYMENT_SUCCESS_WEBHOOK.
 */
async function processWebhookSuccess(orderData, paymentData) {
  const orderId = orderData.order_id;
  if (!orderId) return { ok: false, reason: 'NO_ORDER_ID' };

  const paymentStatus = (paymentData.payment_status || '').toUpperCase();
  if (paymentStatus !== 'SUCCESS') {
    logPayment('webhook_skipped_not_success', { orderId, paymentStatus });
    return { ok: false, reason: 'NOT_SUCCESS' };
  }

  const verification = await cashfreeService.verifyOrder(orderId);
  if (!verification.verified) {
    logPayment('webhook_api_verify_pending', { orderId, status: verification.status });
    return { ok: false, reason: 'API_NOT_VERIFIED', verification };
  }

  return confirmSuccess({
    orderId,
    verification,
    source: 'webhook',
    webhookPayment: paymentData,
    webhookOrder: orderData,
    eventSuffix: paymentData.cf_payment_id?.toString(),
  });
}

async function processWebhookFailed(orderData, paymentData, eventType) {
  const orderId = orderData.order_id;
  if (!orderId) return { ok: false };

  const verification = await cashfreeService.verifyOrder(orderId);
  if (verification.verified) {
    logPayment('webhook_failed_but_api_paid', { orderId, eventType });
    return verifyAndConfirm(orderId, 'webhook-recheck', { useRetry: false });
  }

  return confirmFailed({
    orderId,
    reason: paymentData.payment_message || eventType,
    source: 'webhook',
    webhookPayment: paymentData,
    webhookOrder: orderData,
    verification,
  });
}

/**
 * Redirect outcome from DB + optional quick API check (never trust redirect alone for failure).
 */
async function getRedirectOutcome(orderId, options = {}) {
  let booking = await findBookingByOrderId(orderId);
  if (!booking) {
    return { outcome: 'failure', booking: null, error: 'Booking not found' };
  }

  if (options.tryConfirm !== false) {
    await verifyAndConfirm(orderId, 'redirect', { useRetry: true });
    booking = await findBookingByOrderId(orderId);
  }

  if (booking.status === 'paid' && booking.payment_status === 'paid') {
    return { outcome: 'success', booking };
  }

  if (booking.payment_status === 'failed') {
    return { outcome: 'failure', booking };
  }

  return { outcome: 'pending', booking };
}

module.exports = {
  confirmSuccess,
  confirmFailed,
  verifyAndConfirm,
  processWebhookSuccess,
  processWebhookFailed,
  getRedirectOutcome,
  findBookingByOrderId,
  recordPaymentEvent,
};
