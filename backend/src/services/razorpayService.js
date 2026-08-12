const axios = require('axios');
const crypto = require('crypto');

class RazorpayService {
  constructor() {
    this.keyId = process.env.RAZORPAY_KEY_ID || '';
    this.keySecret = process.env.RAZORPAY_KEY_SECRET || '';
    this.webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
    this.environment = (process.env.RAZORPAY_ENVIRONMENT || 'production').trim().toLowerCase();

    const apiBase = (process.env.API_BASE_URL || process.env.BACKEND_URL || 'https://api.waadi.in')
      .trim()
      .replace(/\/+$/, '');

    const payuSuccess = (process.env.PAYU_SUCCESS_URL || '').trim();
    const callbackBase = payuSuccess
      ? payuSuccess.replace(/\/api\/v1\/payment\/success\/?$/i, '')
      : apiBase;

    this.successUrl = (
      process.env.RAZORPAY_SUCCESS_URL ||
      `${callbackBase}/api/v1/payment/razorpay/success`
    ).trim();

    this.failureUrl = (
      process.env.RAZORPAY_FAILURE_URL ||
      `${callbackBase}/api/v1/payment/razorpay/failure`
    ).trim();

    this.apiBase = apiBase;
    this.webhookUrl = `${apiBase}/api/v1/payment/razorpay/webhook`;
    this.apiUrl = 'https://api.razorpay.com/v1';
    this.relayUrl = `${this.apiBase}/api/v1/payment/razorpay/relay`;

    console.log('🔧 Razorpay Service Configuration:');
    console.log('  Key ID:', this.keyId ? `${this.keyId.substring(0, 8)}***` : 'NOT SET');
    console.log('  Environment:', this.environment);
    console.log('  Relay URL:', this.relayUrl);
    console.log('  Success URL:', this.successUrl);
    console.log('  Failure URL:', this.failureUrl);
    console.log('  Webhook URL:', this.webhookUrl);
  }

  _authHeader() {
    const token = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
    return {
      Authorization: `Basic ${token}`,
      'Content-Type': 'application/json',
    };
  }

  generateTransactionId(bookingId) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `ORDER_${bookingId}_${timestamp}_${random}`;
  }

  normalizePhone(phone) {
    const digits = String(phone || '').replace(/\D/g, '');
    if (digits.length >= 10) return digits.slice(-10);
    return digits;
  }

  buildReturnUrl(platform = 'web') {
    const base = `${this.successUrl}?txnid={receipt}`;
    return platform === 'app' ? `${base}&platform=app` : base;
  }

  amountsMatch(received, expected) {
    const a = parseFloat(received);
    const b = parseFloat(expected);
    if (Number.isNaN(a) || Number.isNaN(b)) return false;
    return Math.abs(a - b) < 0.01;
  }

  /**
   * Prepare payment data — mirrors cashfreeService.preparePaymentData() return shape.
   */
  async preparePaymentData(bookingData, userData, options = {}) {
    try {
      const txnid = this.generateTransactionId(bookingData.bookingId);
      const amountInr = parseFloat(bookingData.amount);
      const amountPaise = Math.round(amountInr * 100);
      const email = userData.email || `${userData.phoneNumber}@wadisupport.com`;
      const phone = this.normalizePhone(userData.phoneNumber);
      const customerName =
        [userData.firstName, userData.lastName].filter(Boolean).join(' ').trim() || 'Customer';

      if (!phone || phone.length !== 10) {
        return { success: false, error: 'Valid 10-digit customer phone is required for Razorpay' };
      }

      const callbackUrl = this.buildReturnUrl(options.platform || 'web').replace('{receipt}', txnid);

      const orderPayload = {
        amount: amountPaise,
        currency: 'INR',
        receipt: txnid,
        notes: {
          booking_id: bookingData.bookingId || '',
          booking_object_id: bookingData._id ? bookingData._id.toString() : '',
          vehicle_number: bookingData.vehicle_number || '',
        },
      };

      console.log('📤 Creating Razorpay order:', {
        receipt: txnid,
        amount: amountInr,
        environment: this.environment,
        platform: options.platform || 'web',
      });

      const response = await axios.post(`${this.apiUrl}/orders`, orderPayload, {
        headers: this._authHeader(),
        timeout: 15000,
      });

      const order = response.data;
      if (!order?.id) {
        return { success: false, error: 'Razorpay order creation failed — missing order id' };
      }

      const paymentData = {
        txnid,
        razorpay_order_id: String(order.id),
        key_id: this.keyId,
        amount: String(amountPaise),
        currency: 'INR',
        name: 'Waadi Cab',
        description: `Border Tax Pass - ${bookingData.tax_mode || ''}`,
        prefill_name: customerName,
        prefill_email: email,
        prefill_contact: phone,
        callback_url: callbackUrl,
        mode: this.environment === 'production' ? 'production' : 'test',
      };

      if (options.platform === 'app') {
        paymentData.platform = 'app';
      }

      console.log('✅ Razorpay order created:', {
        receipt: txnid,
        razorpay_order_id: order.id,
        status: order.status,
      });

      return {
        success: true,
        paymentUrl: this.relayUrl,
        paymentData,
      };
    } catch (error) {
      const msg =
        error.response?.data?.error?.description ||
        error.response?.data?.message ||
        error.message;
      console.error('❌ Razorpay preparePaymentData error:', msg);
      return { success: false, error: msg };
    }
  }

  async verifyOrder(txnId, context = {}) {
    try {
      const razorpayOrderId = context.razorpayOrderId;
      let order;

      if (razorpayOrderId) {
        const response = await axios.get(`${this.apiUrl}/orders/${razorpayOrderId}`, {
          headers: this._authHeader(),
          timeout: 15000,
        });
        order = response.data;
      } else if (txnId) {
        const booking = context.booking;
        const storedOrderId = booking?.payment_details?.razorpay_order_id;
        if (storedOrderId) {
          const response = await axios.get(`${this.apiUrl}/orders/${storedOrderId}`, {
            headers: this._authHeader(),
            timeout: 15000,
          });
          order = response.data;
        }
      }

      if (!order?.id) {
        return { verified: false, status: 'NOT_FOUND', error: 'Order not found' };
      }

      const status = (order.status || '').toLowerCase();
      const amountInr = (order.amount || 0) / 100;

      if (status === 'paid') {
        const payments = await this.getOrderPayments(order.id);
        const captured = payments.find((p) => (p.status || '').toLowerCase() === 'captured');
        return {
          verified: true,
          status: 'PAID',
          amount: amountInr,
          paymentId: captured?.id?.toString() || '',
          razorpayOrderId: order.id,
          rawData: order,
          paymentDetails: captured || null,
        };
      }

      if (razorpayOrderId || order.id) {
        const payments = await this.getOrderPayments(order.id);
        const captured = payments.find((p) => (p.status || '').toLowerCase() === 'captured');
        if (captured) {
          return {
            verified: true,
            status: 'PAID',
            amount: amountInr,
            paymentId: captured.id?.toString() || '',
            razorpayOrderId: order.id,
            rawData: order,
            paymentDetails: captured,
          };
        }
      }

      return {
        verified: false,
        status: status.toUpperCase() || 'PENDING',
        amount: amountInr,
        razorpayOrderId: order.id,
        rawData: order,
      };
    } catch (error) {
      const msg = error.response?.data?.error?.description || error.message;
      console.error('❌ Razorpay verifyOrder error:', msg);
      return { verified: false, status: 'ERROR', error: msg };
    }
  }

  async verifyOrderWithRetry(txnId, options = {}) {
    const maxAttempts = options.maxAttempts ?? 5;
    const delayMs = options.delayMs ?? 1200;
    const context = options.context || {};

    let last = await this.verifyOrder(txnId, context);
    for (let attempt = 1; attempt < maxAttempts && !last.verified; attempt += 1) {
      console.log(`⏳ Razorpay verify retry ${attempt}/${maxAttempts - 1} for`, txnId);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      last = await this.verifyOrder(txnId, context);
    }
    return last;
  }

  async getOrderPayments(razorpayOrderId) {
    try {
      const response = await axios.get(`${this.apiUrl}/orders/${razorpayOrderId}/payments`, {
        headers: this._authHeader(),
        timeout: 15000,
      });
      const data = response.data;
      return Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
    } catch (error) {
      console.warn('⚠️ Razorpay getOrderPayments failed:', error.message);
      return [];
    }
  }

  verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, signature) {
    try {
      const secret = this.keySecret || process.env.RAZORPAY_KEY_SECRET;
      if (!secret || !razorpayOrderId || !razorpayPaymentId || !signature) return false;

      const payload = `${razorpayOrderId}|${razorpayPaymentId}`;
      const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
      const sigBuf = Buffer.from(signature);
      const expBuf = Buffer.from(expected);
      if (sigBuf.length !== expBuf.length) return false;
      return crypto.timingSafeEqual(sigBuf, expBuf);
    } catch (error) {
      console.error('❌ Razorpay payment signature error:', error.message);
      return false;
    }
  }

  verifyWebhookSignature(rawBody, signature) {
    try {
      const secrets = [
        this.webhookSecret || process.env.RAZORPAY_WEBHOOK_SECRET,
        this.keySecret || process.env.RAZORPAY_KEY_SECRET,
      ].filter(Boolean);

      if (!secrets.length) {
        const isProd =
          process.env.NODE_ENV === 'production' || this.environment === 'production';
        if (isProd) {
          console.error('❌ RAZORPAY_WEBHOOK_SECRET not set – rejecting webhook in production');
          return false;
        }
        console.warn('⚠️ RAZORPAY_WEBHOOK_SECRET not set – skipping signature check (non-production)');
        return true;
      }

      if (!signature) {
        console.error('❌ Razorpay webhook missing X-Razorpay-Signature header');
        return false;
      }

      const body = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody || '');

      for (const secret of secrets) {
        const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
        const sigBuf = Buffer.from(signature);
        const expBuf = Buffer.from(expected);
        if (sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf)) {
          return true;
        }
      }

      console.error('❌ Razorpay webhook signature mismatch');
      return false;
    } catch (error) {
      console.error('❌ Razorpay webhook signature verification error:', error.message);
      return false;
    }
  }

  async resolvePaymentTrackingDetails(txnId, context = {}) {
    const { verification } = context;
    let paymentTransactionId = verification?.paymentId?.toString() || null;
    let razorpayOrderId = verification?.razorpayOrderId?.toString() || null;

    if (!paymentTransactionId && razorpayOrderId) {
      const payments = await this.getOrderPayments(razorpayOrderId);
      const captured = payments.find((p) => (p.status || '').toLowerCase() === 'captured');
      if (captured) {
        paymentTransactionId = captured.id?.toString() || null;
      }
    }

    return {
      payment_transaction_id: paymentTransactionId,
      bank_reference: null,
      razorpay_order_id: razorpayOrderId,
    };
  }

  applyPaymentTrackingToBooking(booking, tracking) {
    if (!booking || !tracking) return;
    booking.payment_details = booking.payment_details || {};
    if (tracking.payment_transaction_id) {
      booking.payment_details.payment_transaction_id = tracking.payment_transaction_id;
    }
    if (tracking.razorpay_order_id) {
      booking.payment_details.razorpay_order_id = tracking.razorpay_order_id;
    }
    booking.payment_details.bank_reference = tracking.bank_reference ?? null;
  }

  getPaymentStatus(razorpayStatus) {
    const map = {
      PAID: 'paid',
      CREATED: 'pending',
      ATTEMPTED: 'pending',
      FAILED: 'failed',
      CANCELLED: 'cancelled',
    };
    return map[(razorpayStatus || '').toUpperCase()] || 'pending';
  }

  resolvePollingStatus(razorpayStatus, bookingStatus = 'pending') {
    const upper = (razorpayStatus || '').toUpperCase();
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
    if (!this.keyId) errors.push('RAZORPAY_KEY_ID is required');
    if (!this.keySecret) errors.push('RAZORPAY_KEY_SECRET is required');
    if (!this.successUrl) errors.push('RAZORPAY_SUCCESS_URL is required');
    if (!this.failureUrl) errors.push('RAZORPAY_FAILURE_URL is required');
    return { isValid: errors.length === 0, errors };
  }

  logTransaction(type, data) {
    console.log(`🔄 Razorpay Transaction [${type}]:`, {
      timestamp: new Date().toISOString(),
      type,
      txnid: data.txnid || data.orderId,
      amount: data.amount,
      status: data.status || 'initiated',
      bookingId: data.bookingId,
    });
  }
}

module.exports = new RazorpayService();
