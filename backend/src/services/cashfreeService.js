
const axios = require('axios');
const crypto = require('crypto');

class CashfreeService {
  constructor() {
    this.appId = process.env.CASHFREE_APP_ID || '';
    this.secretKey = process.env.CASHFREE_SECRET_KEY || '';
    this.webhookSecret = process.env.CASHFREE_WEBHOOK_SECRET || '';
    this.environment = (process.env.CASHFREE_ENVIRONMENT || 'sandbox').trim().toLowerCase();

    const apiBase = (process.env.API_BASE_URL || process.env.BACKEND_URL || 'https://api.waadi.in')
      .trim()
      .replace(/\/+$/, '');

    // Match PayU callback host (stable server) — dev tunnels crash CCT on Android
    const payuSuccess = (process.env.PAYU_SUCCESS_URL || '').trim();
    const callbackBase = payuSuccess
      ? payuSuccess.replace(/\/api\/v1\/payment\/success\/?$/i, '')
      : apiBase;

    this.successUrl = (
      process.env.CASHFREE_SUCCESS_URL ||
      `${callbackBase}/api/v1/payment/cashfree/success`
    ).trim();

    this.failureUrl = (
      process.env.CASHFREE_FAILURE_URL ||
      `${callbackBase}/api/v1/payment/cashfree/failure`
    ).trim();

    this.apiBase = apiBase;
    this.webhookUrl = `${apiBase}/api/v1/payment/cashfree/webhook`;

    this.baseUrl =
      this.environment === 'production'
        ? 'https://api.cashfree.com/pg'
        : 'https://sandbox.cashfree.com/pg';

    // Backend relay entry — mirrors payuService.paymentUrl pointing at the gateway/relay
    this.relayUrl = `${this.apiBase}/api/v1/payment/cashfree/relay`;

    this.apiVersion = '2023-08-01';

    console.log('🔧 Cashfree Service Configuration:');
    console.log('  App ID:', this.appId ? `${this.appId.substring(0, 6)}***` : 'NOT SET');
    console.log('  Environment:', this.environment);
    console.log('  Base URL:', this.baseUrl);
    console.log('  Relay URL:', this.relayUrl);
    console.log('  Success URL:', this.successUrl);
    console.log('  Failure URL:', this.failureUrl);
    console.log('  Webhook URL:', this.webhookUrl);
  }

  /**
   * Generate transaction ID — mirrors payuService.generateTransactionId()
   */
  generateTransactionId(bookingId) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `ORDER_${bookingId}_${timestamp}_${random}`;
  }

  _headers() {
    return {
      'x-client-id': this.appId,
      'x-client-secret': this.secretKey,
      'x-api-version': this.apiVersion,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Cashfree checkout requires payment_session_id from POST /orders — never order_id / txnid.
   */
  validatePaymentSessionId(paymentSessionId) {
    if (paymentSessionId === undefined || paymentSessionId === null) {
      return { valid: false, error: 'payment_session_id is required' };
    }

    const id = String(paymentSessionId).trim();
    if (!id) {
      return { valid: false, error: 'payment_session_id cannot be empty' };
    }
    if (!id.startsWith('session_')) {
      return { valid: false, error: 'payment_session_id must start with "session_"' };
    }

    return { valid: true, value: id };
  }

  normalizePhone(phone) {
    const digits = String(phone || '').replace(/\D/g, '');
    if (digits.length >= 10) return digits.slice(-10);
    return digits;
  }

  buildReturnUrl(platform = 'web') {
    const base = `${this.successUrl}?order_id={order_id}`;
    return platform === 'app' ? `${base}&platform=app` : base;
  }

  /** Relay entry path — frontend opens `${API}/payment/cashfree/relay` like PayU `/payment/relay`. */
  getRelayPath() {
    return `${this.apiBase}/api/v1/payment/cashfree/relay`;
  }

  /**
   * Prepare payment data — mirrors payuService.preparePaymentData() return shape:
   * { success, paymentUrl, paymentData }
   */
  async preparePaymentData(bookingData, userData, options = {}) {
    try {
      const txnid = this.generateTransactionId(bookingData.bookingId);
      const amount = parseFloat(bookingData.amount).toFixed(2);
      const email = userData.email || `${userData.phoneNumber}@wadisupport.com`;
      const phone = this.normalizePhone(userData.phoneNumber);

      if (!phone || phone.length !== 10) {
        return { success: false, error: 'Valid 10-digit customer phone is required for Cashfree' };
      }

      const customerName =
        (userData.firstName && String(userData.firstName).trim()) || 'Customer';

      const orderPayload = {
        order_id: txnid,
        order_amount: parseFloat(amount),
        order_currency: 'INR',
        order_note: `Border Tax Pass - ${bookingData.tax_mode} - ${bookingData.visiting_state?.name || ''}`,
        customer_details: {
          customer_id: userData._id ? userData._id.toString() : `USER_${Date.now()}`,
          customer_name: customerName,
          customer_email: email,
          customer_phone: phone,
        },
        order_meta: {
          return_url: this.buildReturnUrl(options.platform || 'web'),
          notify_url: this.webhookUrl,
        },
        order_tags: {
          booking_object_id: bookingData._id ? bookingData._id.toString() : '',
          booking_id: bookingData.bookingId || '',
          vehicle_number: bookingData.vehicle_number || '',
        },
      };

      console.log('📤 Creating Cashfree order:', {
        order_id: txnid,
        amount,
        environment: this.environment,
        platform: options.platform || 'web',
      });

      const response = await axios.post(
        `${this.baseUrl}/orders`,
        orderPayload,
        { headers: this._headers(), timeout: 15000 }
      );

      const data = response.data;

      const sessionValidation = this.validatePaymentSessionId(data.payment_session_id);
      if (!sessionValidation.valid) {
        console.error('❌ Cashfree order invalid payment_session_id:', {
          error: sessionValidation.error,
          order_id: data.order_id,
          response_keys: data ? Object.keys(data) : [],
        });
        return { success: false, error: sessionValidation.error };
      }

      const mode = this.environment === 'production' ? 'production' : 'sandbox';

      // Flat string map — mirrors PayU paymentData shape; checkout uses payment_session_id only
      const paymentData = {
        payment_session_id: sessionValidation.value,
        mode,
        txnid: String(data.order_id),
        amount: String(amount),
      };

      if (options.platform === 'app') {
        paymentData.platform = 'app';
      }

      console.log('✅ Cashfree order created:', {
        order_id: data.order_id,
        payment_session_id: `${sessionValidation.value.substring(0, 24)}…`,
        order_status: data.order_status,
        environment: this.environment,
        mode,
      });

      return {
        success: true,
        paymentUrl: this.relayUrl,
        paymentData,
      };
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.response?.data?.error_detail ||
        error.message;
      console.error('❌ Cashfree preparePaymentData error:', msg);
      if (error.response?.data) {
        console.error('❌ Cashfree API response:', JSON.stringify(error.response.data));
      }
      if (error.stack) {
        console.error('❌ Cashfree preparePaymentData stack:', error.stack);
      }
      return { success: false, error: msg };
    }
  }

  async verifyOrder(orderId) {
    try {
      console.log('🔍 Verifying Cashfree order:', orderId);

      const response = await axios.get(`${this.baseUrl}/orders/${orderId}`, {
        headers: this._headers(),
        timeout: 15000,
      });

      const data = response.data;
      const status = (data.order_status || '').toUpperCase();

      if (status === 'PAID') {
        return {
          verified: true,
          status,
          cashfreeOrderId: data.cf_order_id,
          amount: data.order_amount,
          paymentId: data.cf_order_id?.toString() || '',
          rawData: data,
        };
      }

      // Order may still be ACTIVE while payment is already SUCCESS at gateway
      const paymentsResult = await this.getOrderPayments(orderId);
      const payments = this._normalizePaymentsList(paymentsResult.payments);
      const successPayment = payments.find(
        (p) => (p.payment_status || '').toUpperCase() === 'SUCCESS'
      );

      if (successPayment) {
        console.log('✅ Cashfree payment SUCCESS while order status:', status);
        return {
          verified: true,
          status: 'PAID',
          cashfreeOrderId: data.cf_order_id,
          amount: data.order_amount,
          paymentId: successPayment.cf_payment_id?.toString() || data.cf_order_id?.toString() || '',
          rawData: data,
          paymentDetails: successPayment,
        };
      }

      return {
        verified: false,
        status,
        cashfreeOrderId: data.cf_order_id,
        amount: data.order_amount,
        paymentId: data.cf_order_id?.toString() || '',
        rawData: data,
      };
    } catch (error) {
      const msg = error.response?.data?.message || error.message;
      console.error('❌ Cashfree verifyOrder error:', msg);
      return { verified: false, status: 'ERROR', error: msg };
    }
  }

  /**
   * Success return_url may fire before order_status becomes PAID — brief retries (callback only).
   */
  async verifyOrderWithRetry(orderId, options = {}) {
    const maxAttempts = options.maxAttempts ?? 5;
    const delayMs = options.delayMs ?? 1200;

    let last = await this.verifyOrder(orderId);
    for (let attempt = 1; attempt < maxAttempts && !last.verified; attempt += 1) {
      console.log(`⏳ Cashfree verify retry ${attempt}/${maxAttempts - 1} for`, orderId);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      last = await this.verifyOrder(orderId);
    }
    return last;
  }

  /** Compare gateway amount to booking amount (2-decimal tolerance). */
  amountsMatch(received, expected) {
    const a = parseFloat(received);
    const b = parseFloat(expected);
    if (Number.isNaN(a) || Number.isNaN(b)) return false;
    return Math.abs(a - b) < 0.01;
  }

  async getOrderPayments(orderId) {
    try {
      const response = await axios.get(`${this.baseUrl}/orders/${orderId}/payments`, {
        headers: this._headers(),
        timeout: 15000,
      });
      return { success: true, payments: response.data };
    } catch (error) {
      return { success: false, error: error.message, payments: [] };
    }
  }

  _normalizePaymentsList(data) {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.payments)) return data.payments;
    return [];
  }

  /**
   * Resolve Cashfree payment tracking fields from order verification / payments API.
   */
  async resolvePaymentTrackingDetails(orderId, context = {}) {
    const { verification } = context;

    let paymentTransactionId = null;
    let bankReference = null;
    let cashfreeOrderId =
      verification?.cashfreeOrderId?.toString() ||
      verification?.rawData?.cf_order_id?.toString() ||
      null;

    try {
      const paymentsResult = await this.getOrderPayments(orderId);
      const payments = this._normalizePaymentsList(paymentsResult.payments);
      const successPayment =
        payments.find((p) => (p.payment_status || '').toUpperCase() === 'SUCCESS') ||
        payments[0];

      if (successPayment) {
        paymentTransactionId =
          paymentTransactionId || successPayment.cf_payment_id?.toString() || null;
        if (bankReference === null) {
          bankReference =
            successPayment.bank_reference !== undefined && successPayment.bank_reference !== null
              ? String(successPayment.bank_reference)
              : null;
        }
      }
    } catch (error) {
      console.warn('⚠️ Cashfree resolvePaymentTrackingDetails payments fetch failed:', error.message);
    }

    return {
      payment_transaction_id: paymentTransactionId || null,
      bank_reference: bankReference ?? null,
      cashfree_order_id: cashfreeOrderId || null,
    };
  }

  applyPaymentTrackingToBooking(booking, tracking) {
    if (!booking || !tracking) return;

    booking.payment_details = booking.payment_details || {};

    if (tracking.payment_transaction_id) {
      booking.payment_details.payment_transaction_id = tracking.payment_transaction_id;
    }

    booking.payment_details.bank_reference = tracking.bank_reference ?? null;

    if (tracking.cashfree_order_id) {
      booking.payment_details.cashfree_order_id = tracking.cashfree_order_id;
    }
  }

  getPaymentStatus(cashfreeStatus) {
    const map = {
      PAID: 'paid',
      ACTIVE: 'pending',
      EXPIRED: 'failed',
      CANCELLED: 'cancelled',
      FAILED: 'failed',
      PARTIALLY_PAID: 'pending',
    };
    return map[(cashfreeStatus || '').toUpperCase()] || 'failed';
  }

  /**
   * Status for client polling — never report failure while checkout may still be open.
   * Mirrors PayU polling where missing/failed API reads are treated as "still waiting".
   */
  resolvePollingStatus(cashfreeStatus, bookingStatus = 'pending') {
    const upper = (cashfreeStatus || '').toUpperCase();
    if (upper === 'ERROR' || upper === '') {
      return bookingStatus === 'paid' ? 'paid' : 'pending';
    }
    const normalized = this.getPaymentStatus(upper);
    if (normalized === 'failed' || normalized === 'cancelled') {
      return bookingStatus === 'paid' ? 'paid' : normalized;
    }
    return normalized;
  }

  /**
   * Verify Cashfree webhook HMAC (x-webhook-signature + x-webhook-timestamp).
   */
  verifyWebhookSignature(rawBody, signature, timestamp) {
    try {
      const secret = this.webhookSecret || process.env.CASHFREE_WEBHOOK_SECRET;
      if (!secret) {
        const isProd =
          process.env.NODE_ENV === 'production' || this.environment === 'production';
        if (isProd) {
          console.error('❌ CASHFREE_WEBHOOK_SECRET not set – rejecting webhook in production');
          return false;
        }
        console.warn('⚠️ CASHFREE_WEBHOOK_SECRET not set – skipping signature check (non-production)');
        return true;
      }

      if (!signature || !timestamp) {
        console.error('❌ Cashfree webhook missing signature or timestamp headers');
        return false;
      }

      const body = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody || '');
      const signedPayload = `${timestamp}${body}`;
      const expected = crypto
        .createHmac('sha256', secret)
        .update(signedPayload)
        .digest('base64');

      const sigBuf = Buffer.from(signature);
      const expBuf = Buffer.from(expected);
      if (sigBuf.length !== expBuf.length) return false;
      return crypto.timingSafeEqual(sigBuf, expBuf);
    } catch (error) {
      console.error('❌ Cashfree webhook signature verification error:', error.message);
      return false;
    }
  }

  validateConfig() {
    const errors = [];
    if (!this.appId) errors.push('CASHFREE_APP_ID is required');
    if (!this.secretKey) errors.push('CASHFREE_SECRET_KEY is required');
    if (!this.successUrl) errors.push('CASHFREE_SUCCESS_URL is required');
    if (!this.failureUrl) errors.push('CASHFREE_FAILURE_URL is required');

    return { isValid: errors.length === 0, errors };
  }

  logTransaction(type, data) {
    console.log(`🔄 Cashfree Transaction [${type}]:`, {
      timestamp: new Date().toISOString(),
      type,
      txnid: data.txnid || data.orderId || data.order_id,
      amount: data.amount,
      status: data.status || 'initiated',
      bookingId: data.bookingId || data.udf2,
    });
  }
}

module.exports = new CashfreeService();
