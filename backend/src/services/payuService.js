const crypto = require('crypto');

class PayUService {
  constructor() {
    this.key = process.env.PAYU_KEY || process.env.PAYU_MERCHANT_KEY ;
    this.salt =  process.env.PAYU_SALT  || process.env.PAYU_MERCHANT_SALT ;
    this.environment ='production';
    this.verifyUrl = process.env.PAYU_VERIFY_URL || 'https://info.payu.in/merchant/postservice.php?form=2';
    this.successUrl = process.env.PAYU_SUCCESS_URL || 'https://api.waadi.in/api/v1/payment/success';
    this.failureUrl = process.env.PAYU_FAILURE_URL || 'https://api.waadi.in/api/v1/payment/failure';
    this.paymentUrl = 'https://secure.payu.in/_payment' ;
    
    // Log configuration for debugging
    console.log('🔧 PayU Service Configuration:');
    console.log('  Key:', this.key);
    console.log('  Salt:', this.salt);
    console.log('  Environment:', this.environment);
    console.log('  Success URL:', this.successUrl);
    console.log('  Failure URL:', this.failureUrl);
  }

  /**
   * Generate transaction ID
   * @param {string} bookingId - Booking ID
   * @returns {string} Transaction ID
   */
  generateTransactionId(bookingId) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `ORDER_${bookingId}_${timestamp}_${random}`;
  }

  /**
   * Generate simple hash from string (for API endpoint)
   * @param {string} hashString - The hash string to encrypt
   * @returns {string} SHA512 hash
   */
  generateSimpleHash(hashString) {
    return crypto.createHash('sha512').update(hashString).digest('hex');
  }

  /**
   * Generate the correct hash string format for PayU
   * @param {Object} params - Payment parameters
   * @returns {string} Formatted hash string with placeholder salt
   */
  generateHashString(params) {
    const {
      txnid,
      amount,
      productinfo,
      firstname,
      email = '',
      phone = '',
      udf1 = '',
      udf2 = '',
      udf3 = '',
      udf4 = '',
      udf5 = '',
      udf6 = '',
      udf7 = '',
      udf8 = '',
      udf9 = '',
      udf10 = ''
    } = params;

    // PayU hash formula: key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5|udf6|udf7|udf8|udf9|udf10|merchantSalt
    return `${this.key}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|${udf1}|${udf2}|${udf3}|${udf4}|${udf5}|${udf6}|${udf7}|${udf8}|${udf9}|${udf10}|merchantSalt`;
  }

  /**
   * Generate PayU hash
   * @param {Object} params - Payment parameters
   * @returns {string} SHA512 hash
   */
  generateHash(params) {
    const {
      txnid,
      amount,
      productinfo,
      firstname,
      email = '',
      phone = '',
      udf1 = '',
      udf2 = '',
      udf3 = '',
      udf4 = '',
      udf5 = '',
      udf6 = '',
      udf7 = '',
      udf8 = '',
      udf9 = '',
      udf10 = ''
    } = params;

    // PayU hash formula: key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5|udf6|udf7|udf8|udf9|udf10|salt
    const hashString = `${this.key}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|${udf1}|${udf2}|${udf3}|${udf4}|${udf5}|${udf6}|${udf7}|${udf8}|${udf9}|${udf10}|${this.salt}`;
    
    console.log('Hash string for PayU:', hashString);
    
    const hash = crypto.createHash('sha512').update(hashString).digest('hex');
    return hash;
  }

  /**
   * Verify PayU response hash
   * @param {Object} response - PayU response data
   * @returns {boolean} Hash verification result
   */
  verifyHash(response) {
    const {
      txnid,
      amount,
      net_amount_debit,
      productinfo,
      firstname,
      email = '',
      udf1 = '',
      udf2 = '',
      udf3 = '',
      udf4 = '',
      udf5 = '',
      udf6 = '',
      udf7 = '',
      udf8 = '',
      udf9 = '',
      udf10 = '',
      status,
      hash: receivedHash
    } = response;

    const additionalCharges = response.additionalCharges || response.additional_charges || '';

    // Schema definitions: which UDFs to include and typical empty placeholder counts
    const schemas = [
      { name: 'UDF10..1', udfs: [udf10, udf9, udf8, udf7, udf6, udf5, udf4, udf3, udf2, udf1], emptyCounts: [8, 9, 10, 11] },
      { name: 'UDF5..1',  udfs: [udf5, udf4, udf3, udf2, udf1],                          emptyCounts: [5, 6, 7, 8] }
    ];

    const nameOrders = [
      { name: 'firstname,email', order: (fn, em) => [fn, em] },
      { name: 'email,firstname', order: (fn, em) => [em, fn] }
    ];

    const amountChoices = [
      { name: 'amount', pick: (amt, net) => amt },
      { name: 'net_amount_debit', pick: (amt, net) => net || amt }
    ];

    let matched = false;
    let usedString = '';
    let calculatedHash = '';

    outer: for (const schema of schemas) {
      for (const ec of schema.emptyCounts) {
        for (const nameOrder of nameOrders) {
          for (const amtChoice of amountChoices) {
            const empties = new Array(ec).fill('');
            const [n1, n2] = nameOrder.order(firstname, email);
            const amtVal = amtChoice.pick(amount, net_amount_debit);

            const parts = [
              this.salt,
              status,
              ...empties,
              ...schema.udfs,
              n1, n2,
              productinfo,
              amtVal,
              txnid,
              this.key
            ];

            let str = parts.join('|');
            if (additionalCharges) str = `${additionalCharges}|${str}`;

            const calc = crypto.createHash('sha512').update(str).digest('hex');
            if (calc === receivedHash) {
              matched = true;
              usedString = str;
              calculatedHash = calc;
              console.log(`✅ Reverse-hash matched -> schema:${schema.name}, emptyCount:${ec}, nameOrder:${nameOrder.name}, amountField:${amtChoice.name}`);
              break outer;
            }

            // keep last for logging
            usedString = str;
            calculatedHash = calc;
          }
        }
      }
    }

    console.log('Verification hash string:', usedString);
    console.log('Calculated hash:', calculatedHash);
    console.log('Received hash:', receivedHash);

    // Copy-paste friendly format
    console.log('\n=== COPY-PASTE THESE THREE LINES ===');
    console.log('Verification hash string:', usedString);
    console.log('Calculated hash:', calculatedHash);
    console.log('Received hash:', receivedHash);
    console.log('=== END COPY-PASTE ===\n');

    return matched;
  }

  /**
   * Prepare payment data for PayU
   * @param {Object} bookingData - Booking information
   * @param {Object} userData - User information
   * @returns {Object} Payment form data
   */
  preparePaymentData(bookingData, userData) {
    try {
      const txnid = this.generateTransactionId(bookingData.bookingId);
      const amount = bookingData.amount.toString();
      const productinfo = `Border Tax Pass - ${bookingData.tax_mode} - ${bookingData.visiting_state.name}`;
      const firstname = userData.firstName;
      const email = userData.email || `${userData.phoneNumber}@wadisupport.com`; // PayU requires email
      const phone = userData.phoneNumber;
      
      // Store booking ID in UDF1 for reference
      const udf1 = bookingData._id.toString();
      const udf2 = bookingData.bookingId;
      const udf3 = bookingData.vehicle_number;

      const paymentParams = {
        txnid,
        amount,
        productinfo,
        firstname,
        email,
        phone,
        udf1,
        udf2,
        udf3
      };

      const hash = this.generateHash(paymentParams);

      const paymentData = {
        key: this.key,
        txnid,
        amount,
        productinfo,
        firstname,
        email,
        phone,
        udf1,
        udf2,
        udf3,
        udf4: '',
        udf5: '',
        udf6: '',
        udf7: '',
        udf8: '',
        udf9: '',
        udf10: '',
        hash,
        surl: this.successUrl,
        furl: this.failureUrl,
        service_provider: 'payu_paisa',
        curl: this.failureUrl, // Cancel URL
        pg: '' // Leave empty to show all payment options
      };

      return {
        success: true,
        paymentUrl: this.paymentUrl,
        paymentData
      };

    } catch (error) {
      console.error('Error preparing payment data:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get payment status from PayU response
   * @param {string} status - PayU status
   * @returns {string} Normalized status
   */
  getPaymentStatus(status) {
    const statusMap = {
      'success': 'paid',
      'failure': 'failed',
      'pending': 'pending',
      'cancel': 'cancelled',
      'tampered': 'failed',
      'bounced': 'failed',
      'userCancelled': 'cancelled'
    };

    return statusMap[status.toLowerCase()] || 'failed';
  }

  /**
   * Validate environment variables
   * @returns {Object} Validation result
   */
  validateConfig() {
    const errors = [];

    if (!this.key) {
      errors.push('PAYU_KEY is required');
    }

    if (!this.salt) {
      errors.push('PAYU_SALT is required');
    }

    if (!this.successUrl) {
      errors.push('PAYU_SUCCESS_URL is required');
    }

    if (!this.failureUrl) {
      errors.push('PAYU_FAILURE_URL is required');
    }

    // Log current configuration for debugging
    console.log('🔍 PayU Config Validation:');
    console.log('  Current Key:', this.key);
    console.log('  Current Salt:', this.salt);
    console.log('  Env PAYU_KEY:', process.env.PAYU_KEY);
    console.log('  Env PAYU_MERCHANT_KEY:', process.env.PAYU_MERCHANT_KEY);
    console.log('  Env PAYU_SALT:', process.env.PAYU_SALT);
    console.log('  Env PAYU_MERCHANT_SALT:', process.env.PAYU_MERCHANT_SALT);

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Log payment transaction for debugging
   * @param {string} type - Transaction type
   * @param {Object} data - Transaction data
   */
  logTransaction(type, data) {
    console.log(`🔄 PayU Transaction [${type}]:`, {
      timestamp: new Date().toISOString(),
      type,
      txnid: data.txnid,
      amount: data.amount,
      status: data.status || 'initiated',
      bookingId: data.udf1 || data.bookingId
    });
  }
}

module.exports = new PayUService(); 