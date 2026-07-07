const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const AppError = require('../utils/AppError');
const env = require('../config/env');
const { getRazorpayInstance, isDevMode } = require('../config/razorpay');
const {
  validateObjectId,
  validateOwnerType,
  validatePurpose,
  validateAmount,
} = require('../utils/paymentValidators');

const { Payment, WalletTransaction, User, SubscriptionPlan } = require('../models');
const auditService = require('./audit.service');
const subscriptionService = require('./subscription.service');

// -----------------------------------------------------------------------
// Small logging helper — gives every step the
// "============ TITLE ============" block format requested.
// -----------------------------------------------------------------------
function logStep(title, data = {}) {
  console.log('================================');
  console.log(title);
  Object.entries(data).forEach(([key, value]) => {
    const printable =
      value && typeof value === 'object' ? JSON.stringify(value) : String(value);
    console.log(`${key}: ${printable}`);
  });
  console.log('================================');
}

function logError(context, err) {
  console.error('--------------------------------------------------');
  console.error(`[PAYMENT SERVICE ERROR] ${context}`);
  console.error('Message:', err?.message);
  console.error('Stack:', err?.stack);
  console.error('--------------------------------------------------');
}

// -----------------------------------------------------------------------
// Purpose-specific handlers. Each purpose defines how to validate its
// metadata before charging the customer, and how to fulfill it after a
// successful/verified payment. Adding a new purpose = adding one entry
// here, nothing else in this file needs to change.
// -----------------------------------------------------------------------
const PURPOSE_HANDLERS = {
  subscription: {
    /** Runs BEFORE the order is created — fail fast on a bad/missing plan. */
    async validate({ metadata }) {
      const planId = validateObjectId(metadata?.planId, 'planId');
      const plan = await SubscriptionPlan.findOne({ _id: planId, isActive: true }).lean();
      if (!plan) {
        throw new AppError('Subscription plan not found or is no longer active', 404);
      }
      return plan;
    },

    /** Runs AFTER payment is verified/paid. */
    async fulfill({ ownerId, metadata, transactionId }) {
      // Reuses the existing, already-battle-tested activation logic
      // (creates Subscription, SubscriptionHistory, Notification, audit log).
      return subscriptionService.activatePlanAfterPayment(
        ownerId,
        metadata.planId,
        transactionId
      );
    },
  },

  wallet_topup: {
    async validate({ amount }) {
      // amount is already validated as > 0 generically; nothing extra
      // required for wallet top-ups today, but kept as an explicit step so
      // future rules (min/max top-up, KYC threshold, etc.) have a home.
      return null;
    },

    async fulfill({ ownerId, amount, paymentDoc }) {
      return creditWallet(ownerId, amount, paymentDoc._id, 'wallet_topup');
    },
  },

  booking: {
    async validate({ metadata }) {
      validateObjectId(metadata?.bookingId, 'bookingId');
      // NOTE: No Booking model was included in the provided codebase, so we
      // can only validate the id shape here, not that the booking actually
      // exists / belongs to this owner / is in a payable state. Add that
      // check here once the Booking model is available.
    },

    async fulfill() {
      // Deliberately explicit rather than silently no-op-ing: a booking
      // payment that "succeeds" but does nothing is worse than one that
      // loudly fails and gets caught in QA/staging.
      throw new AppError(
        'Booking payment fulfillment is not implemented yet. Wire this up once the Booking model/service is available.',
        501
      );
    },
  },
};

function getPurposeHandler(purpose) {
  const handler = PURPOSE_HANDLERS[purpose];
  if (!handler) {
    // Should be unreachable because validatePurpose() already checked this,
    // but defensive-programming requirement #8 says: never assume.
    throw new AppError(`No handler registered for purpose "${purpose}"`, 400);
  }
  return handler;
}

// -----------------------------------------------------------------------
// createOrder
// -----------------------------------------------------------------------
/**
 * @param {string} ownerId
 * @param {'Driver'|'Customer'} ownerType
 * @param {{purpose: string, amount: number, metadata?: object}} payload
 */
async function createOrder(ownerId, ownerType, payload) {
  const { purpose, amount, metadata = {} } = payload || {};
  const devMode = isDevMode();

  logStep('PAYMENT CREATE ORDER', {
    ownerId,
    ownerType,
    purpose,
    amount,
    metadata,
    isDevMode: devMode,
  });

  try {
    // ---- 1. Validation -----------------------------------------------
    // validateObjectId(ownerId, 'ownerId');
    validateOwnerType(ownerType);
    validatePurpose(purpose);
    const numericAmount = validateAmount(amount);

    const handler = getPurposeHandler(purpose);
    await handler.validate({ ownerId, amount: numericAmount, metadata });

    console.log('[PAYMENT] validation success');

    // ---- 2. Create the order (real or fake) ---------------------------
    let razorpayOrderId;
    let razorpayKeyId = null;

    if (devMode) {
      // No SDK call, no network call — fully offline.
      razorpayOrderId = `order_dev_${uuidv4().replace(/-/g, '').slice(0, 20)}`;
      console.log('[PAYMENT] DEV MODE ENABLED -> Razorpay skipped');
      console.log('[PAYMENT] generated fake order id:', razorpayOrderId);
    } else {
      console.log('[PAYMENT] initializing Razorpay SDK...');
      const razorpay = getRazorpayInstance();

      console.log('[PAYMENT] creating Razorpay order...');
      let order;
      try {
        order = await razorpay.orders.create({
          amount: Math.round(numericAmount * 100), // paise
          currency: 'INR',
          receipt: `rcpt_${purpose}_${Date.now()}`,
          notes: { ownerId: String(ownerId), ownerType, purpose, ...metadata },
        });
      } catch (gatewayErr) {
        // Razorpay errors have their own shape — surface something useful
        // instead of a generic 500.
        logError('Razorpay order creation failed', gatewayErr);
        throw new AppError(
          gatewayErr?.error?.description || 'Failed to create payment order with the gateway',
          502
        );
      }

      razorpayOrderId = order.id;
      razorpayKeyId = env.razorpay.keyId;
      console.log('[PAYMENT] Razorpay order created:', razorpayOrderId);
    }

    // ---- 3. Persist the order in Mongo ---------------------------------
    let paymentDoc;
    try {
      paymentDoc = await Payment.create({
        ownerId,
        ownerType,
        purpose,
        amount: numericAmount,
        currency: 'INR',
        status: 'created',
        fulfillmentStatus: 'pending',
        razorpayOrderId,
        isDevPayment: devMode,
        metadata,
      });
      console.log('[PAYMENT] Mongo save success, paymentId:', paymentDoc._id.toString());
    } catch (dbErr) {
      logError('Mongo save failed while creating payment record', dbErr);
      if (dbErr?.code === 11000) {
        // Extremely unlikely (uuid/razorpay id collision) but handled anyway.
        throw new AppError('Duplicate order detected, please retry', 409);
      }
      throw new AppError('Failed to record payment order', 500);
    }

    // ---- 4. Audit log ----------------------------------------------------
    try {
      await auditService.log({
        actorType: ownerType.toLowerCase(),
        actorId: ownerId,
        action: 'payment_order_created',
        resource: 'Payment',
        resourceId: paymentDoc._id,
        metadata: { purpose, amount: numericAmount, devMode, razorpayOrderId },
      });
      console.log('[PAYMENT] audit log recorded');
    } catch (auditErr) {
      // Audit logging must never break the primary flow — log and move on.
      logError('Audit log failed (non-fatal) after order creation', auditErr);
    }

    return {
      orderId: razorpayOrderId,
      paymentId: paymentDoc._id,
      amount: numericAmount,
      currency: 'INR',
      keyId: razorpayKeyId, // null in dev mode — frontend should branch on devMode
      devMode,
    };
  } catch (err) {
    if (err instanceof AppError) {
      // Expected/business error — already meaningful, just log context and rethrow.
      logError('createOrder (business error)', err);
      throw err;
    }
    // Unexpected error (DB down, bug, etc.)
    logError('createOrder (unexpected error)', err);
    throw new AppError('Failed to create payment order', 500);
  }
}


function verifyPaymentSignature({ orderId, paymentId, signature }) {
  try {
    if (!orderId || !paymentId || !signature) {
      throw new AppError('orderId, paymentId and signature are all required for verification', 400);
    }

    const secret = env.razorpay.keySecret;
    if (!secret) {
      throw new AppError('Razorpay secret is not configured on the server', 500);
    }

    const expected = crypto
      .createHmac('sha256', secret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const expectedBuf = Buffer.from(expected);
    const actualBuf = Buffer.from(signature);

    const isValid =
      expectedBuf.length === actualBuf.length &&
      crypto.timingSafeEqual(expectedBuf, actualBuf);

    console.log('[PAYMENT] signature verification result:', isValid);
    return isValid;
  } catch (err) {
    if (err instanceof AppError) throw err;
    logError('verifyPaymentSignature', err);
    throw new AppError('Signature verification failed due to a server error', 500);
  }
}

// -----------------------------------------------------------------------
// verifyAndFulfill — the production (real Razorpay) verification path
// -----------------------------------------------------------------------
async function verifyAndFulfill({
  razorpay_order_id: razorpayOrderId,
  razorpay_payment_id: razorpayPaymentId,
  razorpay_signature: razorpaySignature,
  ownerId,
  ownerType,
}) {
  logStep('PAYMENT VERIFY', {
    razorpayOrderId,
    razorpayPaymentId,
    ownerId,
    ownerType,
  });

  try {
    // ---- 1. Validation --------------------------------------------------
    const orderId = razorpayOrderId?.trim();
    const paymentId = razorpayPaymentId?.trim();
    const signature = razorpaySignature?.trim();
    if (!orderId || !paymentId || !signature) {
      throw new AppError('razorpay_order_id, razorpay_payment_id and razorpay_signature are required', 400);
    }
    validateObjectId(ownerId, 'ownerId');
    validateOwnerType(ownerType);

    // ---- 2. Look up the order & ownership check --------------------------
    const payment = await Payment.findOne({ razorpayOrderId: orderId });
    if (!payment) {
      throw new AppError('Payment order not found', 404);
    }
    if (String(payment.ownerId) !== String(ownerId)) {
      // Prevents one user from "verifying"/claiming someone else's order.
      throw new AppError('This payment order does not belong to the current user', 403);
    }

    // ---- 3. Idempotency: handle already-paid orders ----------------------
    if (payment.status === 'paid') {
      console.log('[PAYMENT] order already verified/paid — returning existing result (idempotent)');
      return {
        payment,
        alreadyProcessed: true,
        fulfillment:
          payment.fulfillmentStatus === 'completed'
            ? { note: 'already fulfilled previously' }
            : null,
      };
    }
    if (payment.status === 'failed' || payment.status === 'refunded') {
      throw new AppError(`This payment order is already marked as ${payment.status}`, 409);
    }

    // ---- 4. Verify signature ----------------------------------------------
    const isValid = verifyPaymentSignature({ orderId, paymentId, signature });
    if (!isValid) {
      payment.status = 'failed';
      payment.failureReason = 'Signature mismatch';
      await payment.save().catch((e) => logError('saving failed-signature payment', e));
      throw new AppError('Payment signature verification failed', 400);
    }
    console.log('[PAYMENT] signature verified successfully');

    // ---- 5. Atomically flip created -> paid (prevents double-processing) --
    const updatedPayment = await Payment.findOneAndUpdate(
      { _id: payment._id, status: 'created' },
      {
        $set: {
          status: 'paid',
          razorpayPaymentId: paymentId,
          razorpaySignature: signature,
        },
      },
      { new: true }
    );

    if (!updatedPayment) {
      // Someone else (e.g. a concurrent webhook call) processed it first
      // between our read and write. Treat as idempotent success.
      console.log('[PAYMENT] concurrent processing detected — order already transitioned, treating as success');
      const latest = await Payment.findById(payment._id);
      return { payment: latest, alreadyProcessed: true, fulfillment: null };
    }

    console.log('[PAYMENT] payment marked as paid, paymentId:', updatedPayment._id.toString());

    // ---- 6. Fulfill (subscription activation / wallet credit / booking) --
    const fulfillment = await runFulfillment(updatedPayment);

    // ---- 7. Audit log ------------------------------------------------------
    await auditService
      .log({
        actorType: ownerType.toLowerCase(),
        actorId: ownerId,
        action: 'payment_verified',
        resource: 'Payment',
        resourceId: updatedPayment._id,
        metadata: { purpose: updatedPayment.purpose, razorpayPaymentId: paymentId },
      })
      .catch((e) => logError('audit log failed (non-fatal) after verify', e));

    return { payment: updatedPayment, alreadyProcessed: false, fulfillment };
  } catch (err) {
    if (err instanceof AppError) {
      logError('verifyAndFulfill (business error)', err);
      throw err;
    }
    logError('verifyAndFulfill (unexpected error)', err);
    throw new AppError('Payment verification failed', 500);
  }
}

// -----------------------------------------------------------------------
// devVerify — the development-only, no-gateway verification path
// -----------------------------------------------------------------------
async function devVerify(orderId, ownerId, ownerType) {
  logStep('PAYMENT DEV VERIFY', { orderId, ownerId, ownerType, isDevMode: isDevMode() });

  try {
    if (!isDevMode()) {
      // Hard stop — this endpoint must be completely inert outside dev mode,
      // no matter what the client sends.
      throw new AppError('Dev verification is not available outside development mode', 403);
    }

    validateObjectId(ownerId, 'ownerId');
    validateOwnerType(ownerType);
    if (!orderId) {
      throw new AppError('orderId is required', 400);
    }

    const payment = await Payment.findOne({ razorpayOrderId: orderId });
    if (!payment) {
      throw new AppError('Payment order not found', 404);
    }
    if (String(payment.ownerId) !== String(ownerId)) {
      throw new AppError('This payment order does not belong to the current user', 403);
    }
    if (!payment.isDevPayment) {
      throw new AppError('This order was not created in dev mode and cannot be dev-verified', 400);
    }

    if (payment.status === 'paid') {
      console.log('[PAYMENT] dev order already verified — returning existing result (idempotent)');
      return { payment, alreadyProcessed: true, fulfillment: null };
    }

    const fakeTransactionId = `dev_${uuidv4().slice(0, 12)}`;

    const updatedPayment = await Payment.findOneAndUpdate(
      { _id: payment._id, status: 'created' },
      { $set: { status: 'paid', razorpayPaymentId: fakeTransactionId } },
      { new: true }
    );

    if (!updatedPayment) {
      const latest = await Payment.findById(payment._id);
      return { payment: latest, alreadyProcessed: true, fulfillment: null };
    }

    console.log('[PAYMENT] dev payment auto-verified, transactionId:', fakeTransactionId);

    const fulfillment = await runFulfillment(updatedPayment);

    await auditService
      .log({
        actorType: ownerType.toLowerCase(),
        actorId: ownerId,
        action: 'payment_dev_verified',
        resource: 'Payment',
        resourceId: updatedPayment._id,
        metadata: { purpose: updatedPayment.purpose, transactionId: fakeTransactionId },
      })
      .catch((e) => logError('audit log failed (non-fatal) after devVerify', e));

    return { payment: updatedPayment, alreadyProcessed: false, fulfillment };
  } catch (err) {
    if (err instanceof AppError) {
      logError('devVerify (business error)', err);
      throw err;
    }
    logError('devVerify (unexpected error)', err);
    throw new AppError('Dev payment verification failed', 500);
  }
}

// -----------------------------------------------------------------------
// runFulfillment — shared by verifyAndFulfill and devVerify
// -----------------------------------------------------------------------
/**
 * Dispatches to the correct purpose handler AFTER the payment is already
 * marked 'paid'. Because money has already moved at this point, a failure
 * here is a critical, separately-tracked condition (fulfillmentStatus:
 * 'failed') rather than something we roll the payment back for — refunding
 * automatically is a business decision, not a safe default, so we surface
 * this loudly instead of guessing.
 */
async function runFulfillment(paymentDoc) {
  const handler = getPurposeHandler(paymentDoc.purpose);

  try {
    const result = await handler.fulfill({
      ownerId: paymentDoc.ownerId,
      ownerType: paymentDoc.ownerType,
      amount: paymentDoc.amount,
      metadata: paymentDoc.metadata,
      transactionId: paymentDoc.razorpayPaymentId,
      paymentDoc,
    });

    paymentDoc.fulfillmentStatus = 'completed';
    await paymentDoc.save();
    console.log(`[PAYMENT] fulfillment completed for purpose "${paymentDoc.purpose}"`);
    return result;
  } catch (fulfillErr) {
    // CRITICAL: payment succeeded at the gateway but activation/credit
    // failed. Never swallow this — mark it for manual reconciliation and
    // still inform the caller clearly.
    logError(
      `CRITICAL: payment ${paymentDoc._id} succeeded but fulfillment failed for purpose "${paymentDoc.purpose}"`,
      fulfillErr
    );

    paymentDoc.fulfillmentStatus = 'failed';
    paymentDoc.fulfillmentError = fulfillErr?.message || 'Unknown fulfillment error';
    await paymentDoc.save().catch((e) => logError('saving fulfillmentStatus=failed', e));

    // Re-throw as AppError so the controller returns a clear (but non-5xx-scary
    // when possible) response telling the user their money was taken but
    // support needs to be contacted — this is much better than silently
    // returning 200 OK with nothing actually granted.
    throw new AppError(
      'Payment was received, but activation failed. Our team has been notified — please contact support with your payment id.',
      500,
      { paymentId: paymentDoc._id, purpose: paymentDoc.purpose }
    );
  }
}

// -----------------------------------------------------------------------
// Wallet flow
// -----------------------------------------------------------------------
/**
 * Credits a Driver's wallet and writes an immutable ledger entry.
 * Uses an atomic $inc so concurrent credits can never race/overwrite.
 */


async function creditWallet(driverId, amount, paymentId, reason = 'wallet_topup') {
  try {
    if (amount <= 0) {
      throw new AppError('Wallet credit amount must be greater than 0', 400);
    }

    const rider = await User.findByIdAndUpdate(
      driverId,
      { $inc: { walletBalance: amount } },
      { new: true }
    );

    if (!rider) {
      throw new AppError('User not found while crediting wallet', 404);
    }

    console.log('[WALLET] credited', amount, '-> new balance:', rider.walletBalance);

    const ledgerEntry = await WalletTransaction.create({
      driverId,
      type: 'credit',
      amount,
      balanceAfter: rider.walletBalance,
      reason,
      paymentId,
    });
    console.log('[WALLET] ledger entry recorded:', ledgerEntry._id.toString());

    await auditService
      .log({
        actorType: 'rider',
        actorId: driverId,
        action: 'wallet_credit',
        resource: 'WalletTransaction',
        resourceId: ledgerEntry._id,
        metadata: { amount, paymentId, newBalance: rider.walletBalance },
      })
      .catch((e) => logError('audit log failed (non-fatal) after wallet credit', e));

    return { walletBalance: rider.walletBalance, transaction: ledgerEntry };
  } catch (err) {
    if (err instanceof AppError) throw err;
    logError('creditWallet', err);
    throw new AppError('Failed to credit wallet', 500);
  }
}

module.exports = {
  createOrder,
  verifyPaymentSignature,
  verifyAndFulfill,
  devVerify,
  creditWallet,
};