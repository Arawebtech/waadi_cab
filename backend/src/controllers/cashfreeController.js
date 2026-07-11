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
const { isAppPlatformRequest } = require('../utils/platformRequest');
const { redirectAfterPayment } = require('../utils/paymentAppRedirect');
const { emitPaymentVerified, emitNewBooking } = require('../utils/socketEvents');

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
   * Cashfree redirects the user here after payment (return_url).
   * We verify the order status server-side, update the booking, then
   * redirect the user to the React app's success/failure page.
   *
   * Query params from Cashfree: ?order_id=<>&order_token=<>
   */
  async handleSuccess(req, res) {
    try {
      const rawOrderId =
        req.query.order_id || req.query.orderId || req.query.txnid || req.query.txnId;
      const order_id = Array.isArray(rawOrderId) ? rawOrderId[0] : rawOrderId;

      console.log('\n' + '='.repeat(80));
      console.log('🎉 Cashfree SUCCESS callback received');
      console.log('='.repeat(80));
      console.log('- order_id:', order_id);
      console.log('- platform:', req.query.platform);
      console.log('- user-agent:', req.headers['user-agent']);
      console.log('- query:', req.query);

      if (!order_id) {
        return redirectAfterPayment(res, 'failure', {
          error: 'Missing order_id from Cashfree',
        });
      }

      const verification = await cashfreeService.verifyOrderWithRetry(order_id);

      let booking = await Booking.findOne({
        'payment_details.transaction_id': order_id,
      })
        .populate('visiting_state', 'name')
        .populate('user', 'firstName lastName phoneNumber email');

      if (!booking) {
        console.error('❌ No booking found for Cashfree order_id:', order_id);
        return redirectAfterPayment(res, 'failure', {
          txnId: order_id,
          error: 'Booking not found',
        });
      }

      if (verification.verified) {
        if (!cashfreeService.amountsMatch(verification.amount, booking.amount)) {
          console.error('❌ Cashfree amount mismatch:', {
            expected: booking.amount,
            received: verification.amount,
          });
          return redirectAfterPayment(res, 'failure', {
            txnId: order_id,
            amount: booking.amount,
            bookingId: booking.bookingId,
            gateway: 'cashfree',
            error: 'Amount mismatch',
          });
        }

      //   await this._finalizeVerifiedPayment(booking, order_id, verification, 'success-callback');
      // }

        // 🔥 Add this here
  const savedBooking = await Booking.findById(booking._id)
    .populate('visiting_state', 'name')
    .populate('user', 'firstName lastName phoneNumber email');


emitNewBooking(savedBooking)

  console.log('📡 Emitted new booking event to admin dashboard');
}

      
      // Same status rules as PayU polling — do not treat ACTIVE/ERROR as failure on return URL
      const normalized = cashfreeService.resolvePollingStatus(
        verification.status,
        booking.status
      );

      let outcome;
      if (normalized === 'paid') {
        outcome = 'success';
      } else if (normalized === 'pending') {
        outcome = 'pending';
      } else {
        outcome = 'failure';
      }

      console.log('↪️  Cashfree redirect outcome:', {
        outcome,
        orderStatus: verification.status,
        bookingId: booking.bookingId,
        verified: verification.verified,
        bookingPaid: booking.status,
        normalized,
      });

      return redirectAfterPayment(res, outcome, {
        txnId: order_id,
        amount: verification.amount ?? booking.amount,
        bookingId: booking.bookingId,
        gateway: 'cashfree',
        error: outcome === 'failure' ? `Order status: ${verification.status}` : undefined,
      });
    } catch (err) {
      console.error('❌ Cashfree success error:', err);
      return redirectAfterPayment(res, 'failure', {
        txnId: req.query.order_id,
        error: err.message,
      });
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

      console.log('❌ Cashfree FAILURE callback:', {
        order_id,
        platform: req.query.platform,
        userAgent: req.headers['user-agent'],
        query: req.query,
      });
      let booking = null;

      if (order_id) {
        booking = await Booking.findOne({
          'payment_details.transaction_id': order_id,
        });

        if (booking && booking.status === 'pending') {
          booking.payment_status = 'failed';
          booking.payment_details = booking.payment_details || {};
          booking.payment_details.failure_reason = 'Payment failed or cancelled by user';
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

      return redirectAfterPayment(res, 'failure', {
        txnId: order_id,
        amount: booking?.amount,
        error: 'Payment failed or cancelled',
      });
    } catch (error) {
      console.error('❌ CashfreeController.handleFailure error:', error);
      return redirectAfterPayment(res, 'failure', {
        txnId: req.query.order_id,
        error: error.message,
      });
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

      const verification = await cashfreeService.verifyOrder(txnId);

      const booking = await Booking.findOne({
        'payment_details.transaction_id': txnId,
        user: userId,
      })
        .populate('visiting_state', 'name')
        .populate('user', 'firstName lastName phoneNumber email');

      const user = await User.findById(userId);
      await saveCustomerLog({ userId, phoneNumber: user?.phoneNumber, type: 'CashfreeVerify', req });

      if (!booking) {
        return res.status(404).json({ success: false, message: 'Booking not found' });
      }

      if (verification.verified) {
        await this._finalizeVerifiedPayment(booking, txnId, verification, 'verify-payment');
      }

      const normalized = cashfreeService.resolvePollingStatus(verification.status, booking.status);
      const apiStatus =
        normalized === 'paid' ? 'success' : normalized === 'pending' ? 'pending' : 'failure';

      return res.status(200).json({
        success: verification.verified || apiStatus === 'pending',
        data: {
          txnId,
          status: apiStatus,
          paymentId: verification.paymentId,
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

      const booking = await Booking.findOne({
        'payment_details.transaction_id': txnId,
        user: userId,
      })
        .populate('visiting_state', 'name')
        .populate('user', 'firstName lastName phoneNumber email');

      if (!booking) {
        return res.status(404).json({ success: false, message: 'Payment transaction not found' });
      }

      const verification = await cashfreeService.verifyOrder(txnId);

      if (verification.verified) {
        await this._finalizeVerifiedPayment(booking, txnId, verification, 'payment-status');
      }

      const normalized = cashfreeService.resolvePollingStatus(verification.status, booking.status);
      const apiStatus =
        normalized === 'paid' ? 'success' : normalized === 'pending' ? 'pending' : 'failure';

      return res.status(200).json({
        success: true,
        data: {
          txnId,
          status: apiStatus,
          paymentId: verification.paymentId,
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
        },
      },
    });
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  /**
   * Persist Cashfree gateway transaction IDs on the booking after verified payment.
   */
  async _applyVerifiedCashfreePaymentTracking(booking, orderId, context = {}) {
    if (!booking || !orderId) return;

    const tracking = await cashfreeService.resolvePaymentTrackingDetails(orderId, context);
    cashfreeService.applyPaymentTrackingToBooking(booking, tracking);
  }

  /**
   * Confirm a verified Cashfree payment — mirrors PayU success callback updates.
   * Idempotent: safe if success callback, verify, and status poll all run.
   */
  async _finalizeVerifiedPayment(booking, orderId, verification, source = 'callback') {
    if (!booking || !verification?.verified) {
      return { booking, payment: null, newlyConfirmed: false };
    }

    if (booking.status === 'paid') {
      if (!booking.payment_details?.payment_transaction_id) {
        booking.payment_details = booking.payment_details || {};
        await this._applyVerifiedCashfreePaymentTracking(booking, orderId, { verification });
        await booking.save();
      }
      return { booking, payment: null, newlyConfirmed: false };
    }

    booking.status = 'paid';
    booking.payment_status = 'paid';
    booking.payment_details = booking.payment_details || {};
    booking.payment_details.payment_method = 'cashfree';
    booking.payment_details.paid_at = new Date();
    booking.payment_details.verification_method = `cashfree_${source}`;
    await this._applyVerifiedCashfreePaymentTracking(booking, orderId, { verification });
    await booking.save();

    let payment = await Payment.findOne({ txn_id: orderId });
    if (!payment) {
      payment = new Payment({
        txn_id: orderId,
        payu_payment_id: booking.payment_details.payment_transaction_id || '',
        bank_ref_number: booking.payment_details.bank_reference || undefined,
        amount: parseFloat(verification.amount) || booking.amount,
        status: 'success',
        payment_method: 'cashfree',
        user: booking.user._id || booking.user,
        booking: booking._id,
        verified: true,
        response_data: verification.rawData || {},
      });
      await payment.save();
    } else if (payment.status !== 'success') {
      payment.status = 'success';
      payment.verified = true;
      payment.response_data = verification.rawData || {};
      await payment.save();
    }

    await booking.populate([
      { path: 'visiting_state', select: 'name' },
      { path: 'user', select: 'firstName lastName phoneNumber email' },
    ]);

    cashfreeService.logTransaction('success', {
      orderId,
      amount: booking.amount,
      status: 'success',
      source,
    });

    console.log('✅ Cashfree payment confirmed:', booking.bookingId, `(${source})`);

    emitPaymentVerified(booking, {
      gateway: 'cashfree',
      source,
      payment: payment.getSummary(),
    });

    this._sendWhatsapp(booking).catch(() => {});

    return { booking, payment, newlyConfirmed: true };
  }

  async _sendWhatsapp(booking) {
    if (whatsappService.isReady) {
      await whatsappService.sendPaymentConfirmation(booking, booking.user);
    }
  }
}

module.exports = new CashfreeController();