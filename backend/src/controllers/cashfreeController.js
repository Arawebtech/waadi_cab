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
const cashfreeService = require('../services/cashfreeService');
const cashfreePaymentConfirmation = require('../services/cashfreePaymentConfirmation');
const saveCustomerLog = require('../utils/saveCustomerLog');
const { isAppPlatformRequest } = require('../utils/platformRequest');
const { redirectAfterPayment } = require('../utils/paymentAppRedirect');
const { logPayment } = require('../utils/paymentLogger');
const gatewayCredentials = require('../utils/gatewayCredentials');

class CashfreeController {
  // ─── GET /payment/cashfree/relay ─────────────────────────────────────────────
  /**
   * Browser relay — loads Cashfree JS SDK on our whitelisted backend domain,
   * then calls cashfree.checkout({ paymentSessionId }). Same role as PayU /payment/relay.
   * Direct navigation to payments.cashfree.com/order/#/session_… is unsupported and returns 500.
   */
  _renderRelayError(res, message, details = {}) {
    console.error('❌ Cashfree relay rejected:', { message, ...details });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(400).send(
      `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Payment Error</title></head>` +
        `<body style="font-family:system-ui;padding:24px;line-height:1.5"><h2>Unable to start payment</h2>` +
        `<p>${message}</p><p style="color:#6b7280;font-size:14px">Please close this window and try again from the app.</p></body></html>`
    );
  }

  async renderCheckoutRelay(req, res) {
    try {
      const source = req.method === 'GET' ? req.query : (req.body || {});

      const rawSessionId = source.payment_session_id || source.session_id;
      const sessionValidation = cashfreeService.validatePaymentSessionId(rawSessionId);
      if (!sessionValidation.valid) {
        return this._renderRelayError(res, sessionValidation.error, {
          received: rawSessionId ? String(rawSessionId).substring(0, 32) : '(empty)',
          method: req.method,
        });
      }

      const paymentSessionId = sessionValidation.value;
      const platform = String(source.platform || '').trim().toLowerCase();

      const envMode = cashfreeService.environment === 'production' ? 'production' : 'sandbox';
      const modeParam = String(source.mode || envMode).trim().toLowerCase();
      const mode = modeParam === 'production' ? 'production' : 'sandbox';

      if (mode !== envMode) {
        console.warn('⚠️ Cashfree relay mode/env mismatch:', {
          relayMode: mode,
          serverEnvironment: cashfreeService.environment,
          payment_session_id: `${paymentSessionId.substring(0, 24)}…`,
        });
      }

      console.log('🔗 Cashfree relay checkout:', {
        payment_session_id: `${paymentSessionId.substring(0, 24)}…`,
        mode,
        platform: platform || 'web',
        method: req.method,
        userAgent: req.headers['user-agent'],
      });

      const redirectTarget = '_self';

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.status(200).send(
        `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Redirecting to Cashfree…</title>
    <script src="https://sdk.cashfree.com/js/v3/cashfree.js"></script>
    <style>
      body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;padding:24px;line-height:1.5}
      .box{max-width:560px;margin:40px auto;border:1px solid #e5e7eb;border-radius:12px;padding:24px}
      .btn{background:#16a34a;border:0;color:#fff;padding:10px 16px;border-radius:8px;font-weight:600;cursor:pointer}
      .meta{color:#6b7280;font-size:14px;margin-top:8px}
    </style>
  </head>
  <body>
    <div class="box">
      <h2>Redirecting to Cashfree…</h2>
      <p class="meta">Please wait while we securely connect to the payment gateway.</p>
      <noscript>
        <button type="button" class="btn" onclick="location.reload()">Continue to Cashfree</button>
      </noscript>
    </div>
    <script>
      (function () {
        var paymentSessionId = ${JSON.stringify(paymentSessionId)};
        var mode = ${JSON.stringify(mode)};
        var redirectTarget = ${JSON.stringify(redirectTarget)};
        var attempts = 0;
        function showError(msg) {
          var box = document.querySelector('.box');
          if (box) {
            box.innerHTML = '<h2>Payment could not start</h2><p class="meta">' + msg + '</p>';
          }
        }
        function launch() {
          attempts += 1;
          if (typeof Cashfree !== 'function') {
            if (attempts > 50) {
              showError('Cashfree SDK failed to load. Check network and domain whitelist.');
              return;
            }
            return setTimeout(launch, 100);
          }
          try {
            var cashfree = Cashfree({ mode: mode });
            cashfree.checkout({ paymentSessionId: paymentSessionId, redirectTarget: redirectTarget });
          } catch (err) {
            console.error('Cashfree checkout error:', err);
            showError(err && err.message ? err.message : 'Checkout failed to launch.');
          }
        }
        launch();
      })();
    </script>
  </body>
</html>`
      );
    } catch (error) {
      console.error('❌ Cashfree relay error:', error);
      if (error.response?.data) {
        console.error('❌ Cashfree relay API response:', JSON.stringify(error.response.data));
      }
      if (error.stack) {
        console.error('❌ Cashfree relay stack:', error.stack);
      }
      return this._renderRelayError(res, 'Failed to render Cashfree checkout page');
    }
  }

  // ─── POST /payment/cashfree/initiate ──────────────────────────────────────
  /**
   * Called by the React checkout page right after the user taps "Pay Now".
   * Creates a Cashfree order and returns browser checkout URLs (no WebView SDK).
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
      const platform = isAppPlatformRequest(req) ? 'app' : 'web';
      const result = await cashfreeService.preparePaymentData(booking, user, { platform });

      if (!result.success) {
        return res.status(502).json({
          success: false,
          message: 'Failed to create payment order',
          error: result.error,
        });
      }

      cashfreeService.logTransaction('initiate', {
        txnid: result.paymentData.txnid,
        payment_session_id: result.paymentData.payment_session_id,
        amount: booking.amount,
        bookingId: booking.bookingId,
        environment: cashfreeService.environment,
      });

      booking.payment_details = booking.payment_details || {};
      booking.payment_details.transaction_id = result.paymentData.txnid;
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
        message: 'Cashfree payment initiated',
        data: {
          gateway: 'cashfree',
          paymentUrl: result.paymentUrl,
          paymentData: result.paymentData,
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
   * Cashfree return_url — navigation only.
   * Booking confirmation is done via webhook / API verify / reconciliation (not redirect alone).
   */
  async handleSuccess(req, res) {
    try {
      const rawOrderId =
        req.query.order_id || req.query.orderId || req.query.txnid || req.query.txnId;
      const order_id = Array.isArray(rawOrderId) ? rawOrderId[0] : rawOrderId;

      logPayment('cashfree_redirect_success', {
        orderId: order_id,
        platform: req.query.platform,
        query: req.query,
      });

      if (!order_id) {
        return redirectAfterPayment(res, 'failure', {
          error: 'Missing order_id from Cashfree',
        });
      }

      const { outcome, booking, error } = await cashfreePaymentConfirmation.getRedirectOutcome(
        order_id,
        { tryConfirm: true }
      );

      if (!booking) {
        return redirectAfterPayment(res, 'failure', {
          txnId: order_id,
          error: error || 'Booking not found',
        });
      }

      logPayment('cashfree_redirect_outcome', {
        orderId: order_id,
        outcome,
        bookingId: booking.bookingId,
        bookingStatus: booking.status,
        paymentStatus: booking.payment_status,
      });

      return redirectAfterPayment(res, outcome, {
        txnId: order_id,
        amount: booking.amount,
        bookingId: booking.bookingId,
        gateway: 'cashfree',
        error: outcome === 'failure' ? error : undefined,
      });
    } catch (err) {
      logPayment('cashfree_redirect_success_error', {
        orderId: req.query.order_id,
        error: err.message,
      });
      return redirectAfterPayment(res, 'pending', {
        txnId: req.query.order_id,
        gateway: 'cashfree',
        error: err.message,
      });
    }
  }

  // ─── GET /payment/cashfree/failure ───────────────────────────────────────
  /**
   * Cashfree failure/cancel return_url — never mark failed without Cashfree API confirmation.
   */
  async handleFailure(req, res) {
    try {
      const rawOrderId =
        req.query.order_id || req.query.orderId || req.query.txnid || req.query.txnId;
      const order_id = Array.isArray(rawOrderId) ? rawOrderId[0] : rawOrderId;

      logPayment('cashfree_redirect_failure', {
        orderId: order_id,
        platform: req.query.platform,
        query: req.query,
      });

      if (!order_id) {
        return redirectAfterPayment(res, 'failure', {
          error: 'Missing order_id from Cashfree',
        });
      }

      const result = await cashfreePaymentConfirmation.verifyAndConfirm(order_id, 'failure-callback', {
        useRetry: true,
      });

      const booking =
        result.booking || (await cashfreePaymentConfirmation.findBookingByOrderId(order_id));

      if (result.ok && booking && booking.status === 'paid') {
        return redirectAfterPayment(res, 'success', {
          txnId: order_id,
          amount: booking.amount,
          bookingId: booking.bookingId,
          gateway: 'cashfree',
        });
      }

      if (booking?.payment_status === 'failed') {
        return redirectAfterPayment(res, 'failure', {
          txnId: order_id,
          amount: booking.amount,
          bookingId: booking.bookingId,
          gateway: 'cashfree',
          error: 'Payment failed or cancelled',
        });
      }

      return redirectAfterPayment(res, 'pending', {
        txnId: order_id,
        amount: booking?.amount,
        bookingId: booking?.bookingId,
        gateway: 'cashfree',
        error: 'Payment status pending — confirmation in progress',
      });
    } catch (error) {
      logPayment('cashfree_redirect_failure_error', {
        orderId: req.query.order_id,
        error: error.message,
      });
      return redirectAfterPayment(res, 'pending', {
        txnId: req.query.order_id,
        gateway: 'cashfree',
        error: error.message,
      });
    }
  }

  // ─── POST /payment/cashfree/webhook ──────────────────────────────────────
  /**
   * Cashfree server-to-server webhook — primary source of truth for payment confirmation.
   */
  async handleWebhook(req, res) {
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {}));
    const signature = req.headers['x-webhook-signature'];
    const timestamp = req.headers['x-webhook-timestamp'];

    gatewayCredentials.syncCashfreeService();

    if (!cashfreeService.verifyWebhookSignature(rawBody, signature, timestamp)) {
      logPayment('cashfree_webhook_invalid_signature', { timestamp });
      return res.status(401).json({ success: false, message: 'Invalid webhook signature' });
    }

    let payload;
    try {
      payload = JSON.parse(rawBody.toString('utf8'));
    } catch (parseErr) {
      logPayment('cashfree_webhook_parse_error', { error: parseErr.message });
      return res.status(400).json({ success: false, message: 'Invalid JSON payload' });
    }

    const eventType = payload.type || payload.event || '';
    const orderData = payload.data?.order || payload.order || {};
    const paymentData = payload.data?.payment || payload.payment || {};
    const orderId = orderData.order_id;

    logPayment('cashfree_webhook_received', {
      eventType,
      orderId,
      paymentStatus: paymentData.payment_status,
    });

    try {
      const paymentStatus = (paymentData.payment_status || '').toUpperCase();
      const isSuccessEvent =
        eventType === 'PAYMENT_SUCCESS_WEBHOOK' || paymentStatus === 'SUCCESS';
      const isFailedEvent =
        eventType === 'PAYMENT_FAILED_WEBHOOK' ||
        paymentStatus === 'FAILED' ||
        paymentStatus === 'CANCELLED';

      if (isSuccessEvent) {
        const result = await cashfreePaymentConfirmation.processWebhookSuccess(orderData, paymentData);
        logPayment('cashfree_webhook_processed', {
          orderId,
          eventType,
          ok: result.ok,
          reason: result.reason,
          alreadyPaid: result.alreadyPaid,
          newlyConfirmed: result.newlyConfirmed,
        });
      } else if (isFailedEvent) {
        const result = await cashfreePaymentConfirmation.processWebhookFailed(
          orderData,
          paymentData,
          eventType
        );
        logPayment('cashfree_webhook_failed_processed', {
          orderId,
          eventType,
          ok: result.ok,
          reason: result.reason,
        });
      } else {
        logPayment('cashfree_webhook_ignored', { orderId, eventType, paymentStatus });
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      logPayment('cashfree_webhook_handler_error', {
        orderId,
        eventType,
        error: error.message,
      });
      return res.status(200).json({ success: true, note: 'accepted with handler error logged' });
    }
  }

  // ─── POST /payment/cashfree/verify ───────────────────────────────────────
  /**
   * On-demand verification endpoint – called by the React app's
   * payment-status polling to confirm a payment after redirect.
   */
  async verifyPayment(req, res) {
    try {
      const txnId = req.body.txnId || req.body.orderId;
      const userId = req.user._id;

      if (!txnId) {
        return res.status(400).json({ success: false, message: 'txnId is required' });
      }

      const result = await cashfreePaymentConfirmation.verifyAndConfirm(txnId, 'api-verify', {
        useRetry: true,
      });

      const booking =
        result.booking ||
        (await Booking.findOne({
          'payment_details.transaction_id': txnId,
          user: userId,
        })
          .populate('visiting_state', 'name')
          .populate('user', 'firstName lastName phoneNumber email'));

      const user = await User.findById(userId);
      await saveCustomerLog({ userId, phoneNumber: user?.phoneNumber, type: 'CashfreeVerify', req });

      if (!booking) {
        return res.status(404).json({ success: false, message: 'Booking not found' });
      }

      const apiStatus =
        booking.status === 'paid'
          ? 'success'
          : booking.payment_status === 'failed'
            ? 'failure'
            : 'pending';

      return res.status(200).json({
        success: apiStatus !== 'failure',
        data: {
          txnId,
          status: apiStatus,
          paymentId: result.verification?.paymentId,
          amount: booking.amount,
          bookingId: booking.bookingId,
          bookingStatus: booking.status,
        },
      });
    } catch (error) {
      console.error('❌ CashfreeController.verifyPayment error:', error);
      return res.status(500).json({ success: false, message: 'Verification failed' });
    }
  }

  // ─── GET /payment/cashfree/status/:txnId ─────────────────────────────────
  /** Mirrors GET /payment/status/:txnId for PayU polling. */
  async getPaymentStatus(req, res) {
    try {
      const txnId = req.params.txnId || req.params.orderId;
      const userId = req.user._id;

      if (!txnId) {
        return res.status(400).json({ success: false, message: 'txnId is required' });
      }

      const result = await cashfreePaymentConfirmation.verifyAndConfirm(txnId, 'status-poll', {
        useRetry: false,
      });

      const booking =
        result.booking ||
        (await Booking.findOne({
          'payment_details.transaction_id': txnId,
          user: userId,
        })
          .populate('visiting_state', 'name')
          .populate('user', 'firstName lastName phoneNumber email'));

      if (!booking) {
        return res.status(404).json({ success: false, message: 'Payment transaction not found' });
      }

      const apiStatus =
        booking.status === 'paid'
          ? 'success'
          : booking.payment_status === 'failed'
            ? 'failure'
            : 'pending';

      return res.status(200).json({
        success: true,
        data: {
          txnId,
          status: apiStatus,
          paymentId: result.verification?.paymentId,
          amount: booking.amount,
          bookingId: booking.bookingId,
          bookingStatus: booking.status === 'paid' ? 'paid' : booking.status,
        },
      });
    } catch (error) {
      console.error('❌ Cashfree getPaymentStatus error:', error);
      return res.status(500).json({ success: false, message: 'Failed to get payment status' });
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
          webhookUrl: cashfreeService.webhookUrl,
        },
      },
    });
  }
}

module.exports = new CashfreeController();