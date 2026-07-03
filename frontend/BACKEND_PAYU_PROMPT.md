# Backend PayU Integration Prompt for Cursor

## Task: Implement PayU Payment Gateway Backend Integration

### Overview
Create backend API endpoints to support PayU payment gateway integration for a border tax booking system. The frontend sends booking data and expects secure hash generation and payment verification.

### Required API Endpoints

#### 1. Hash Generation Endpoint
**POST** `/api/v1/payment/generate-hash`

**Purpose**: Securely generate PayU payment hash on server side (never expose merchant salt on frontend)

**Request Body**:
```json
{
  "hashString": "merchantKey|txnId|amount|productInfo|firstName|email|||||||||||merchantSalt"
}
```

**Response**:
```json
{
  "success": true,
  "hash": "generated_sha512_hash",
  "message": "Hash generated successfully"
}
```

**Implementation Requirements**:
- Use SHA512 algorithm to hash the provided string
- Store merchant salt securely in environment variables
- Validate all required parameters
- Log hash generation attempts for security

#### 2. Payment Verification Endpoint
**POST** `/api/v1/payment/verify`

**Purpose**: Verify PayU payment response and create booking record

**Request Body**:
```json
{
  "txnId": "TXN_1234567890_123",
  "payuMoneyId": "PAYU_PAYMENT_ID",
  "status": "success",
  "amount": "500",
  "bookingData": {
    "vehicleNumber": "HR74A7552",
    "visitingStateName": "Himachal Pradesh",
    "visitingStateId": "state_id",
    "vehicleTypeId": "vehicle_type_id",
    "vehicleTypeName": "4 Seater",
    "whatsappNumber": "9991826197",
    "entryBorderId": "district_id",
    "entryBorderName": "Shimla",
    "planId": "plan_id",
    "planType": "Daily",
    "fromDate": "2024-01-15",
    "uptoDate": "2024-01-15"
  }
}
```

**Response** (Success):
```json
{
  "success": true,
  "data": {
    "bookingId": "BOOK_2024_001",
    "paymentId": "PAY_2024_001",
    "txnId": "TXN_1234567890_123",
    "amount": 500,
    "status": "confirmed",
    "validity": {
      "validFrom": "2024-01-15",
      "validUntil": "2024-01-15",
      "isExpired": false
    }
  },
  "message": "Payment verified and booking created successfully"
}
```

**Implementation Requirements**:
- Verify payment with PayU API
- Validate transaction status
- Create booking record in database
- Generate unique booking ID
- Calculate tax amount breakdown
- Send WhatsApp confirmation (if service available)
- Handle duplicate payment attempts
- Store payment details securely

#### 3. Payment Status Check Endpoint
**GET** `/api/v1/payment/status/:txnId`

**Purpose**: Check payment status for pending transactions

**Response**:
```json
{
  "success": true,
  "data": {
    "txnId": "TXN_1234567890_123",
    "status": "success|failure|pending",
    "paymentId": "PAY_2024_001",
    "amount": 500,
    "bookingId": "BOOK_2024_001"
  }
}
```

### Database Schema Updates

#### Add Payment Table
```sql
CREATE TABLE payments (
  id VARCHAR(255) PRIMARY KEY,
  txn_id VARCHAR(255) UNIQUE NOT NULL,
  payu_payment_id VARCHAR(255),
  amount DECIMAL(10,2) NOT NULL,
  status ENUM('pending', 'success', 'failure') DEFAULT 'pending',
  payment_method VARCHAR(100),
  bank_ref_number VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_txn_id (txn_id),
  INDEX idx_status (status)
);
```

#### Update Booking Table
```sql
ALTER TABLE bookings 
ADD COLUMN payment_id VARCHAR(255),
ADD COLUMN payment_status ENUM('pending', 'paid', 'failed') DEFAULT 'pending',
ADD FOREIGN KEY (payment_id) REFERENCES payments(id);
```

### Environment Variables Required
```env
PAYU_MERCHANT_KEY=your_merchant_key
PAYU_MERCHANT_SALT=your_merchant_salt
PAYU_ENVIRONMENT=production # or production
PAYU_VERIFY_URL=https://info.payu.in/merchant/postservice.php?form=2
```

### PayU Integration Functions

#### Hash Generation Function
```javascript
const crypto = require('crypto');

function generatePayUHash(params) {
  const { key, txnid, amount, productinfo, firstname, email, salt } = params;
  const hashString = `${key}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|||||||||||${salt}`;
  return crypto.createHash('sha512').update(hashString).digest('hex');
}
```

#### Payment Verification Function
```javascript
async function verifyPayUPayment(txnId) {
  const formData = new URLSearchParams({
    key: process.env.PAYU_MERCHANT_KEY,
    command: 'verify_payment',
    var1: txnId,
    hash: generateVerificationHash(txnId)
  });

  const response = await fetch(process.env.PAYU_VERIFY_URL, {
    method: 'POST',
    body: formData
  });

  return await response.json();
}
```

### Security Requirements
1. **Never expose merchant salt** in API responses
2. **Validate all payment amounts** against stored booking data
3. **Prevent duplicate bookings** for same transaction ID
4. **Log all payment attempts** for audit trail
5. **Sanitize input data** to prevent injection attacks
6. **Use HTTPS** for all payment endpoints
7. **Implement rate limiting** on payment endpoints

### Error Handling
- Invalid transaction ID
- Payment verification failure
- Database connection errors
- PayU API timeouts
- Duplicate payment attempts
- Amount mismatch validation

### Webhook Support (Optional)
**POST** `/api/v1/payment/webhook`
- Handle PayU webhooks for payment status updates
- Verify webhook authenticity
- Update payment status automatically

### Testing Requirements
1. **Unit tests** for hash generation
2. **Integration tests** for PayU API calls  
3. **Mock PayU responses** for testing
4. **Database transaction tests**
5. **Error scenario testing**

### Additional Features
1. **Payment retry mechanism** for failed payments
2. **Refund support** for cancelled bookings
3. **Payment analytics** and reporting
4. **WhatsApp integration** for payment confirmations
5. **Email receipts** for successful payments

### Implementation Checklist
- [ ] Create payment routes and controllers
- [ ] Implement hash generation with proper security
- [ ] Add PayU payment verification
- [ ] Create database tables and models
- [ ] Add payment validation logic
- [ ] Implement booking creation after payment
- [ ] Add comprehensive error handling
- [ ] Create payment status tracking
- [ ] Add logging and monitoring
- [ ] Write unit and integration tests
- [ ] Document API endpoints
- [ ] Configure environment variables
- [ ] Test with PayU production
- [ ] Implement webhook handling
- [ ] Add security middleware

### Success Criteria
- ✅ Secure hash generation without exposing salt
- ✅ Successful payment verification with PayU
- ✅ Automatic booking creation after payment
- ✅ Proper error handling for all scenarios
- ✅ Complete payment audit trail
- ✅ Integration with existing booking system
- ✅ Mobile app compatibility
- ✅ Production-ready security measures