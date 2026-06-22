/**
 * cashfreeController.js
 *
 * Handles all Cashfree-specific payment routes.
 * Intentionally mirrors the structure of the existing paymentController.js
 * so both controllers share the same style and are easy to maintain together.
 *
 * Routes mounted at /api/v1/payment/cashfree/* via cashfreeRoutes.js
 */

const Booking = require('../models/Booking');
const User = require('../models/User');
const Payment = require('../models/Payment');
const cashfreeService = require('../services/cashfreeService');
const whatsappService = require('../services/whatsappService');
const saveCustomerLog = require('../utils/saveCustomerLog');

class CashfreeController {
  // ─── POST /payment/cashfree/initiate ──────────────────────────────────────
  /**
   * Called by the React checkout page right after the user taps "Pay Now".
   * Creates a Cashfree order and returns the payment_session_id
   * that the frontend Cashfree JS SDK needs to open the checkout modal.
   */
  async initiatePayment(req, res) {
    try {
      const { bookingId } = req.body;
      const userId = req.user._id;

      if (!bookingId) {
        return res.status(400).json({
          success: false,
          message: 'bookingId is required',
        });
      }

      // Load the booking (must belong to this user and be in "pending" state)
      const booking = await Booking.findOne({ _id: bookingId, user: userId })
        .populate('visiting_state', 'name')
        .populate('user', 'firstName email phoneNumber');

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found or does not belong to you',
        });
      }

      if (booking.status === 'paid') {
        return res.status(400).json({
          success: false,
          message: 'This booking is already paid',
        });
      }

      const user = booking.user;

      // Validate Cashfree credentials before proceeding
      const configCheck = cashfreeService.validateConfig();
      if (!configCheck.isValid) {
        console.error('❌ Cashfree config invalid:', configCheck.errors);
        return res.status(500).json({
          success: false,
          message: 'Payment service configuration error',
          errors: configCheck.errors,
        });
      }

      // Create Cashfree order
      const result = await cashfreeService.preparePaymentData(booking, user);

      if (!result.success) {
        return res.status(502).json({
          success: false,
          message: 'Failed to create payment order',
          error: result.error,
        });
      }

      cashfreeService.logTransaction('initiate', {
        orderId: result.orderId,
        amount: booking.amount,
      });

      // Save the Cashfree orderId on the booking so we can match it in the webhook
      booking.payment_details = booking.payment_details || {};
      booking.payment_details.transaction_id = result.orderId;
      booking.payment_details.payment_method = 'cashfree';
      await booking.save();

      await saveCustomerLog({
        userId,
        phoneNumber: user.phoneNumber,
        type: 'CashfreeInitiate',
        req,
      });

      return res.status(200).json({
        success: true,
        message: 'Payment order created',
        data: {
          orderId: result.orderId,
          paymentSessionId: result.paymentSessionId,
          amount: booking.amount,
          environment: result.environment,
          expiresAt: result.expiresAt,
        },
      });
    } catch (error) {
      console.error('❌ CashfreeController.initiatePayment error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to initiate Cashfree payment',
      });
    }
  }

  // ─── GET /payment/cashfree/success ────────────────────────────────────────
  /**
   * Cashfree redirects the user here after payment (return_url).
   * We verify the order status server-side, update the booking, then
   * redirect the user to the React app's success/failure page.
   *
   * Query params from Cashfree: ?order_id=<>&order_token=<>
   */
  async handleSuccess(req, res) {
  try {
    const { order_id } = req.query;

    const verification = await cashfreeService.verifyOrder(order_id);

    if (!verification.verified) {
      const frontendBase = process.env.FRONTEND_URL || 'https://book.waadi.in';

      return res.redirect(
        `${frontendBase}/payment/failure?order_id=${order_id}&gateway=cashfree`
      );
    }

    // booking update logic
    const booking = await Booking.findOne({
      "payment_details.transaction_id": order_id
    });

    if (booking) {
      booking.status = 'paid';
      booking.payment_details.payment_method = 'cashfree';
      booking.payment_details.payment_reference =
        verification.paymentId;

      await booking.save();
    }

    const frontendBase =
      process.env.FRONTEND_URL || 'https://book.waadi.in';

    return res.redirect(
      `${frontendBase}/payment/success` +
      `?txnid=${order_id}` +
      `&status=success` +
      `&amount=${verification.amount}` +
      `&bookingId=${booking?.bookingId || ''}` +
      `&gateway=cashfree`
    );

  } catch (err) {
    console.error("Cashfree success error:", err);

    const frontendBase =
      process.env.FRONTEND_URL || 'https://book.waadi.in';

    return res.redirect(
      `${frontendBase}/payment/failure?gateway=cashfree`
    );
  }
}
  // async handleSuccess(req, res) {
  //   try {
  //     const { order_id } = req.query;

  //     if (!order_id) {
  //       return this._redirectToApp(res, 'failure', null, 'Missing order_id from Cashfree');
  //     }

  //     // Server-side authoritative verification
  //     const verification = await cashfreeService.verifyOrder(order_id);

  //     if (!verification.verified) {
  //       console.warn('⚠️  Cashfree success URL hit but order NOT paid:', verification.status);
  //       return this._redirectToApp(res, 'failure', order_id, `Order status: ${verification.status}`);
  //     }

  //     // Find booking by the transaction_id we stored at initiate time
  //     const booking = await Booking.findOne({
  //       'payment_details.transaction_id': order_id,
  //     })
  //       .populate('visiting_state', 'name')
  //       .populate('user', 'firstName lastName email phoneNumber');

  //     if (!booking) {
  //       console.error('❌ No booking found for Cashfree order_id:', order_id);
  //       return this._redirectToApp(res, 'failure', order_id, 'Booking not found');
  //     }

  //     // Idempotent: if already paid, just redirect to success
  //     if (booking.status === 'paid') {
  //       console.log('ℹ️  Booking already paid (idempotent):', booking.bookingId);
  //       return this._redirectToApp(res, 'success', order_id, null, booking);
  //     }

  //     // Fetch payment details to get Cashfree payment reference
  //     const paymentsResult = await cashfreeService.getOrderPayments(order_id);
  //     const cfPayment = Array.isArray(paymentsResult.payments)
  //       ? paymentsResult.payments.find((p) => p.payment_status === 'SUCCESS')
  //       : null;

  //     // Create Payment record (mirrors paymentController verifyPayment logic)
  //     const payment = new Payment({
  //       txn_id: order_id,
  //       payu_payment_id: cfPayment?.cf_payment_id?.toString() || '',
  //       amount: parseFloat(verification.amount || booking.amount),
  //       status: 'success',
  //       payment_method: 'cashfree',
  //       user: booking.user._id,
  //       booking: booking._id,
  //       verified: true,
  //       payment_data: {
  //         productinfo: booking.payment_details?.transaction_id,
  //         firstname: booking.user.firstName,
  //         email: booking.user.email,
  //         phone: booking.user.phoneNumber,
  //       },
  //       response_data: verification.rawData || {},
  //     });

  //     await payment.save();

  //     // Update booking status
  //     booking.status = 'paid';
  //     booking.payment_status = 'paid';
  //     booking.payment_details.payment_reference =
  //       cfPayment?.cf_payment_id?.toString() || verification.cashfreeOrderId?.toString() || '';
  //     booking.payment_details.paid_at = new Date();
  //     booking.payment_details.verification_method = 'cashfree_api';
  //     await booking.save();

  //     cashfreeService.logTransaction('success', {
  //       orderId: order_id,
  //       amount: payment.amount,
  //       status: 'success',
  //     });

  //     // Send WhatsApp confirmation (non-blocking)
  //     this._sendWhatsapp(booking).catch(() => {});

  //     // Emit real-time event to admin dashboard
  //     if (global.io) {
  //       global.io.to('admin-room').emit('payment-verified', {
  //         type: 'payment-verified',
  //         gateway: 'cashfree',
  //         booking,
  //         payment: payment.getSummary(),
  //         timestamp: new Date().toISOString(),
  //       });
  //     }

  //     return this._redirectToApp(res, 'success', order_id, null, booking);
  //   } catch (error) {
  //     console.error('❌ CashfreeController.handleSuccess error:', error);
  //     return this._redirectToApp(res, 'failure', req.query.order_id, error.message);
  //   }
  // }

  // ─── GET /payment/cashfree/failure ───────────────────────────────────────
  /**
   * Cashfree redirects here when user cancels or payment fails.
   */
  async handleFailure(req, res) {
    try {
      const { order_id } = req.query;

      if (order_id) {
        // Mark booking as failed if we can find it
        const booking = await Booking.findOne({
          'payment_details.transaction_id': order_id,
        });

        if (booking && booking.status === 'pending') {
          booking.status = 'payment_failed';
          await booking.save();
        }

        // Upsert a failure Payment record (idempotent)
        const existingPayment = await Payment.findOne({ txn_id: order_id });
        if (!existingPayment) {
          const payment = new Payment({
            txn_id: order_id,
            amount: booking?.amount || 0,
            status: 'failure',
            payment_method: 'cashfree',
            user: booking?.user,
            booking: booking?._id,
            verified: false,
            failure_reason: 'Payment failed or cancelled by user',
          });
          await payment.save();
        }
      }

      return this._redirectToApp(res, 'failure', order_id, 'Payment failed or cancelled');
    } catch (error) {
      console.error('❌ CashfreeController.handleFailure error:', error);
      return this._redirectToApp(res, 'failure', req.query.order_id, error.message);
    }
  }

  // ─── POST /payment/cashfree/webhook ──────────────────────────────────────
  /**
   * Cashfree sends payment events here (notify_url).
   * IMPORTANT: server.js must NOT wrap this path with express.raw() for
   * body parsing – we need the raw body for signature verification.
   * Add this to server.js before body parsers:
   *
   *   app.use('/api/v1/payment/cashfree/webhook',
   *     express.raw({ type: 'application/json' }));
   */
  async handleWebhook(req, res) {
    try {
      const signature = req.headers['x-webhook-signature'];
      const timestamp = req.headers['x-webhook-timestamp'];

      // Raw body (Buffer) is needed for HMAC verification
      const rawBody = Buffer.isBuffer(req.body)
        ? req.body.toString('utf8')
        : JSON.stringify(req.body);

      // Always respond 200 quickly so Cashfree doesn't retry
      res.status(200).json({ success: true, message: 'Webhook received' });

      // Verify signature
      const isValid = cashfreeService.verifyWebhookSignature(rawBody, signature, timestamp);
      if (!isValid) {
        console.error('❌ Invalid Cashfree webhook signature – ignoring event');
        return;
      }

      const event = JSON.parse(rawBody);
      const eventType = event.type; // e.g. "PAYMENT_SUCCESS_WEBHOOK"
      const orderData = event.data?.order || {};
      const paymentData = event.data?.payment || {};

      console.log(`📩 Cashfree Webhook [${eventType}]:`, {
        order_id: orderData.order_id,
        payment_status: paymentData.payment_status,
        amount: orderData.order_amount,
      });

      cashfreeService.logTransaction('webhook', {
        orderId: orderData.order_id,
        amount: orderData.order_amount,
        status: paymentData.payment_status,
      });

      if (eventType === 'PAYMENT_SUCCESS_WEBHOOK') {
        await this._processSuccessfulWebhook(orderData, paymentData);
      } else if (
        eventType === 'PAYMENT_FAILED_WEBHOOK' ||
        eventType === 'PAYMENT_USER_DROPPED_WEBHOOK'
      ) {
        await this._processFailedWebhook(orderData, paymentData);
      }
      // Other event types (PAYMENT_PENDING etc.) are logged but not processed
    } catch (error) {
      console.error('❌ CashfreeController.handleWebhook error:', error);
      // Response already sent above; just log
    }
  }

  // ─── POST /payment/cashfree/verify ───────────────────────────────────────
  /**
   * On-demand verification endpoint – called by the React app's
   * payment-status polling to confirm a payment after redirect.
   */
  async verifyPayment(req, res) {
    try {
      const { orderId } = req.body;
      const userId = req.user._id;

      if (!orderId) {
        return res.status(400).json({ success: false, message: 'orderId is required' });
      }

      const verification = await cashfreeService.verifyOrder(orderId);

      // Also look up our DB record
      const booking = await Booking.findOne({
        'payment_details.transaction_id': orderId,
        user: userId,
      }).populate('visiting_state', 'name');

      const user = await User.findById(userId);
      await saveCustomerLog({ userId, phoneNumber: user?.phoneNumber, type: 'CashfreeVerify', req });

      if (!booking) {
        return res.status(404).json({ success: false, message: 'Booking not found' });
      }

      return res.status(200).json({
        success: true,
        data: {
          orderId,
          verified: verification.verified,
          status: verification.status,
          bookingId: booking.bookingId,
          bookingStatus: booking.status,
          amount: booking.amount,
          visitingState: booking.visiting_state?.name,
        },
      });
    } catch (error) {
      console.error('❌ CashfreeController.verifyPayment error:', error);
      return res.status(500).json({ success: false, message: 'Verification failed' });
    }
  }

  // ─── GET /payment/cashfree/test ───────────────────────────────────────────
  /**
   * Config sanity check – mirrors paymentController.testPayUConfig()
   */
  async testConfig(req, res) {
    const validation = cashfreeService.validateConfig();
    return res.status(200).json({
      success: true,
      message: 'Cashfree configuration test',
      data: {
        isValid: validation.isValid,
        errors: validation.errors,
        environment: cashfreeService.environment,
        baseUrl: cashfreeService.baseUrl,
        configuration: {
          appId: process.env.CASHFREE_APP_ID
            ? `${process.env.CASHFREE_APP_ID.substring(0, 6)}***`
            : 'NOT_SET',
          secretKey: process.env.CASHFREE_SECRET_KEY ? '***SET***' : 'NOT_SET',
          successUrl: cashfreeService.successUrl,
          failureUrl: cashfreeService.failureUrl,
        },
      },
    });
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  /**
   * Process a PAYMENT_SUCCESS_WEBHOOK event.
   * Idempotent – safe to call multiple times for the same order.
   */
  async _processSuccessfulWebhook(orderData, paymentData) {
    const orderId = orderData.order_id;
    if (!orderId) return;

    const booking = await Booking.findOne({
      'payment_details.transaction_id': orderId,
    })
      .populate('visiting_state', 'name')
      .populate('user', 'firstName lastName email phoneNumber');

    if (!booking) {
      console.warn('⚠️  Cashfree webhook: no booking for order_id:', orderId);
      return;
    }

    if (booking.status === 'paid') {
      console.log('ℹ️  Cashfree webhook: booking already paid (idempotent):', booking.bookingId);
      return;
    }

    // Upsert payment record
    let payment = await Payment.findOne({ txn_id: orderId });
    if (!payment) {
      payment = new Payment({
        txn_id: orderId,
        payu_payment_id: paymentData.cf_payment_id?.toString() || '',
        amount: parseFloat(orderData.order_amount),
        status: 'success',
        payment_method: 'cashfree',
        user: booking.user._id,
        booking: booking._id,
        verified: true,
        response_data: { order: orderData, payment: paymentData },
      });
      await payment.save();
    } else if (payment.status !== 'success') {
      payment.status = 'success';
      payment.verified = true;
      payment.response_data = { order: orderData, payment: paymentData };
      await payment.save();
    }

    // Update booking
    booking.status = 'paid';
    booking.payment_status = 'paid';
    booking.payment_details.payment_reference =
      paymentData.cf_payment_id?.toString() || '';
    booking.payment_details.paid_at = new Date();
    booking.payment_details.verification_method = 'cashfree_webhook';
    await booking.save();

    console.log('✅ Cashfree webhook: booking paid:', booking.bookingId);

    // WhatsApp & socket events
    this._sendWhatsapp(booking).catch(() => {});
    if (global.io) {
      global.io.to('admin-room').emit('payment-verified', {
        type: 'payment-verified',
        gateway: 'cashfree',
        source: 'webhook',
        booking,
        payment: payment.getSummary(),
        timestamp: new Date().toISOString(),
      });
    }
  }

  async _processFailedWebhook(orderData, paymentData) {
    const orderId = orderData.order_id;
    if (!orderId) return;

    const booking = await Booking.findOne({
      'payment_details.transaction_id': orderId,
    });

    if (booking && booking.status === 'pending') {
      booking.status = 'payment_failed';
      await booking.save();
    }

    let payment = await Payment.findOne({ txn_id: orderId });
    if (!payment) {
      payment = new Payment({
        txn_id: orderId,
        amount: parseFloat(orderData.order_amount || 0),
        status: 'failure',
        payment_method: 'cashfree',
        user: booking?.user,
        booking: booking?._id,
        verified: false,
        failure_reason: paymentData.payment_message || 'Payment failed',
        response_data: { order: orderData, payment: paymentData },
      });
      await payment.save();
    }

    if (global.io) {
      global.io.to('admin-room').emit('payment-failed', {
        type: 'payment-failed',
        gateway: 'cashfree',
        source: 'webhook',
        orderId,
        timestamp: new Date().toISOString(),
      });
    }
  }

  async _sendWhatsapp(booking) {
    if (whatsappService.isReady) {
      await whatsappService.sendPaymentConfirmation(booking, booking.user);
    }
  }

  /**
   * Redirect the browser to the React frontend.
   * Mirrors the deep-link pattern already used in paymentController.
   */
  _redirectToApp(res, status, orderId, errorMsg, booking) {
    const frontendBase =
      process.env.FRONTEND_URL || 'http://localhost:3000';
    const appDeepLinkBase =
      process.env.APP_DEEP_LINK_BASE || 'wadicab://payment';

    const isAppPlatform =
      res.req &&
      (res.req.headers['x-platform'] === 'app' ||
        res.req.query.platform === 'app');

    if (isAppPlatform) {
      const deepLink =
        status === 'success'
          ? `${appDeepLinkBase}/success?order_id=${encodeURIComponent(orderId || '')}&gateway=cashfree&booking_id=${encodeURIComponent(booking?.bookingId || '')}`
          : `${appDeepLinkBase}/failure?order_id=${encodeURIComponent(orderId || '')}&gateway=cashfree&error=${encodeURIComponent(errorMsg || 'Payment failed')}`;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(
        `<!doctype html><html><head><meta charset="utf-8"><title>Payment ${status}</title>` +
          `<meta http-equiv="refresh" content="0;url='${deepLink}'"></head>` +
          `<body><script>setTimeout(function(){window.location='${deepLink}';},0);</script>` +
          `<p>If not redirected, <a href="${deepLink}">tap here</a>.</p></body></html>`
      );
    }

    // Web redirect
    const redirectUrl =
      status === 'success'
        ? `${frontendBase}/payment/success` +
      `?txnid=${order_id}` +
      `&status=success` +
      `&amount=${verification.amount}` +
      `&bookingId=${booking?.bookingId || ''}` +
      `&gateway=cashfree`
        : `${frontendBase}/payment/failure?txnid=${order_id}&status=failure&amount=${verification.amount}&error=${encodeURIComponent(errorMsg || 'Payment failed')}`;

    return res.redirect(302, redirectUrl);
  }
}

module.exports = new CashfreeController();