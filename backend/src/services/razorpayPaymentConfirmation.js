/**
 * Authoritative Razorpay payment confirmation.
 * Primary: webhook → API verify → reconciliation.
 */
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const PaymentEvent = require('../models/PaymentEvent');
const razorpayService = require('./razorpayService');
const whatsappService = require('../services/whatsappService');
const { emitPaymentVerified } = require('../utils/socketEvents');
const { logPayment } = require('../utils/paymentLogger');

function buildEventKey(orderId, source, suffix = '') {
  return `rzp:${orderId}:${source}${suffix ? `:${suffix}` : ''}`;
}

async function recordPaymentEvent(data) {
  try {
    const existing = await PaymentEvent.findOne({ event_key: data.eventKey });
    if (existing) {
      logPayment('razorpay_payment_event_duplicate', { orderId: data.orderId, source: data.source });
      return { duplicate: true, event: existing };
    }
    const event = await PaymentEvent.create({
      order_id: data.orderId,
      booking_id: data.bookingId,
      event_key: data.eventKey,
      source: data.source,
      event_type: data.eventType,
      status: data.status,
      gateway_status: data.gatewayStatus,
      payment_status: data.paymentStatus,
      payload: data.payload,
      result: data.result,
      error: data.error,
    });
    return { duplicate: false, event };
  } catch (err) {
    if (err.code === 11000) return { duplicate: true };
    return { duplicate: false };
  }
}

async function findBookingByTxnId(txnId) {
  if (!txnId) return null;
  return Booking.findOne({ 'payment_details.transaction_id': txnId })
    .populate('visiting_state', 'name')
    .populate('user', 'firstName lastName phoneNumber email');
}

async function findBookingByRazorpayOrderId(razorpayOrderId) {
  if (!razorpayOrderId) return null;
  return Booking.findOne({ 'payment_details.razorpay_order_id': razorpayOrderId })
    .populate('visiting_state', 'name')
    .populate('user', 'firstName lastName phoneNumber email');
}

async function applyTracking(booking, txnId, context = {}) {
  const tracking = await razorpayService.resolvePaymentTrackingDetails(txnId, context);
  razorpayService.applyPaymentTrackingToBooking(booking, tracking);
  const webhookPayment = context.webhookPayment;
  if (webhookPayment?.method) {
    booking.payment_details.payment_mode = webhookPayment.method;
  }
}

async function confirmSuccess({
  orderId,
  verification,
  source,
  webhookPayment,
  webhookOrder,
  eventSuffix = '',
}) {
  logPayment('razorpay_confirm_success_start', { orderId, source });

  const booking = await findBookingByTxnId(orderId);
  if (!booking) {
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

  if (!razorpayService.amountsMatch(verification.amount, booking.amount)) {
    return { ok: false, reason: 'AMOUNT_MISMATCH', booking };
  }

  const eventKey = buildEventKey(
    orderId,
    source,
    eventSuffix || webhookPayment?.id || verification.paymentId || 'success'
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
    locked.payment_details.payment_method = 'razorpay';
    locked.payment_details.paid_at = new Date();
    locked.payment_details.verification_method = `razorpay_${source}`;

    await applyTracking(locked, orderId, { verification, webhookPayment, webhookOrder });
    await locked.save({ session });

    const gatewayPaymentId =
      webhookPayment?.id?.toString() ||
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
        amount: parseFloat(verification.amount) || locked.amount,
        status: 'success',
        payment_method: 'razorpay',
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

    emitPaymentVerified(locked, {
      gateway: 'razorpay',
      source,
      payment: payment.getSummary(),
    });

    if (whatsappService.isReady) {
      whatsappService.sendPaymentConfirmation(locked, locked.user).catch(() => {});
    }

    return { ok: true, newlyConfirmed: true, booking: locked, payment };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

async function confirmFailed({ orderId, reason, source, verification }) {
  const booking = await findBookingByTxnId(orderId);
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
      payment_method: 'razorpay',
      user: booking.user._id || booking.user,
      booking: booking._id,
      verified: false,
      failure_reason: reason,
      response_data: { verification },
    });
    await payment.save();
  }

  return { ok: true, booking };
}

async function verifyAndConfirm(txnId, source, options = {}) {
  const booking = options.booking || (await findBookingByTxnId(txnId));
  const context = {
    booking,
    razorpayOrderId: options.razorpayOrderId || booking?.payment_details?.razorpay_order_id,
  };

  const useRetry = options.useRetry !== false;
  const verification = useRetry
    ? await razorpayService.verifyOrderWithRetry(txnId, { context })
    : await razorpayService.verifyOrder(txnId, context);

  logPayment('razorpay_api_verify', {
    orderId: txnId,
    source,
    verified: verification.verified,
    status: verification.status,
  });

  if (verification.verified) {
    const result = await confirmSuccess({
      orderId: txnId,
      verification,
      source,
      eventSuffix: verification.paymentId,
    });
    return { ...result, verification };
  }

  const upper = (verification.status || '').toUpperCase();
  if (upper === 'FAILED' || upper === 'CANCELLED') {
    const result = await confirmFailed({
      orderId: txnId,
      reason: `Razorpay order status: ${upper}`,
      source,
      verification,
    });
    return { ...result, verification };
  }

  return { ok: false, reason: 'PENDING', verification, booking };
}

async function confirmFromPaymentCallback({
  txnId,
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
  source = 'redirect',
}) {
  if (
    !razorpayService.verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)
  ) {
    logPayment('razorpay_callback_invalid_signature', { txnId, razorpayOrderId });
    return { ok: false, reason: 'INVALID_SIGNATURE' };
  }

  const booking = (await findBookingByTxnId(txnId)) || (await findBookingByRazorpayOrderId(razorpayOrderId));
  if (!booking) {
    return { ok: false, reason: 'BOOKING_NOT_FOUND' };
  }

  const orderId = booking.payment_details.transaction_id;
  return verifyAndConfirm(orderId, source, {
    useRetry: true,
    razorpayOrderId,
    booking,
  });
}

async function processWebhookEvent(payload) {
  const event = payload.event || '';
  const paymentEntity = payload.payload?.payment?.entity || payload.payload?.payment || {};
  const orderEntity = payload.payload?.order?.entity || payload.payload?.order || {};

  const razorpayOrderId = paymentEntity.order_id || orderEntity.id;
  const receipt = orderEntity.receipt;
  let booking = receipt ? await findBookingByTxnId(receipt) : null;
  if (!booking && razorpayOrderId) {
    booking = await findBookingByRazorpayOrderId(razorpayOrderId);
  }

  const txnId = booking?.payment_details?.transaction_id || receipt;
  if (!txnId) {
    logPayment('razorpay_webhook_no_txn', { event, razorpayOrderId });
    return { ok: false, reason: 'NO_TXN_ID' };
  }

  if (event === 'payment.captured' || paymentEntity.status === 'captured') {
    const verification = await razorpayService.verifyOrder(txnId, {
      booking,
      razorpayOrderId,
    });
    if (!verification.verified) {
      return { ok: false, reason: 'API_NOT_VERIFIED', verification };
    }
    return confirmSuccess({
      orderId: txnId,
      verification,
      source: 'webhook',
      webhookPayment: paymentEntity,
      webhookOrder: orderEntity,
      eventSuffix: paymentEntity.id?.toString(),
    });
  }

  if (event === 'payment.failed' || paymentEntity.status === 'failed') {
    const verification = await razorpayService.verifyOrder(txnId, { booking, razorpayOrderId });
    if (verification.verified) {
      return verifyAndConfirm(txnId, 'webhook-recheck', { useRetry: false, booking });
    }
    return confirmFailed({
      orderId: txnId,
      reason: paymentEntity.error_description || event,
      source: 'webhook',
      verification,
    });
  }

  logPayment('razorpay_webhook_ignored', { event, txnId });
  return { ok: false, reason: 'IGNORED' };
}

async function getRedirectOutcome(txnId, options = {}) {
  let booking = await findBookingByTxnId(txnId);
  if (!booking) {
    return { outcome: 'failure', booking: null, error: 'Booking not found' };
  }

  if (options.razorpayOrderId && options.razorpayPaymentId && options.razorpaySignature) {
    await confirmFromPaymentCallback({
      txnId,
      razorpayOrderId: options.razorpayOrderId,
      razorpayPaymentId: options.razorpayPaymentId,
      razorpaySignature: options.razorpaySignature,
      source: 'redirect',
    });
    booking = await findBookingByTxnId(txnId);
  } else if (options.tryConfirm !== false) {
    await verifyAndConfirm(txnId, 'redirect', { useRetry: true, booking });
    booking = await findBookingByTxnId(txnId);
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
  confirmFromPaymentCallback,
  processWebhookEvent,
  getRedirectOutcome,
  findBookingByTxnId,
  findBookingByRazorpayOrderId,
};
