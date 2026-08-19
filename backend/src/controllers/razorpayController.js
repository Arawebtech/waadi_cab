/**
 * razorpayController.js — mirrors cashfreeController.js
 */
const Booking = require('../models/Booking');
const User = require('../models/User');
const razorpayService = require('../services/razorpayService');
const razorpayPaymentConfirmation = require('../services/razorpayPaymentConfirmation');
const saveCustomerLog = require('../utils/saveCustomerLog');
const { isAppPlatformRequest } = require('../utils/platformRequest');
const { redirectAfterPayment } = require('../utils/paymentAppRedirect');
const { logPayment } = require('../utils/paymentLogger');
const gatewayCredentials = require('../utils/gatewayCredentials');

class RazorpayController {
  _esc(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  _renderRelayError(res, message) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(400).send(
      `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Payment Error</title></head>` +
        `<body style="font-family:system-ui;padding:24px;line-height:1.5"><h2>Unable to start payment</h2>` +
        `<p>${this._esc(message)}</p><p style="color:#6b7280;font-size:14px">Please close this window and try again from the app.</p></body></html>`
    );
  }

  /**
   * Browser relay — official Razorpay Standard Checkout popup via checkout.js.
   * Not Embedded/Hosted Checkout (no POST to /checkout/embedded, no redirect:true).
   * Same role as Cashfree /payment/cashfree/relay: app/web open this backend URL only.
   */
  async renderCheckoutRelay(req, res) {
    try {
      const source = req.method === 'GET' ? req.query : (req.body || {});
      let razorpayOrderId = source.razorpay_order_id || source.order_id;
      let keyId = source.key_id || razorpayService.keyId;
      let amountRaw = source.amount;
      let txnid = source.txnid;
      let name = source.name || 'Waadi Cab';
      let description = source.description || 'Border Tax Pass';
      let prefillName = source.prefill_name || '';
      let prefillEmail = source.prefill_email || '';
      let prefillContact = source.prefill_contact || '';
      const platform = String(source.platform || '').trim().toLowerCase();

      if (txnid) {
        const booking = await Booking.findOne({ 'payment_details.transaction_id': txnid })
          .populate('user', 'firstName lastName email phoneNumber');
        if (booking) {
          razorpayOrderId = razorpayOrderId || booking.payment_details?.razorpay_order_id;
          amountRaw = amountRaw || String(Math.round(parseFloat(booking.amount) * 100));
          if (booking.user) {
            prefillName = prefillName || [booking.user.firstName, booking.user.lastName].filter(Boolean).join(' ');
            prefillEmail = prefillEmail || booking.user.email || '';
            prefillContact = prefillContact || String(booking.user.phoneNumber || '').replace(/\D/g, '').slice(-10);
          }
        }
      }

      if (!razorpayOrderId || !keyId || !amountRaw) {
        return this._renderRelayError(res, 'Missing Razorpay checkout parameters');
      }

      const amountPaise = parseInt(String(amountRaw), 10);
      if (!Number.isFinite(amountPaise) || amountPaise <= 0) {
        return this._renderRelayError(res, 'Invalid payment amount');
      }

      const platformQuery = platform === 'app' ? '&platform=app' : '';
      const successUrl = `${razorpayService.successUrl}?txnid=${encodeURIComponent(txnid || '')}${platformQuery}`;
      const failureUrl = `${razorpayService.failureUrl}?txnid=${encodeURIComponent(txnid || '')}${platformQuery}`;

      const options = {
        key: keyId,
        amount: amountPaise,
        currency: source.currency || 'INR',
        name,
        description,
        order_id: razorpayOrderId,
        prefill: {
          name: prefillName,
          email: prefillEmail,
          contact: prefillContact,
        },
        theme: { color: '#16a34a' },
      };

      const csp = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com https://cdn.razorpay.com",
        "style-src 'self' 'unsafe-inline' https://checkout.razorpay.com https://cdn.razorpay.com",
        "frame-src https://api.razorpay.com https://checkout.razorpay.com https://cdn.razorpay.com",
        "connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com https://checkout.razorpay.com",
        "img-src 'self' data: https:",
        "font-src 'self' data: https:",
        "base-uri 'self'",
        "object-src 'none'",
      ].join('; ');

      res.setHeader('Content-Security-Policy', csp);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      console.log('🔗 Razorpay Standard Checkout popup relay:', {
        order_id: razorpayOrderId,
        txnid,
        platform: platform || 'web',
        method: req.method,
      });

      res.status(200).send(
        `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Pay with Razorpay</title>
    <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
    <style>
      body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;padding:24px;line-height:1.5}
      .box{max-width:560px;margin:40px auto;border:1px solid #e5e7eb;border-radius:12px;padding:24px}
      .btn{background:#16a34a;border:0;color:#fff;padding:10px 16px;border-radius:8px;font-weight:600;cursor:pointer;margin-top:12px}
      .meta{color:#6b7280;font-size:14px;margin-top:8px}
    </style>
  </head>
  <body>
    <div class="box" id="status-box">
      <h2>Opening Razorpay…</h2>
      <p class="meta">The official Razorpay payment popup will open. Complete payment in the popup.</p>
      <button type="button" class="btn" id="pay-btn">Pay Now</button>
    </div>
    <script>
      (function () {
        var options = ${JSON.stringify(options)};
        var successUrl = ${JSON.stringify(successUrl)};
        var failureUrl = ${JSON.stringify(failureUrl)};
        var attempts = 0;
        var rzp = null;

        function showError(msg) {
          var box = document.getElementById('status-box');
          if (box) {
            box.innerHTML =
              '<h2>Payment could not start</h2>' +
              '<p class="meta">' + msg + '</p>' +
              '<button type="button" class="btn" onclick="location.reload()">Try again</button>';
          }
        }

        function openCheckout() {
          if (!rzp) return;
          rzp.open();
        }

        function launch() {
          attempts += 1;
          if (typeof Razorpay !== 'function') {
            if (attempts > 50) {
              showError('Razorpay Checkout failed to load. Check network and try again.');
              return;
            }
            return setTimeout(launch, 100);
          }
          try {
            options.handler = function (response) {
              var url = successUrl
                + '&razorpay_payment_id=' + encodeURIComponent(response.razorpay_payment_id || '')
                + '&razorpay_order_id=' + encodeURIComponent(response.razorpay_order_id || '')
                + '&razorpay_signature=' + encodeURIComponent(response.razorpay_signature || '');
              window.location.replace(url);
            };
            options.modal = {
              ondismiss: function () {
                window.location.href = failureUrl;
              }
            };
            rzp = new Razorpay(options);
            rzp.on('payment.failed', function () {
              window.location.href = failureUrl;
            });
            var btn = document.getElementById('pay-btn');
            if (btn) btn.addEventListener('click', openCheckout);
            openCheckout();
          } catch (err) {
            console.error('Razorpay checkout error:', err);
            showError(err && err.message ? err.message : 'Checkout failed to launch.');
          }
        }

        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', launch);
        } else {
          launch();
        }
      })();
    </script>
  </body>
</html>`
      );
    } catch (error) {
      console.error('❌ Razorpay relay error:', error);
      return this._renderRelayError(res, 'Failed to render Razorpay checkout page');
    }
  }

  async initiatePayment(req, res) {
    try {
      const { bookingId } = req.body;
      const userId = req.user._id;

      const booking = await Booking.findOne({ _id: bookingId, user: userId })
        .populate('visiting_state', 'name')
        .populate('user', 'firstName email phoneNumber');

      if (!booking) {
        return res.status(404).json({ success: false, message: 'Booking not found' });
      }
      if (booking.status === 'paid') {
        return res.status(400).json({ success: false, message: 'Already paid' });
      }

      const configCheck = razorpayService.validateConfig();
      if (!configCheck.isValid) {
        return res.status(500).json({ success: false, message: 'Razorpay config error', errors: configCheck.errors });
      }

      const platform = isAppPlatformRequest(req) ? 'app' : 'web';
      const result = await razorpayService.preparePaymentData(booking, booking.user, { platform });
      if (!result.success) {
        return res.status(502).json({ success: false, message: result.error });
      }

      booking.payment_details = booking.payment_details || {};
      booking.payment_details.transaction_id = result.paymentData.txnid;
      booking.payment_details.razorpay_order_id = result.paymentData.razorpay_order_id;
      booking.payment_details.payment_method = 'razorpay';
      await booking.save();

      return res.status(200).json({
        success: true,
        message: 'Razorpay payment initiated',
        data: { gateway: 'razorpay', paymentUrl: result.paymentUrl, paymentData: result.paymentData },
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Failed to initiate Razorpay payment' });
    }
  }

  async handleSuccess(req, res) {
    try {
      const txnid =
        req.query.txnid || req.query.txnId || req.query.order_id || req.body?.txnid;
      const razorpayOrderId = req.query.razorpay_order_id || req.body?.razorpay_order_id;
      const razorpayPaymentId = req.query.razorpay_payment_id || req.body?.razorpay_payment_id;
      const razorpaySignature = req.query.razorpay_signature || req.body?.razorpay_signature;

      logPayment('razorpay_redirect_success', { txnid, razorpayOrderId });

      if (!txnid && !razorpayOrderId) {
        return redirectAfterPayment(res, 'failure', { error: 'Missing transaction reference', gateway: 'razorpay' });
      }

      let resolvedTxnId = txnid;
      if (!resolvedTxnId && razorpayOrderId) {
        const booking = await razorpayPaymentConfirmation.findBookingByRazorpayOrderId(razorpayOrderId);
        resolvedTxnId = booking?.payment_details?.transaction_id;
      }

      const { outcome, booking, error } = await razorpayPaymentConfirmation.getRedirectOutcome(
        resolvedTxnId,
        {
          tryConfirm: !(razorpayOrderId && razorpayPaymentId && razorpaySignature),
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature,
        }
      );

      if (!booking) {
        return redirectAfterPayment(res, 'failure', { txnId: resolvedTxnId, error: error || 'Booking not found', gateway: 'razorpay' });
      }

      return redirectAfterPayment(res, outcome, {
        txnId: booking.payment_details.transaction_id,
        amount: booking.amount,
        bookingId: booking.bookingId,
        gateway: 'razorpay',
        error: outcome === 'failure' ? error : undefined,
      });
    } catch (err) {
      return redirectAfterPayment(res, 'pending', { txnId: req.query.txnid, gateway: 'razorpay', error: err.message });
    }
  }

  async handleFailure(req, res) {
    try {
      const txnid = req.query.txnid || req.query.txnId;
      logPayment('razorpay_redirect_failure', { txnid });

      if (!txnid) {
        return redirectAfterPayment(res, 'failure', { gateway: 'razorpay', error: 'Missing txnid' });
      }

      const result = await razorpayPaymentConfirmation.verifyAndConfirm(txnid, 'failure-callback', {
        useRetry: true,
      });
      const booking = result.booking || (await razorpayPaymentConfirmation.findBookingByTxnId(txnid));

      if (result.ok && booking?.status === 'paid') {
        return redirectAfterPayment(res, 'success', {
          txnId: txnid,
          amount: booking.amount,
          bookingId: booking.bookingId,
          gateway: 'razorpay',
        });
      }

      if (booking?.payment_status === 'failed') {
        return redirectAfterPayment(res, 'failure', { txnId: txnid, amount: booking.amount, bookingId: booking.bookingId, gateway: 'razorpay' });
      }

      return redirectAfterPayment(res, 'pending', { txnId: txnid, amount: booking?.amount, bookingId: booking?.bookingId, gateway: 'razorpay' });
    } catch (error) {
      return redirectAfterPayment(res, 'pending', { txnId: req.query.txnid, gateway: 'razorpay', error: error.message });
    }
  }

  async handleWebhook(req, res) {
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {}));
    const signature = req.headers['x-razorpay-signature'];

    gatewayCredentials.syncRazorpayService();

    if (!razorpayService.verifyWebhookSignature(rawBody, signature)) {
      logPayment('razorpay_webhook_invalid_signature', {});
      return res.status(401).json({ success: false, message: 'Invalid webhook signature' });
    }

    let payload;
    try {
      payload = JSON.parse(rawBody.toString('utf8'));
    } catch (parseErr) {
      return res.status(400).json({ success: false, message: 'Invalid JSON' });
    }

    const event = payload.event || '';
    logPayment('razorpay_webhook_received', { event });

    if (!event || event.includes('test') || event === 'WEBHOOK') {
      return res.status(200).json({ success: true, message: 'Webhook endpoint reachable' });
    }

    try {
      const result = await razorpayPaymentConfirmation.processWebhookEvent(payload);
      logPayment('razorpay_webhook_processed', { event, ok: result.ok, reason: result.reason });
      return res.status(200).json({ success: true });
    } catch (error) {
      logPayment('razorpay_webhook_handler_error', { event, error: error.message });
      return res.status(200).json({ success: true });
    }
  }

  async verifyPayment(req, res) {
    try {
      const txnId = req.body.txnId || req.body.orderId;
      const userId = req.user._id;
      if (!txnId) return res.status(400).json({ success: false, message: 'txnId is required' });

      const result = await razorpayPaymentConfirmation.verifyAndConfirm(txnId, 'api-verify', { useRetry: true });
      const booking =
        result.booking ||
        (await Booking.findOne({ 'payment_details.transaction_id': txnId, user: userId })
          .populate('visiting_state', 'name')
          .populate('user', 'firstName lastName phoneNumber email'));

      const user = await User.findById(userId);
      await saveCustomerLog({ userId, phoneNumber: user?.phoneNumber, type: 'RazorpayVerify', req });

      if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

      const apiStatus =
        booking.status === 'paid' ? 'success' : booking.payment_status === 'failed' ? 'failure' : 'pending';

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
      return res.status(500).json({ success: false, message: 'Verification failed' });
    }
  }

  async getPaymentStatus(req, res) {
    try {
      const txnId = req.params.txnId;
      const userId = req.user._id;

      const result = await razorpayPaymentConfirmation.verifyAndConfirm(txnId, 'status-poll', { useRetry: false });
      const booking =
        result.booking ||
        (await Booking.findOne({ 'payment_details.transaction_id': txnId, user: userId })
          .populate('visiting_state', 'name')
          .populate('user', 'firstName lastName phoneNumber email'));

      if (!booking) return res.status(404).json({ success: false, message: 'Payment transaction not found' });

      const apiStatus =
        booking.status === 'paid' ? 'success' : booking.payment_status === 'failed' ? 'failure' : 'pending';

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
      return res.status(500).json({ success: false, message: 'Failed to get payment status' });
    }
  }

  async testConfig(req, res) {
    const validation = razorpayService.validateConfig();
    return res.status(200).json({
      success: true,
      message: 'Razorpay configuration test',
      data: {
        isValid: validation.isValid,
        errors: validation.errors,
        environment: razorpayService.environment,
        configuration: {
          keyId: process.env.RAZORPAY_KEY_ID ? `${process.env.RAZORPAY_KEY_ID.substring(0, 8)}***` : 'NOT_SET',
          keySecret: process.env.RAZORPAY_KEY_SECRET ? '***SET***' : 'NOT_SET',
          successUrl: razorpayService.successUrl,
          failureUrl: razorpayService.failureUrl,
          webhookUrl: razorpayService.webhookUrl,
        },
      },
    });
  }
}

module.exports = new RazorpayController();
