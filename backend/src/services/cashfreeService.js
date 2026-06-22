

const crypto = require('crypto');
const axios = require('axios');

class CashfreeService {
  constructor() {
    this.appId = process.env.CASHFREE_APP_ID || '';
    this.secretKey = process.env.CASHFREE_SECRET_KEY || '';
    this.environment = process.env.CASHFREE_ENVIRONMENT || 'sandbox';
    this.webhookSecret = process.env.CASHFREE_WEBHOOK_SECRET || '';

    this.successUrl =
      process.env.CASHFREE_SUCCESS_URL ||
      'https://api.waadi.in/api/v1/payment/cashfree/success';
    this.failureUrl =
      process.env.CASHFREE_FAILURE_URL ||
      'https://api.waadi.in/api/v1/payment/cashfree/failure';

    // Cashfree API base URLs
    this.baseUrl =
      this.environment === 'production'
        ? 'https://api.cashfree.com/pg'
        : 'https://sandbox.cashfree.com/pg';

    // Cashfree API version (use latest stable)
    this.apiVersion = '2023-08-01';

    console.log('🔧 Cashfree Service Configuration:');
    console.log('  App ID:', this.appId ? `${this.appId.substring(0, 6)}***` : 'NOT SET');
    console.log('  Environment:', this.environment);
    console.log('  Base URL:', this.baseUrl);
    console.log('  Success URL:', this.successUrl);
    console.log('  Failure URL:', this.failureUrl);
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  /**
   * Generate a unique order ID that Cashfree will reference.
   * Format mirrors payuService.generateTransactionId()
   */
  generateOrderId(bookingId) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `CF_${bookingId}_${timestamp}_${random}`;
  }

  /**
   * Return the Axios headers required for every Cashfree API call.
   */
  _headers() {
    return {
      'x-client-id': this.appId,
      'x-client-secret': this.secretKey,
      'x-api-version': this.apiVersion,
      'Content-Type': 'application/json',
    };
  }

  // ─── Core: Create Payment Session ───────────────────────────────────────────

  /**
   * Create a Cashfree payment order and return the payment_session_id
   * needed by the Cashfree JS SDK on the frontend.
   *
   * @param {Object} bookingData  – { bookingId, amount, tax_mode, visiting_state, vehicle_number, _id }
   * @param {Object} userData     – { firstName, email, phoneNumber }
   * @returns {Object}  { success, orderId, paymentSessionId, paymentUrl, expiresAt }
   */
  async preparePaymentData(bookingData, userData) {
    try {
      const orderId = this.generateOrderId(bookingData.bookingId);
      const amount = parseFloat(bookingData.amount).toFixed(2);

      const email =
        userData.email || `${userData.phoneNumber}@wadisupport.com`;

      const orderPayload = {
        order_id: orderId,
        order_amount: parseFloat(amount),
        order_currency: 'INR',
        order_note: `Border Tax Pass - ${bookingData.tax_mode} - ${bookingData.visiting_state?.name || ''}`,

        customer_details: {
          customer_id: userData._id ? userData._id.toString() : `USER_${Date.now()}`,
          customer_name: userData.firstName,
          customer_email: email,
          customer_phone: userData.phoneNumber,
        },

        // order_meta: {
        //   return_url: `${this.successUrl}?order_id={order_id}&order_token={order_token}`,
        //   notify_url: `${process.env.API_BASE_URL || 'https://api.waadi.in/'}/api/v1/payment/cashfree/webhook`,
        // },
        order_meta: {
  return_url: `${this.successUrl}?order_id={order_id}`,
  notify_url: `${process.env.API_BASE_URL || 'https://api.waadi.in/'}/api/v1/payment/cashfree/webhook`,
},

        // Store our internal references in order_tags (max 10 k-v pairs)
        order_tags: {
          booking_object_id: bookingData._id ? bookingData._id.toString() : '',
          booking_id: bookingData.bookingId || '',
          vehicle_number: bookingData.vehicle_number || '',
        },
      };

      console.log('📤 Creating Cashfree order:', orderId);

      const response = await axios.post(
        `${this.baseUrl}/orders`,
        orderPayload,
        { headers: this._headers(), timeout: 15000 }
      );

      const data = response.data;

      console.log('✅ Cashfree order created:', {
        order_id: data.order_id,
        order_status: data.order_status,
        payment_session_id: data.payment_session_id ? '***' : 'MISSING',
      });

      return {
        success: true,
        orderId: data.order_id,
        paymentSessionId: data.payment_session_id,
        expiresAt: data.order_expiry_time,
        // Checkout page URL (redirect flow) – returned but SDK flow is preferred
        paymentUrl: `${this.baseUrl}/checkout?session_id=${data.payment_session_id}`,
        environment: this.environment,
        cfOrderId: data.cf_order_id,
      };
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.response?.data?.error_detail ||
        error.message;
      console.error('❌ Cashfree preparePaymentData error:', msg);
      return { success: false, error: msg };
    }
  }

  // ─── Verify / Fetch Order ────────────────────────────────────────────────────

  /**
   * Fetch order status directly from Cashfree API (authoritative verification).
   * @param {string} orderId – Our internal order_id / txn_id
   * @returns {Object} { verified, status, cashfreeOrderId, amount, paymentId }
   */
  async verifyOrder(orderId) {
    try {
      console.log('🔍 Verifying Cashfree order:', orderId);

      const response = await axios.get(
        `${this.baseUrl}/orders/${orderId}`,
        { headers: this._headers(), timeout: 15000 }
      );

      const data = response.data;
      const status = (data.order_status || '').toUpperCase();

      console.log('🔍 Cashfree order status:', status);

      return {
        verified: status === 'PAID',
        status,
        cashfreeOrderId: data.cf_order_id,
        amount: data.order_amount,
        paymentId: data.cf_order_id?.toString() || '',
        rawData: data,
      };
    } catch (error) {
      const msg =
        error.response?.data?.message || error.message;
      console.error('❌ Cashfree verifyOrder error:', msg);
      return { verified: false, status: 'ERROR', error: msg };
    }
  }

  /**
   * Fetch individual payment details for an order.
   * Returns the first successful payment (if any).
   */
  async getOrderPayments(orderId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/orders/${orderId}/payments`,
        { headers: this._headers(), timeout: 15000 }
      );
      return { success: true, payments: response.data };
    } catch (error) {
      return { success: false, error: error.message, payments: [] };
    }
  }

  // ─── Webhook Signature Verification ─────────────────────────────────────────

  /**
   * Verify the Cashfree webhook signature.
   * Cashfree sends: x-webhook-signature, x-webhook-timestamp
   *
   * @param {string} rawBody     – Raw request body string (not parsed)
   * @param {string} signature   – Value of x-webhook-signature header
   * @param {string} timestamp   – Value of x-webhook-timestamp header
   * @returns {boolean}
   */
  verifyWebhookSignature(rawBody, signature, timestamp) {
    try {
      const secret = this.webhookSecret || process.env.CASHFREE_WEBHOOK_SECRET;
      if (!secret) {
        console.warn('⚠️  CASHFREE_WEBHOOK_SECRET not set – skipping signature check');
        return true; // Permissive in dev; set the secret in production!
      }

      // Cashfree signs: timestamp + rawBody
      const signedPayload = timestamp + rawBody;
      const computed = crypto
        .createHmac('sha256', secret)
        .update(signedPayload)
        .digest('base64');

      const valid = computed === signature;
      if (!valid) {
        console.error('❌ Cashfree webhook signature mismatch');
        console.error('   Computed :', computed);
        console.error('   Received :', signature);
      }
      return valid;
    } catch (err) {
      console.error('❌ Cashfree signature verification error:', err);
      return false;
    }
  }

  // ─── Status Normalisation ────────────────────────────────────────────────────

  /**
   * Map Cashfree order/payment status → our internal status.
   * Mirrors payuService.getPaymentStatus()
   */
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

  // ─── Config Validation ───────────────────────────────────────────────────────

  validateConfig() {
    const errors = [];
    if (!this.appId) errors.push('CASHFREE_APP_ID is required');
    if (!this.secretKey) errors.push('CASHFREE_SECRET_KEY is required');
    if (!this.successUrl) errors.push('CASHFREE_SUCCESS_URL is required');
    if (!this.failureUrl) errors.push('CASHFREE_FAILURE_URL is required');

    console.log('🔍 Cashfree Config Validation:');
    console.log('  App ID set:', !!this.appId);
    console.log('  Secret Key set:', !!this.secretKey);
    console.log('  Environment:', this.environment);

    return { isValid: errors.length === 0, errors };
  }

  // ─── Logging ─────────────────────────────────────────────────────────────────

  logTransaction(type, data) {
    console.log(`🔄 Cashfree Transaction [${type}]:`, {
      timestamp: new Date().toISOString(),
      type,
      orderId: data.orderId || data.order_id,
      amount: data.amount || data.order_amount,
      status: data.status || 'initiated',
    });
  }
}

module.exports = new CashfreeService();