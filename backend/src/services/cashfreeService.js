

const crypto = require('crypto');
const axios = require('axios');

class CashfreeService {
  constructor() {
    this.appId = process.env.CASHFREE_APP_ID || '';
    this.secretKey = process.env.CASHFREE_SECRET_KEY || '';
    this.environment = (process.env.CASHFREE_ENVIRONMENT || 'sandbox').trim().toLowerCase();
    this.webhookSecret = process.env.CASHFREE_WEBHOOK_SECRET || '';

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
          notify_url: `${this.apiBase}/api/v1/payment/cashfree/webhook`,
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

      return {
        verified: status === 'PAID',
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

  verifyWebhookSignature(rawBody, signature, timestamp) {
    try {
      const secret = this.webhookSecret || process.env.CASHFREE_WEBHOOK_SECRET;
      if (!secret) {
        console.warn('⚠️  CASHFREE_WEBHOOK_SECRET not set – skipping signature check');
        return true;
      }

      const signedPayload = timestamp + rawBody;
      const computed = crypto
        .createHmac('sha256', secret)
        .update(signedPayload)
        .digest('base64');

      return computed === signature;
    } catch (err) {
      console.error('❌ Cashfree signature verification error:', err);
      return false;
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
