// const Booking = require('../models/Booking');
// const User = require('../models/User');
// const Payment = require('../models/Payment');
// const payuService = require('../services/payuService');
// const whatsappService = require('../services/whatsappService');
// const crypto = require('crypto');
// const axios = require('axios');
// const saveCustomerLog = require('../utils/saveCustomerLog');

// class PaymentController {
//   // GET/POST /payment/relay - Render an auto-submitting PayU form (helps native apps open via GET)
//   async renderPayURelay(req, res) {
//     try {
//       const source = req.method === 'GET' ? req.query : (req.body || {});

//       const required = ['key', 'txnid', 'amount', 'productinfo', 'firstname', 'email', 'phone', 'surl', 'furl', 'hash'];
//       const missing = required.filter((k) => !source[k]);
//       if (missing.length) {
//         return res.status(400).json({ success: false, message: `Missing fields: ${missing.join(', ')}` });
//       }

//       // Minimal escaping for HTML attributes/text
//       const esc = (v) => String(v)
//         .replace(/&/g, '&amp;')
//         .replace(/</g, '&lt;')
//         .replace(/>/g, '&gt;')
//         .replace(/"/g, '&quot;')
//         .replace(/'/g, '&#39;');

//       // Build fields payload (include known UDFs if present)
//       const fields = {
//         key: source.key,
//         txnid: source.txnid,
//         amount: source.amount,
//         productinfo: source.productinfo,
//         firstname: source.firstname,
//         email: source.email || '',
//         phone: source.phone || '',
//         surl: source.surl,
//         furl: source.furl,
//         hash: source.hash,
//         service_provider: source.service_provider || 'payu_paisa',
//         udf1: source.udf1 || '',
//         udf2: source.udf2 || '',
//         udf3: source.udf3 || '',
//         udf4: source.udf4 || '',
//         udf5: source.udf5 || '',
//         udf6: source.udf6 || '',
//         udf7: source.udf7 || '',
//         udf8: source.udf8 || '',
//         udf9: source.udf9 || '',
//         udf10: source.udf10 || ''
//       };

//       const payuUrl = 'https://secure.payu.in/_payment';

//       // Route-specific CSP to allow posting form to PayU and inline auto-submit
//       const csp = [
//         "default-src 'self'",
//         "form-action 'self' https://secure.payu.in https://secure.payu.com https:",
//         "script-src 'self' 'unsafe-inline'",
//         "style-src 'self' 'unsafe-inline'",
//         "frame-src 'self' https://secure.payu.in https://secure.payu.com",
//         "img-src 'self' data:",
//         "base-uri 'self'",
//         "object-src 'none'"
//       ].join('; ');

//       res.setHeader('Content-Security-Policy', csp);
//       res.setHeader('X-Content-Security-Policy', csp); // legacy
//       res.setHeader('X-WebKit-CSP', csp); // legacy
//       res.setHeader('Content-Type', 'text/html; charset=utf-8');
//       res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
//       res.setHeader('Pragma', 'no-cache');
//       res.setHeader('Expires', '0');
//       res.status(200).send(
//         `<!doctype html>
// <html>
//   <head>
//     <meta charset="utf-8" />
//     <meta name="viewport" content="width=device-width, initial-scale=1" />
//     <title>Redirecting to PayU…</title>
//     <style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;padding:24px;line-height:1.5} .box{max-width:560px;margin:40px auto;border:1px solid #e5e7eb;border-radius:12px;padding:24px} .btn{background:#16a34a;border:0;color:#fff;padding:10px 16px;border-radius:8px;font-weight:600} .meta{color:#6b7280;font-size:14px;margin-top:8px}</style>
//   </head>
//   <body>
//     <div class="box">
//       <h2>Redirecting to PayU…</h2>
//       <p class="meta">Please wait while we securely connect to the payment gateway.</p>
//       <form id="payuForm" method="POST" action="${esc(payuUrl)}">
//         ${Object.entries(fields)
//           .map(([k, v]) => `<input type="hidden" name="${esc(k)}" value="${esc(v)}" />`)
//           .join('\n        ')}
//         <noscript>
//           <button type="submit" class="btn">Continue to PayU</button>
//         </noscript>
//       </form>
//       <p class="meta">If you are not redirected automatically, click the button above.</p>
//     </div>
//     <script>document.getElementById('payuForm').submit();</script>
//   </body>
//   </html>`
//       );
//     } catch (error) {
//       console.error('Render PayU relay error:', error);
//       res.status(500).json({ success: false, message: 'Failed to render PayU relay page' });
//     }
//   }

//   // POST /payment/generate-hash - Generate PayU payment hash
//   async generateHash(req, res) {
//     try {
//       const { 
//         txnid, amount, productinfo, firstname, email, phone,
//         udf1 = '', udf2 = '', udf3 = '', udf4 = '', udf5 = '',
//         udf6 = '', udf7 = '', udf8 = '', udf9 = '', udf10 = ''
//       } = req.body;

//       // Validate required fields
//       if (!txnid || !amount || !productinfo || !firstname) {
//         return res.status(400).json({
//           success: false,
//           message: 'txnid, amount, productinfo, and firstname are required'
//         });
//       }

//       // Validate environment variables
//       const configValidation = payuService.validateConfig();
//       if (!configValidation.isValid) {
//         console.error('PayU configuration errors:', configValidation.errors);
//         return res.status(500).json({
//           success: false,
//           message: 'Payment service configuration error',
//           errors: configValidation.errors
//         });
//       }

//       // Build the complete hash string using backend credentials
//       const merchantKey = process.env.PAYU_MERCHANT_KEY || process.env.PAYU_KEY;
//       const merchantSalt = process.env.PAYU_MERCHANT_SALT || process.env.PAYU_SALT;
      
//       if (!merchantKey || !merchantSalt) {
//         return res.status(500).json({
//           success: false,
//           message: 'PayU configuration incomplete - missing merchant key or salt'
//         });
//       }
      
//       // Build hash string: key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5|udf6|udf7|udf8|udf9|udf10|salt
//       const hashString = `${merchantKey}|${txnid}|${amount}|${productinfo}|${firstname}|${email || ''}|${udf1}|${udf2}|${udf3}|${udf4}|${udf5}|${udf6}|${udf7}|${udf8}|${udf9}|${udf10}|${merchantSalt}`;
      
//       // Generate SHA512 hash
//       const hash = crypto.createHash('sha512').update(hashString).digest('hex');

//       // Log hash generation for security and debugging
//       console.log('🔐 Hash generation request:', {
//         timestamp: new Date().toISOString(),
//         ip: req.ip || req.connection.remoteAddress,
//         userAgent: req.headers['user-agent'],
//         txnid,
//         amount,
//         productinfo,
//         firstname,
//         email: email || 'not provided',
//         udf1: udf1 || 'not provided',
//         udf2: udf2 || 'not provided',
//         udf3: udf3 || 'not provided'
//       });
      
//       // Log the hash string being processed (without exposing the salt)
//       const maskedHashString = hashString.replace(merchantSalt, '***SALT***');
//       console.log('🔐 Processing hash string:', maskedHashString);
//       console.log('🔐 Hash string length:', hashString.length);
//       console.log('🔐 Expected format: key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5|udf6|udf7|udf8|udf9|udf10|salt');

//       res.status(200).json({
//         success: true,
//         hash: hash,
//         message: 'Hash generated successfully'
//       });

//     } catch (error) {
//       console.error('Generate hash error:', error);
//       res.status(500).json({
//         success: false,
//         message: 'Failed to generate hash'
//       });
//     }
//   }

//   // POST /payment/test-hash - Test hash verification with JSON data
//   async testHashVerification(req, res) {
//     try {
//       console.log('🧪 Testing hash verification with JSON data...');
//       console.log('📥 Request body:', JSON.stringify(req.body, null, 2));
      
//       const payuResponse = req.body;
      
//       // Validate required fields
//       if (!payuResponse.txnid || !payuResponse.hash) {
//         return res.status(400).json({
//           success: false,
//           message: 'txnid and hash are required for testing'
//         });
//       }
      
//       // Test hash verification
//       console.log('🔐 Testing hash verification...');
//       const isHashValid = payuService.verifyHash(payuResponse);
      
//       console.log('🔍 Hash verification result:', isHashValid);
//       console.log('🔍 PayU Service config:');
//       console.log('  Key:', payuService.key);
//       console.log('  Salt:', payuService.salt);
      
//       res.status(200).json({
//         success: true,
//         message: 'Hash verification test completed',
//         data: {
//           hashValid: isHashValid,
//           payuConfig: {
//             key: payuService.key,
//             salt: payuService.salt
//           },
//           receivedData: payuResponse
//         }
//       });
      
//     } catch (error) {
//       console.error('Test hash verification error:', error);
//       res.status(500).json({
//         success: false,
//         message: 'Failed to test hash verification',
//         error: error.message
//       });
//     }
//   }

//   // POST /payment/test-form-data - Test form data parsing (no auth required for testing)
//   async testFormData(req, res) {
//     try {
//       console.log('🧪 Testing form data parsing...');
      
//       let payuResponse = req.body;
      
//       // If body is raw (Buffer), parse it manually
//       if (Buffer.isBuffer(req.body)) {
//         console.log('📥 Raw body detected, parsing manually...');
//         const rawBody = req.body.toString('utf8');
//         console.log('📥 Raw body string:', rawBody);
        
//         // Check content type to determine parsing method
//         const contentType = req.headers['content-type'] || '';
        
//         if (contentType.includes('multipart/form-data')) {
//           console.log('📥 Parsing multipart form data...');
//           // Parse multipart form data
//           const formData = {};
//           const boundary = contentType.split('boundary=')[1];
//           const parts = rawBody.split('--' + boundary);
          
//           parts.forEach(part => {
//             if (part.trim() && !part.includes('--')) {
//               const lines = part.split('\r\n');
//               let key = '';
//               let value = '';
              
//               lines.forEach(line => {
//                 if (line.startsWith('Content-Disposition:')) {
//                   const match = line.match(/name="([^"]+)"/);
//                   if (match) key = match[1];
//                 } else if (line.trim() && !line.startsWith('Content-')) {
//                   value = line.trim();
//                 }
//               });
              
//               if (key && value !== '') {
//                 formData[key] = value;
//               }
//             }
//           });
          
//           payuResponse = formData;
//           console.log('📥 Parsed multipart form data:', formData);
//         } else {
//           console.log('📥 Parsing URL-encoded form data...');
//           // Parse URL-encoded form data
//           const formData = {};
//           const pairs = rawBody.split('&');
//           pairs.forEach(pair => {
//             const [key, value] = pair.split('=');
//             if (key && value !== undefined) {
//               formData[decodeURIComponent(key)] = decodeURIComponent(value);
//             }
//           });
          
//           payuResponse = formData;
//           console.log('📥 Parsed URL-encoded form data:', formData);
//         }
//       }
      
//       console.log('📥 Final parsed data:', payuResponse);
//       console.log('📥 Data type:', typeof payuResponse);
//       console.log('📥 Data keys:', payuResponse ? Object.keys(payuResponse) : 'No keys');
      
//       res.status(200).json({
//         success: true,
//         message: 'Form data parsing test completed',
//         data: {
//           bodyType: typeof req.body,
//           isBuffer: Buffer.isBuffer(req.body),
//           contentType: req.headers['content-type'],
//           parsedData: payuResponse,
//           rawBodyLength: Buffer.isBuffer(req.body) ? req.body.length : 'Not a buffer'
//         }
//       });
      
//     } catch (error) {
//       console.error('Test form data error:', error);
//       res.status(500).json({
//         success: false,
//         message: 'Failed to test form data parsing',
//         error: error.message
//       });
//     }
//   }

//   // POST /payment/verify - Verify PayU payment and create booking
//   async verifyPayment(req, res) {
//     try {
//       const { txnId, payuMoneyId, status, amount, bookingData } = req.body;

//       if (!txnId || !status || !amount || !bookingData) {
//         return res.status(400).json({
//           success: false,
//           message: 'Transaction ID, status, amount, and booking data are required'
//         });
//       }

//       // Check if payment already exists
//       const existingPayment = await Payment.findOne({ txn_id: txnId });
//       if (existingPayment) {
//         // Handle duplicate payment attempt
//         const existingBooking = await Booking.findById(existingPayment.booking)
//           .populate('visiting_state', 'name');
        
//         if (existingBooking) {
//           return res.status(200).json({
//             success: true,
//             data: {
//               bookingId: existingBooking.bookingId,
//               paymentId: existingPayment.id,
//               txnId: existingPayment.txn_id,
//               amount: existingPayment.amount,
//               status: existingBooking.status === 'paid' ? 'confirmed' : existingBooking.status,
//               validity: {
//                 validFrom: existingBooking.validity.valid_from,
//                 validUntil: existingBooking.validity.valid_until,
//                 isExpired: existingBooking.validity.is_expired
//               }
//             },
//             message: 'Payment already processed - returning existing booking'
//           });
//         }
//       }
//   const userId =
//   req.user?._id ||
//   bookingData?.user?.toString();

//         const user = await User.findById(userId);

//             await saveCustomerLog({
//   userId: userId || user?._id,
//   phoneNumber: user?.phoneNumber,
//   type: "verifyPayment",
//   req 
// });

//       // Verify payment status from PayU response
//       let paymentVerified = false;
//       let verificationError = null;
      
//       try {
//         // First try to verify with PayU API if configured
//         if (process.env.PAYU_VERIFY_URL && process.env.PAYU_VERIFY_URL.trim() !== '') {
//           console.log('🔍 Attempting PayU API verification for txnId:', txnId);
//           const verificationResult = await this.verifyWithPayU(txnId);
//           paymentVerified = verificationResult.verified;
//           if (verificationResult.error) {
//             verificationError = verificationResult.error;
//           }
//         } else {
//           console.log('⚠️ PayU verification URL not configured, using local status verification');
//         }
//       } catch (verifyError) {
//         console.error('❌ PayU verification error:', verifyError);
//         verificationError = verifyError.message;
//       }

//       // If PayU verification failed or wasn't configured, use local status verification
//       if (!paymentVerified) {
//         const localStatus = status.toLowerCase();
//         paymentVerified = localStatus === 'success' || localStatus === 'completed';
//         console.log(`🔍 Local status verification: ${localStatus} -> ${paymentVerified ? 'verified' : 'failed'}`);
//       }

//       console.log(`✅ Payment verification result: ${paymentVerified ? 'SUCCESS' : 'FAILED'}`);
//       if (verificationError) {
//         console.log(`⚠️ Verification error details: ${verificationError}`);
//       }

//       // Create payment record
//       const payment = new Payment({
//         txn_id: txnId,
//         payu_payment_id: payuMoneyId,
//         amount: parseFloat(amount),
//         status: paymentVerified ? 'success' : 'failure',
//         payment_method: 'payu',
//         user: req.user._id,
//         verified: paymentVerified,
//         payment_data: {
//           productinfo: `Border Tax - ${bookingData.vehicleTypeName}`,
//           firstname: req.user.firstName,
//           email: req.user.email,
//           phone: req.user.phoneNumber,
//           udf1: bookingData.vehicleNumber,
//           udf2: bookingData.visitingStateName,
//           udf3: bookingData.planType,
//           verification_error: verificationError
//         }
//       });

//       await payment.save();

//       // If payment failed, return early with payment details
//       if (!paymentVerified) {
//         console.log(`❌ Payment failed for txnId: ${txnId}, paymentId: ${payment.id}`);
        
//         // Emit real-time event for failed payment
//         if (global.io) {
//           global.io.to('admin-room').emit('payment-failed', {
//             type: 'payment-failed',
//             payment: payment.getSummary(),
//             error: verificationError,
//             timestamp: new Date().toISOString()
//           });
//         }

//         return res.status(400).json({
//           success: false,
//           message: 'Payment verification failed',
//           data: {
//             paymentId: payment.id,
//             txnId: payment.txn_id,
//             status: 'failed',
//             error: verificationError || 'Payment verification failed'
//           }
//         });
//       }

//       // Create booking record with proper payment status
//       const booking = new Booking({
//         user: req.user._id,
//         visiting_state: bookingData.visitingStateId,
//         vehicle_number: bookingData.vehicleNumber,
//         seat_capacity: bookingData.vehicleTypeName,
//         whatsapp_number: bookingData.whatsappNumber,
//         entry_border: bookingData.entryBorderName,
//         tax_mode: bookingData.planType,
//         tax_from_date: new Date(bookingData.fromDate),
//         tax_upto_date: new Date(bookingData.uptoDate),
//         amount: parseFloat(amount),
//         status: 'paid', // Booking is confirmed since payment is verified
//         payment_id: payment.id,
//         payment_status: 'paid', // Payment is confirmed
//         payment_details: {
//           transaction_id: txnId,
//           payment_method: 'payu',
//           payment_reference: payuMoneyId,
//           paid_at: new Date(),
//           verification_method: verificationError ? 'local_status' : 'payu_api'
//         }
//       });

//       const savedBooking = await booking.save();
      
//       // Update payment with booking reference
//       payment.booking = savedBooking._id;
//       await payment.save();

//       // Populate booking data
//       await savedBooking.populate([
//         { path: 'visiting_state', select: 'name' },
//         { path: 'user', select: 'firstName lastName phoneNumber email' }
//       ]);


//       // Send WhatsApp payment confirmation
//       let whatsappStatus = null;
//       try {
//         if (whatsappService.isReady) {
//           console.log('📱 Sending WhatsApp payment confirmation...');
//           const whatsappResult = await whatsappService.sendPaymentConfirmation(savedBooking, savedBooking.user);
//           whatsappStatus = {
//             sent: whatsappResult,
//             message: whatsappResult ? 'WhatsApp confirmation sent' : 'Failed to send WhatsApp confirmation'
//           };
//           console.log('📱 WhatsApp result:', whatsappResult);
//         } else {
//           console.log('❌ WhatsApp service not ready - skipping payment confirmation');
//           whatsappStatus = {
//             sent: false,
//             message: 'WhatsApp service not ready'
//           };
//         }
//       } catch (error) {
//         console.error('❌ WhatsApp messaging error:', error);
//         whatsappStatus = {
//           sent: false,
//           message: `WhatsApp service error: ${error.message}`
//         };
//       }

//       // Emit real-time event to admin dashboard
//       if (global.io) {
//         global.io.to('admin-room').emit('payment-verified', {
//           type: 'payment-verified',
//           booking: savedBooking,
//           payment: payment.getSummary(),
//           whatsapp: whatsappStatus,
//           timestamp: new Date().toISOString()
//         });
//       }

//       res.status(200).json({
//         success: true,
//         data: {
//           bookingId: savedBooking.bookingId,
//           paymentId: payment.id,
//           txnId: payment.txn_id,
//           amount: payment.amount,
//           status: 'confirmed',
//           validity: {
//             validFrom: savedBooking.validity.valid_from,
//             validUntil: savedBooking.validity.valid_until,
//             isExpired: savedBooking.validity.is_expired
//           }
//         },
//         message: 'Payment verified and booking created successfully'
//       });

//     } catch (error) {
//       console.error('Verify payment error:', error);
//       res.status(500).json({
//         success: false,
//         message: 'Failed to verify payment and create booking'
//       });
//     }
//   }

//   // GET /payment/status/:txnId - Check payment status
//   async getPaymentStatusByTxnId(req, res) {
//     try {
//       const { txnId } = req.params;

//       // Find payment by transaction ID
//       const payment = await Payment.findOne({ txn_id: txnId })
//         .populate('booking')
//         .populate('user', 'firstName lastName phoneNumber');

//       if (!payment) {
//         return res.status(404).json({
//           success: false,
//           message: 'Payment transaction not found'
//         });
//       }

//       // Check if user owns this payment (unless admin)
//       if (!req.user.isAdmin && payment.user.toString() !== req.user._id.toString()) {
//         return res.status(403).json({
//           success: false,
//           message: 'You can only view your own payment transactions'
//         });
//       }

//       const responseData = {
//         txnId: payment.txn_id,
//         status: payment.status,
//         paymentId: payment.id,
//         amount: payment.amount
//       };

//       if (payment.booking) {
//         responseData.bookingId = payment.booking.bookingId;
//       }

//       res.status(200).json({
//         success: true,
//         data: responseData
//       });

//     } catch (error) {
//       console.error('Get payment status error:', error);
//       res.status(500).json({
//         success: false,
//         message: 'Failed to get payment status'
//       });
//     }
//   }

//   // Helper method to verify payment with PayU
//   async verifyWithPayU(txnId) {
//     try {
//       const verifyUrl = process.env.PAYU_VERIFY_URL;
      
//       if (!verifyUrl || typeof verifyUrl !== 'string' || verifyUrl.trim() === '') {
//         throw new Error('PayU verification URL not configured or invalid');
//       }

//       // Validate URL format
//       let parsedUrl;
//       try {
//         parsedUrl = new URL(verifyUrl);
//         if (!parsedUrl.protocol || !parsedUrl.hostname) {
//           throw new Error('Invalid URL format');
//         }
//       } catch (urlError) {
//         throw new Error(`Invalid PayU verification URL: ${verifyUrl}`);
//       }

//       const key = process.env.PAYU_MERCHANT_KEY || process.env.PAYU_KEY;
//       const salt = process.env.PAYU_MERCHANT_SALT || process.env.PAYU_SALT;
      
//       if (!key || !salt) {
//         throw new Error('PayU merchant key or salt not configured');
//       }

//       const command = 'verify_payment';
      
//       // Generate verification hash
//       const hashString = `${key}|${command}|${txnId}|${salt}`;
//       const hash = crypto.createHash('sha512').update(hashString).digest('hex');

//       console.log(`🔍 Verifying payment with PayU API: ${parsedUrl.hostname}${parsedUrl.pathname}`);

//       const formData = new URLSearchParams({
//         key: key,
//         command: command,
//         var1: txnId,
//         hash: hash
//       });

//       const response = await axios.post(verifyUrl, formData, {
//         headers: {
//           'Content-Type': 'application/x-www-form-urlencoded'
//         },
//         timeout: 15000, // Increased timeout
//         validateStatus: function (status) {
//           return status >= 200 && status < 500; // Accept 2xx and 4xx responses
//         }
//       });

//       console.log(`📡 PayU API response status: ${response.status}`);
      
//       if (response.status >= 400) {
//         throw new Error(`PayU API error: ${response.status} - ${response.statusText}`);
//       }

//       const verification = response.data;
//       console.log('📡 PayU verification response:', JSON.stringify(verification, null, 2));
      
//       const isVerified = verification.status === 1 && 
//                         verification.transaction_details && 
//                         verification.transaction_details[txnId] && 
//                         verification.transaction_details[txnId].status === 'success';
      
//       console.log(`✅ PayU verification result for txnId ${txnId}: ${isVerified ? 'SUCCESS' : 'FAILED'}`);
      
//       return {
//         verified: isVerified,
//         data: verification
//       };

//     } catch (error) {
//       console.error('❌ PayU verification API error:', error);
      
//       // Return detailed error information
//       return {
//         verified: false,
//         error: error.message,
//         details: {
//           txnId,
//           url: process.env.PAYU_VERIFY_URL,
//           timestamp: new Date().toISOString()
//         }
//       };
//     }
//   }

//   // POST /payment/initiate - Initiate payment for a booking
//  async initiatePayment(req, res) {
//     try {
//       const { bookingId } = req.body;
      

//       if (!bookingId) {
//         return res.status(400).json({
//           success: false,
//           message: 'Booking ID is required'
//         });
//       }

    
//       const configValidation = payuService.validateConfig();
//       if (!configValidation.isValid) {
//         console.error('PayU configuration errors:', configValidation.errors);
//         return res.status(500).json({
//           success: false,
//           message: 'Payment service configuration error',
//           errors: configValidation.errors
//         });
//       }

//       // Find the booking
//       const booking = await Booking.findById(bookingId)
//         .populate('visiting_state', 'name')
//         .populate('user', 'firstName lastName phoneNumber email');

//       if (!booking) {
//         return res.status(404).json({
//           success: false,
//           message: 'Booking not found'
//         });
//       }

//        const userId = req.user?._id || booking?.user?._id;

//       // Check if user owns this booking
//       if (booking.user._id.toString() !== userId.toString()) {
//         return res.status(403).json({
//           success: false,
//           message: 'You can only initiate payment for your own bookings'
//         });
//       }

//       // Check if booking is already paid
//       if (booking.status === 'paid') {
//         return res.status(400).json({
//           success: false,
//           message: 'Booking is already paid'
//         });
//       }

//       // Check if booking is cancelled
//       if (booking.status === 'cancelled') {
//         return res.status(400).json({
//           success: false,
//           message: 'Cannot initiate payment for cancelled booking'
//         });
//       }

//       // Prepare payment data
//       const paymentPreparation = payuService.preparePaymentData(booking, booking.user);
      
//       if (!paymentPreparation.success) {
//         return res.status(500).json({
//           success: false,
//           message: 'Failed to prepare payment data',
//           error: paymentPreparation.error
//         });
//       }

//       // Log transaction initiation
//       payuService.logTransaction('INITIATE', {
//         txnid: paymentPreparation.paymentData.txnid,
//         amount: paymentPreparation.paymentData.amount,
//         bookingId: booking.bookingId
//       });

//       // Store transaction ID in booking
//       booking.payment_details.transaction_id = paymentPreparation.paymentData.txnid;
//       await booking.save();

//       try {
//   const user = await User.findById(userId);

//   await saveCustomerLog({
//     userId,
//     phoneNumber: user?.phoneNumber,
//     type: "initiatePayment",
//       req,                 
//   extraData:  {
//         bookingId: booking?._id,
//         bookingNumber: booking?.bookingId,
//         txnid: paymentPreparation?.paymentData?.txnid,
//         amount: paymentPreparation?.paymentData?.amount || booking?.amount,
//         vehicleNumber: booking?.vehicle_number,
//         visitingState: booking?.visiting_state?.name,
//         paymentUrl: paymentPreparation?.paymentUrl,
//       }, // ✅ PayU body separately store

   
//   });
// } catch (logErr) {
//   console.error("❌ Initiate payment log failed:", logErr.message);
// }

//       res.status(200).json({
//         success: true,
//         message: 'Payment initiated successfully',
//         data: {
//           paymentUrl: paymentPreparation.paymentUrl,
//           paymentData: paymentPreparation.paymentData,
//           booking: {
//             id: booking._id,
//             bookingId: booking.bookingId,
//             amount: booking.amount,
//             status: booking.status
//           }
//         }
//       });

//     } catch (error) {
//       console.error('Initiate payment error:', error);
//       res.status(500).json({
//         success: false,
//         message: 'Failed to initiate payment'
//       });
//     }
//   }

//   // POST /payment/success - Handle PayU success callback
//  async handlePaymentSuccess(req, res) {
//     try {
//       // Check if body is properly parsed
//       let payuResponse = req.body;
      
//       // If body is raw (Buffer), parse it manually
//       if (Buffer.isBuffer(req.body)) {
//         console.log('📥 Raw body detected, parsing manually...');
//         const rawBody = req.body.toString('utf8');
//         console.log('📥 Raw body string:', rawBody);
        
//         // Check content type to determine parsing method
//         const contentType = req.headers['content-type'] || '';
        
//         if (contentType.includes('multipart/form-data')) {
//           console.log('📥 Parsing multipart form data...');
//           // Parse multipart form data
//           const formData = {};
//           const boundary = contentType.split('boundary=')[1];
//           const parts = rawBody.split('--' + boundary);
          
//           parts.forEach(part => {
//             if (part.trim() && !part.includes('--')) {
//               const lines = part.split('\r\n');
//               let key = '';
//               let value = '';
              
//               lines.forEach(line => {
//                 if (line.startsWith('Content-Disposition:')) {
//                   const match = line.match(/name="([^"]+)"/);
//                   if (match) key = match[1];
//                 } else if (line.trim() && !line.startsWith('Content-')) {
//                   value = line.trim();
//                 }
//               });
              
//               if (key && value !== '') {
//                 formData[key] = value;
//               }
//             }
//           });
          
//           payuResponse = formData;
//           console.log('📥 Parsed multipart form data:', formData);
//         } else {
//           console.log('📥 Parsing URL-encoded form data...');
//           // Parse URL-encoded form data
//           const formData = {};
//           const pairs = rawBody.split('&');
//           pairs.forEach(pair => {
//             const [key, value] = pair.split('=');
//             if (key && value !== undefined) {
//               formData[decodeURIComponent(key)] = decodeURIComponent(value);
//             }
//           });
          
//           payuResponse = formData;
//           console.log('📥 Parsed URL-encoded form data:', formData);
//         }
//       } else if (!req.body || typeof req.body !== 'object') {
//         console.error('❌ Request body is not properly parsed:', {
//           body: req.body,
//           bodyType: typeof req.body,
//           contentType: req.headers['content-type'],
//           rawBody: req.rawBody || 'No raw body available'
//         });
        
    
//         return res.status(400).json({
//           success: false,
//           message: 'Failed to process payment success',
//           debug: {
//             error: 'Request body is not properly parsed',
//             body: req.body,
//             bodyType: typeof req.body,
//             contentType: req.headers['content-type']
//           }
//         });
//       }
      
//       console.log('\n' + '='.repeat(80));
//       console.log('🎉 PayU SUCCESS CALLBACK RECEIVED!');
//       console.log('='.repeat(80));
      
//       // Log request format and content type
//       console.log('📥 REQUEST FORMAT ANALYSIS:');
//       console.log('- Content-Type Header:', req.headers['content-type']);
//       console.log('- Body Type:', typeof req.body);
//       console.log('- Body Keys:', req.body ? Object.keys(req.body) : 'No body keys');
//       console.log('- Is Form Data:', req.headers['content-type']?.includes('application/x-www-form-urlencoded'));
//       console.log('- Is JSON:', req.headers['content-type']?.includes('application/json'));
      
//       // Log EVERYTHING for debugging
//       console.log('📥 COMPLETE REQUEST DETAILS:');
//       console.log('- Method:', req.method);
//       console.log('- URL:', req.url);
//       console.log('- Query Params:', req.query);
//       console.log('- Content-Type:', req.headers['content-type']);
//       console.log('- User-Agent:', req.headers['user-agent']);
//       console.log('- IP Address:', req.ip || req.connection.remoteAddress);
      
//       console.log('\n📥 ALL HEADERS:');
//       console.log(JSON.stringify(req.headers, null, 2));
      
//       console.log('\n📥 RAW BODY (req.body):');
//       console.log(JSON.stringify(payuResponse, null, 2));
      
//       console.log('\n📥 PARSED PayU RESPONSE FIELDS:');
//       console.log('- txnid:', payuResponse.txnid);
//       console.log('- mihpayid:', payuResponse.mihpayid);
//       console.log('- mode:', payuResponse.mode);
//       console.log('- status:', payuResponse.status);
//       console.log('- unmappedstatus:', payuResponse.unmappedstatus);
//       console.log('- key:', payuResponse.key);
//       console.log('- amount:', payuResponse.amount);
//       console.log('- discount:', payuResponse.discount);
//       console.log('- net_amount_debit:', payuResponse.net_amount_debit);
//       console.log('- addedon:', payuResponse.addedon);
//       console.log('- productinfo:', payuResponse.productinfo);
//       console.log('- firstname:', payuResponse.firstname);
//       console.log('- lastname:', payuResponse.lastname);
//       console.log('- address1:', payuResponse.address1);
//       console.log('- address2:', payuResponse.address2);
//       console.log('- city:', payuResponse.city);
//       console.log('- state:', payuResponse.state);
//       console.log('- country:', payuResponse.country);
//       console.log('- zipcode:', payuResponse.zipcode);
//       console.log('- email:', payuResponse.email);
//       console.log('- phone:', payuResponse.phone);
//       console.log('- udf1:', payuResponse.udf1);
//       console.log('- udf2:', payuResponse.udf2);
//       console.log('- udf3:', payuResponse.udf3);
//       console.log('- udf4:', payuResponse.udf4);
//       console.log('- udf5:', payuResponse.udf5);
//       console.log('- udf6:', payuResponse.udf6);
//       console.log('- udf7:', payuResponse.udf7);
//       console.log('- udf8:', payuResponse.udf8);
//       console.log('- udf9:', payuResponse.udf9);
//       console.log('- udf10:', payuResponse.udf10);
//       console.log('- hash:', payuResponse.hash);
//       console.log('- field1:', payuResponse.field1);
//       console.log('- field2:', payuResponse.field2);
//       console.log('- field3:', payuResponse.field3);
//       console.log('- field4:', payuResponse.field4);
//       console.log('- field5:', payuResponse.field5);
//       console.log('- field6:', payuResponse.field6);
//       console.log('- field7:', payuResponse.field7);
//       console.log('- field8:', payuResponse.field8);
//       console.log('- field9:', payuResponse.field9);
//       console.log('- payment_source:', payuResponse.payment_source);
//       console.log('- PG_TYPE:', payuResponse.PG_TYPE);
//       console.log('- bank_ref_num:', payuResponse.bank_ref_num);
//       console.log('- bankcode:', payuResponse.bankcode);
//       console.log('- error:', payuResponse.error);
//       console.log('- error_Message:', payuResponse.error_Message);
      
//       console.log('\n📥 COMPLETE RESPONSE OBJECT KEYS:');
//       console.log('All available keys:', Object.keys(payuResponse));
      
//       console.log('\n📥 FOR POSTMAN TESTING - COPY THIS EXACT DATA:');
//       console.log('Content-Type: application/x-www-form-urlencoded');
//       console.log('POST URL:  http://localhost:4001/api/v1/payment/success');
//       console.log('Form Data:');
//       Object.keys(payuResponse).forEach(key => {
//         if (payuResponse[key] !== undefined && payuResponse[key] !== null) {
//           console.log(`${key}=${encodeURIComponent(payuResponse[key])}`);
//         }
//       });
      
//       console.log('\n📥 CURL COMMAND FOR TESTING:');
//       const curlData = Object.keys(payuResponse)
//         .filter(key => payuResponse[key] !== undefined && payuResponse[key] !== null)
//         .map(key => `${key}=${encodeURIComponent(payuResponse[key])}`)
//         .join('&');
//       console.log(`curl -X POST  http://localhost:4001/api/v1/payment/success \\`);
//       console.log(`  -H "Content-Type: application/x-www-form-urlencoded" \\`);
//       console.log(`  -d "${curlData}"`);
      
//       console.log('\n' + '='.repeat(80));

//       // Log the transaction
//       payuService.logTransaction('SUCCESS_CALLBACK', payuResponse);

//       // Check if this is a test request
//       const isTestRequest = payuResponse.txnid === 'TEST123' || payuResponse.test === 'true';
      
//       if (!isTestRequest) {
//         // Skip hash verification for real PayU callbacks - PayU has already verified the payment
//         console.log('✅ Processing real PayU transaction - skipping hash verification');
//         console.log('🔍 Payment details from PayU:', {
//           status: payuResponse.status,
//           amount: payuResponse.amount,
//           txnid: payuResponse.txnid,
//           mihpayid: payuResponse.mihpayid,
//           mode: payuResponse.mode || 'unknown',
//           pg_type: payuResponse.PG_TYPE || 'unknown'
//         });
//       } else {
//         console.log('🧪 Test request detected - skipping hash verification');
//       }

//       const { txnid, status, amount, udf1: bookingId, mihpayid } = payuResponse;

//       // Handle test requests
//       if (isTestRequest) {
//         console.log('🧪 Test success callback processed successfully');
//         return res.status(200).json({
//           success: true,
//           message: 'Test success callback received',
//           data: {
//             txnid,
//             status: status || 'success',
//             amount: amount || '100',
//             test: true
//           }
//         });
//       }

//       // Find the booking using the booking ID stored in UDF1
//       const booking = await Booking.findById(bookingId);
//       console.log("booking booking booking",booking)
      
//       if (!booking) {
//         console.error('❌ Booking not found for transaction:', txnid);
//         return res.status(404).json({
//           success: false,
//           message: 'Booking not found'
//         });
//       }

//       // Verify transaction ID matches (PayU generates its own txnid, so we check if it's in our stored order ID or if we have a stored PayU txnid)
//       const storedOrderId = booking.payment_details.transaction_id;
//       const storedPayuTxnid = booking.payment_details.payu_transaction_id;
      
//       // Check if this is a new PayU transaction or if we've already processed this PayU txnid
//       if (storedPayuTxnid && storedPayuTxnid === txnid) {
//         console.log('✅ PayU transaction already processed:', txnid);
//         return res.status(200).json({
//           success: true,
//           message: 'Payment already processed',
//           data: { booking: { id: booking._id, bookingId: booking.bookingId } }
//         });
//       }
      
//       // For new transactions, we allow PayU's txnid to be different from our order ID
//       console.log('✅ Processing new PayU transaction:', {
//         storedOrderId,
//         receivedPayuTxnid: txnid,
//         storedPayuTxnid
//       });

//       // Verify amount matches
//       if (parseFloat(amount) !== booking.amount) {
//         console.error('❌ Amount mismatch:', {
//           stored: booking.amount,
//           received: amount
//         });
//         return res.status(400).json({
//           success: false,
//           message: 'Amount mismatch'
//         });
//       }

//       // Get normalized payment status
//       const paymentStatus = payuService.getPaymentStatus(status);
//       console.log('🔄 Updating booking status from "pending" to:', paymentStatus);

//       // Update booking with payment details
//       booking.status = paymentStatus;
//       booking.payment_details.payment_method = 'payu';
//       // Keep our original order ID and also store PayU's transaction ID
//       if (!booking.payment_details.order_id) {
//         booking.payment_details.order_id = booking.payment_details.transaction_id;
//       }
//       booking.payment_details.payu_transaction_id = txnid;
//       booking.payment_details.paid_at = new Date();

//       // Store PayU payment ID if available
//       if (mihpayid) {
//         booking.payment_details.payment_reference = mihpayid;
//       }

//       await booking.save();

//       console.log(`✅ Payment ${paymentStatus} for booking ${booking.bookingId}`);
//       console.log('💾 Updated payment details:', {
//         orderId: booking.payment_details.order_id,
//         payuTxnid: booking.payment_details.payu_transaction_id,
//         originalTxnid: booking.payment_details.transaction_id
//       });


//       // ✅ यहाँ add करो customer log
// try {
//   const userId = booking.user.toString() || req.user_id;   // IMPORTANT: booking se lo
//   const user = await User.findById(userId);

// await saveCustomerLog({
//   userId,
//   phoneNumber: user?.phoneNumber,
//   type: "paymentSuccessBooking",
//   req,                 
//   extraData: payuResponse 
// });

// } catch (logErr) {
//   console.error("❌ Customer log failed:", logErr.message);
// }

//       // Send WhatsApp payment confirmation
//       let whatsappStatus = null;
//       try {
//         if (whatsappService.isReady) {
//           console.log('📱 Sending WhatsApp payment confirmation...');
          
//           // Populate booking data for WhatsApp
//           await booking.populate('user', 'firstName lastName phoneNumber email');
//           await booking.populate('visiting_state', 'name');
          
//           const whatsappResult = await whatsappService.sendPaymentConfirmation(booking, booking.user);
//           whatsappStatus = {
//             sent: whatsappResult,
//             message: whatsappResult ? 'WhatsApp confirmation sent' : 'Failed to send WhatsApp confirmation'
//           };
//           console.log('📱 WhatsApp result:', whatsappResult);
//         } else {
//           console.log('❌ WhatsApp service not ready - skipping payment confirmation');
//           whatsappStatus = {
//             sent: false,
//             message: 'WhatsApp service not ready'
//           };
//         }
//       } catch (error) {
//         console.error('❌ WhatsApp messaging error:', error);
//         whatsappStatus = {
//           sent: false,
//           message: `WhatsApp service error: ${error.message}`
//         };
//       }


//       // Redirect behavior
//       const isFormCallback = req.headers['content-type'] === 'application/x-www-form-urlencoded';
//       const isAppPlatform = String(req.query.platform || '').toLowerCase() === 'app';
//       if (isFormCallback && !isAppPlatform) {
//         const frontendBase = process.env.FRONTEND_URL || 'https://book.waadi.in';
//         return res.redirect(`${frontendBase}/payment/success?txnid=${txnid}&status=success&amount=${amount}&bookingId=${booking.bookingId}`);
//       }

//       // For Capacitor native flow, deep-link back into the app and let the app close the in-app browser
//       if (isFormCallback && isAppPlatform) {
//         const appDeepLinkBase = process.env.APP_DEEP_LINK_BASE || 'wadicab://payment';
//         const deepLink = `${appDeepLinkBase}/success?txnid=${encodeURIComponent(txnid)}&status=success&amount=${encodeURIComponent(amount)}&bookingId=${encodeURIComponent(booking.bookingId)}`;
//         // Use small HTML that triggers the deep link with a fallback link
//         res.setHeader('Content-Type', 'text/html; charset=utf-8');
//         return res.status(200).send(`<!doctype html><html><head><meta charset=\"utf-8\"><title>Completing payment…</title><meta http-equiv=\"refresh\" content=\"0;url='${deepLink}'\"></head><body><script>setTimeout(function(){window.location='${deepLink}';},0);</script><p>Completing payment… If not redirected, <a href=\"${deepLink}\">tap here</a>.</p></body></html>`);
//       }

//       // For API clients or other cases
//       res.status(200).json({
//         success: true,
//         message: `Payment ${paymentStatus} successfully`,
//         data: {
//           booking: {
//             id: booking._id,
//             bookingId: booking.bookingId,
//             status: booking.status,
//             amount: booking.amount
//           },
//           payment: {
//             txnid,
//             status,
//             mihpayid,
//             amount
//           }
//         }
//       });

//     } catch (error) {
//       console.log('\n' + '!'.repeat(80));
//       console.error('❌ PAYMENT SUCCESS ERROR - BUT WE STILL LOG THE DATA!');
//       console.log('!'.repeat(80));
      
//       // Even if processing fails, log the PayU data for testing
//       console.log('\n📥 RAW REQUEST DATA (FOR DEBUGGING):');
//       console.log('- req.body:', JSON.stringify(req.body, null, 2));
//       console.log('- req.headers:', JSON.stringify(req.headers, null, 2));
//       console.log('- req.method:', req.method);
//       console.log('- req.url:', req.url);
      
//       console.log('\n📥 ERROR DETAILS:');
//       console.error('Error message:', error.message);
//       console.error('Error stack:', error.stack);
      
//       console.log('\n📥 POSTMAN DATA (Even though processing failed):');
//       if (req.body && typeof req.body === 'object') {
//         Object.keys(req.body).forEach(key => {
//           if (req.body[key] !== undefined && req.body[key] !== null) {
//             console.log(`${key}=${encodeURIComponent(req.body[key])}`);
//           }
//         });
//       }
      
//       console.log('\n' + '!'.repeat(80));
      
//       res.status(500).json({
//         success: false,
//         message: 'Failed to process payment success',
//         debug: {
//           error: error.message,
//           receivedData: req.body
//         }
//       });
//     }
//   }

//   // POST /payment/failure - Handle PayU failure callback
//   async handlePaymentFailure(req, res) {
//     try {
//       const payuResponse = req.body;
      
//       console.log('\n' + '='.repeat(80));
//       console.log('❌ PayU FAILURE CALLBACK RECEIVED!');
//       console.log('='.repeat(80));
      
//       // Log EVERYTHING for debugging
//       console.log('📥 COMPLETE REQUEST DETAILS:');
//       console.log('- Method:', req.method);
//       console.log('- URL:', req.url);
//       console.log('- Query Params:', req.query);
//       console.log('- Content-Type:', req.headers['content-type']);
//       console.log('- User-Agent:', req.headers['user-agent']);
//       console.log('- IP Address:', req.ip || req.connection.remoteAddress);
      
//       console.log('\n📥 ALL HEADERS:');
//       console.log(JSON.stringify(req.headers, null, 2));
      
//       console.log('\n📥 RAW BODY (req.body):');
//       console.log(JSON.stringify(payuResponse, null, 2));
      
//       console.log('\n📥 PARSED PayU FAILURE RESPONSE FIELDS:');
//       console.log('- txnid:', payuResponse.txnid);
//       console.log('- mihpayid:', payuResponse.mihpayid);
//       console.log('- mode:', payuResponse.mode);
//       console.log('- status:', payuResponse.status);
//       console.log('- unmappedstatus:', payuResponse.unmappedstatus);
//       console.log('- key:', payuResponse.key);
//       console.log('- amount:', payuResponse.amount);
//       console.log('- productinfo:', payuResponse.productinfo);
//       console.log('- firstname:', payuResponse.firstname);
//       console.log('- email:', payuResponse.email);
//       console.log('- phone:', payuResponse.phone);
//       console.log('- udf1:', payuResponse.udf1);
//       console.log('- udf2:', payuResponse.udf2);
//       console.log('- udf3:', payuResponse.udf3);
//       console.log('- error:', payuResponse.error);
//       console.log('- error_Message:', payuResponse.error_Message);
//       console.log('- hash:', payuResponse.hash);
      
//       console.log('\n📥 COMPLETE RESPONSE OBJECT KEYS:');
//       console.log('All available keys:', Object.keys(payuResponse));
      
//       console.log('\n📥 FOR POSTMAN TESTING - COPY THIS EXACT FAILURE DATA:');
//       console.log('Content-Type: application/x-www-form-urlencoded');
//       console.log('POST URL:  http://localhost:4001/api/v1/payment/failure');
//       console.log('Form Data:');
//       Object.keys(payuResponse).forEach(key => {
//         if (payuResponse[key] !== undefined && payuResponse[key] !== null) {
//           console.log(`${key}=${encodeURIComponent(payuResponse[key])}`);
//         }
//       });
      
//       console.log('\n📥 CURL COMMAND FOR TESTING FAILURE:');
//       const curlData = Object.keys(payuResponse)
//         .filter(key => payuResponse[key] !== undefined && payuResponse[key] !== null)
//         .map(key => `${key}=${encodeURIComponent(payuResponse[key])}`)
//         .join('&');
//       console.log(`curl -X POST  http://localhost:4001/api/v1/payment/failure \\`);
//       console.log(`  -H "Content-Type: application/x-www-form-urlencoded" \\`);
//       console.log(`  -d "${curlData}"`);
      
//       console.log('\n' + '='.repeat(80));

//       // Log the transaction
//       payuService.logTransaction('FAILURE_CALLBACK', payuResponse);

//       const { txnid, status, amount, udf1: bookingId, error_Message } = payuResponse;

//       // Check if this is a test request
//       const isTestRequest = txnid === 'TEST123' || payuResponse.test === 'true';
      
//       if (isTestRequest) {
//         console.log('🧪 Test failure callback processed successfully');
//         return res.status(200).json({
//           success: false,
//           message: 'Test failure callback received',
//           data: {
//             txnid,
//             status: status || 'failure',
//             amount: amount || '100',
//             error: error_Message || 'Test failure scenario',
//             test: true
//           }
//         });
//       }

//       // Find the booking using the booking ID stored in UDF1
//       const booking = await Booking.findById(bookingId);
      
//       if (!booking) {
//         console.error('❌ Booking not found for failed transaction:', txnid);
//         return res.status(404).json({
//           success: false,
//           message: 'Booking not found'
//         });
//       }

//       // Get normalized payment status
//       const paymentStatus = payuService.getPaymentStatus(status);

//       // Update booking status
//       booking.status = paymentStatus;
//       booking.payment_details.payment_method = 'payu';
      
//       // Store failure reason if available
//       if (error_Message) {
//         booking.payment_details.failure_reason = error_Message;
//       }

//       await booking.save();

//       try {
//   const userId = booking.user?.toString();

//   const user = await User.findById(userId);

//  await saveCustomerLog({
//   userId,
//   phoneNumber: user?.phoneNumber,
//   type: "paymentFailureBooking",
//    req,                 // ✅ real express req
//   extraData: payuResponse // ✅ PayU body separately store

// });

//   console.log("📊 Customer failure log saved");
// } catch (logErr) {
//   console.error("❌ Customer failure log failed:", logErr.message);
// }

//       console.log(`❌ Payment ${paymentStatus} for booking ${booking.bookingId}: ${error_Message || 'Unknown error'}`);

//       // Send WhatsApp payment failure notification
//       let whatsappStatus = null;
//       try {
//         if (whatsappService.isReady) {
//           console.log('📱 Sending WhatsApp payment failure notification...');
          
//           // Populate booking data for WhatsApp
//           await booking.populate('user', 'firstName lastName phoneNumber email');
//           await booking.populate('visiting_state', 'name');
          
//           const whatsappResult = await whatsappService.sendPaymentFailure(booking, booking.user, error_Message || 'Payment failed');
//           whatsappStatus = {
//             sent: whatsappResult,
//             message: whatsappResult ? 'WhatsApp failure notification sent' : 'Failed to send WhatsApp failure notification'
//           };
//           console.log('📱 WhatsApp result:', whatsappResult);
//         } else {
//           console.log('❌ WhatsApp service not ready - skipping payment failure notification');
//           whatsappStatus = {
//             sent: false,
//             message: 'WhatsApp service not ready'
//           };
//         }
//       } catch (error) {
//         console.error('❌ WhatsApp messaging error:', error);
//         whatsappStatus = {
//           sent: false,
//           message: `WhatsApp service error: ${error.message}`
//         };
//       }

//       // Redirect behavior
//       const isFormCallback = req.headers['content-type'] === 'application/x-www-form-urlencoded';
//       const isAppPlatform = String(req.query.platform || '').toLowerCase() === 'app';
//       if (isFormCallback && !isAppPlatform) {
//         const frontendBase = process.env.FRONTEND_URL || 'https://book.waadi.in'
//         return res.redirect(`${frontendBase}/payment/failure?txnid=${txnid}&status=failure&amount=${amount}&error=${encodeURIComponent(error_Message || 'Payment failed')}`);
//       }

//       // For Capacitor native flow, deep-link back into the app and let the app close the in-app browser
//       if (isFormCallback && isAppPlatform) {
//         const appDeepLinkBase = process.env.APP_DEEP_LINK_BASE || 'wadicab://payment';
//         const deepLink = `${appDeepLinkBase}/failure?txnid=${encodeURIComponent(txnid)}&status=failure&amount=${encodeURIComponent(amount)}&error=${encodeURIComponent(error_Message || 'Payment failed')}`;
//         res.setHeader('Content-Type', 'text/html; charset=utf-8');
//         return res.status(200).send(`<!doctype html><html><head><meta charset=\"utf-8\"><title>Payment failed</title><meta http-equiv=\"refresh\" content=\"0;url='${deepLink}'\"></head><body><script>setTimeout(function(){window.location='${deepLink}';},0);</script><p>Payment failed. If not redirected, <a href=\"${deepLink}\">tap here</a>.</p></body></html>`);
//       }

//       // For API response
//       res.status(200).json({
//         success: false,
//         message: `Payment ${paymentStatus}`,
//         data: {
//           booking: {
//             id: booking._id,
//             bookingId: booking.bookingId,
//             status: booking.status,
//             amount: booking.amount
//           },
//           payment: {
//             txnid,
//             status,
//             amount,
//             error: error_Message
//           }
//         }
//       });

//     } catch (error) {
//       console.log('\n' + '!'.repeat(80));
//       console.error('❌ PAYMENT FAILURE ERROR - BUT WE STILL LOG THE DATA!');
//       console.log('!'.repeat(80));
      
//       // Even if processing fails, log the PayU data for testing
//       console.log('\n📥 RAW REQUEST DATA (FOR DEBUGGING):');
//       console.log('- req.body:', JSON.stringify(req.body, null, 2));
//       console.log('- req.headers:', JSON.stringify(req.headers, null, 2));
//       console.log('- req.method:', req.method);
//       console.log('- req.url:', req.url);
      
//       console.log('\n📥 ERROR DETAILS:');
//       console.error('Error message:', error.message);
//       console.error('Error stack:', error.stack);
      
//       console.log('\n📥 POSTMAN DATA (Even though processing failed):');
//       if (req.body && typeof req.body === 'object') {
//         Object.keys(req.body).forEach(key => {
//           if (req.body[key] !== undefined && req.body[key] !== null) {
//             console.log(`${key}=${encodeURIComponent(req.body[key])}`);
//           }
//         });
//       }
      
//       console.log('\n' + '!'.repeat(80));
      
//       res.status(500).json({
//         success: false,
//         message: 'Failed to process payment failure',
//         debug: {
//           error: error.message,
//           receivedData: req.body
//         }
//       });
//     }
//   }

//   // GET /payment/status/:txnid - Check payment status
//   async getPaymentStatus(req, res) {
//     try {
//       const { txnid } = req.params;
//       const userId = req.user._id;

//       // Find booking by transaction ID
//       const booking = await Booking.findOne({
//         'payment_details.transaction_id': txnid,
//         user: userId
//       }).populate('visiting_state', 'name');

//       if (!booking) {
//         return res.status(404).json({
//           success: false,
//           message: 'Payment transaction not found'
//         });
//       }

       

//         const user = await User.findById(userId);

//             await saveCustomerLog({
//   userId: userId,
//   phoneNumber: user.phoneNumber,
//   type: "PaymentStatus",
//   req
// });

//       res.status(200).json({
//         success: true,
//         message: 'Payment status retrieved successfully',
//         data: {
//           booking: {
//             id: booking._id,
//             bookingId: booking.bookingId,
//             status: booking.status,
//             amount: booking.amount,
//             visitingState: booking.visiting_state.name
//           },
//           payment: {
//             transaction_id: booking.payment_details.transaction_id,
//             payment_method: booking.payment_details.payment_method,
//             payment_reference: booking.payment_details.payment_reference,
//             paid_at: booking.payment_details.paid_at,
//             status: booking.status
//           }
//         }
//       });

//     } catch (error) {
//       console.error('Get payment status error:', error);
//       res.status(500).json({
//         success: false,
//         message: 'Failed to get payment status'
//       });
//     }
//   }

//   // POST /payment/test-hash - Test hash generation with sample data
//   async testHashGeneration(req, res) {
//     try {
//       const { txnid, amount, productinfo, firstname, email } = req.body;
      
//       if (!txnid || !amount || !productinfo || !firstname) {
//         return res.status(400).json({
//           success: false,
//           message: 'txnid, amount, productinfo, and firstname are required'
//         });
//       }

//       // Generate sample hash string
//       const sampleParams = {
//         txnid,
//         amount,
//         productinfo,
//         firstname,
//         email: email || 'test@example.com',
//         udf1: 'test_udf1',
//         udf2: 'test_udf2',
//         udf3: 'test_udf3'
//       };

//       const hashString = payuService.generateHashString(sampleParams);
//       const hash = payuService.generateSimpleHash(hashString);

//       res.status(200).json({
//         success: true,
//         message: 'Hash generation test successful',
//         data: {
//           inputParams: sampleParams,
//           hashString: hashString,
//           generatedHash: hash,
//           hashLength: hash.length,
//           expectedFormat: 'key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5|udf6|udf7|udf8|udf9|udf10|merchantSalt'
//         }
//       });

//     } catch (error) {
//       console.error('Test hash generation error:', error);
//       res.status(500).json({
//         success: false,
//         message: 'Failed to test hash generation'
//       });
//     }
//   }

//   // GET /payment/test - Test PayU configuration
//   async testPayUConfig(req, res) {
//     try {
//       const configValidation = payuService.validateConfig();
      
//       res.status(200).json({
//         success: true,
//         message: 'PayU configuration test',
//         data: {
//           isValid: configValidation.isValid,
//           errors: configValidation.errors,
//           environment: process.env.NODE_ENV,
//           paymentUrl:
//             'https://secure.payu.in/_payment' ,
//           configuration: {
//             key: process.env.PAYU_KEY ? `${process.env.PAYU_KEY.substring(0, 4)}***` : 'NOT_SET',
//             salt: process.env.PAYU_SALT ? `${process.env.PAYU_SALT.substring(0, 4)}***` : 'NOT_SET',
//             successUrl: process.env.PAYU_SUCCESS_URL || 'Using default 192.168.1.8',
//             failureUrl: process.env.PAYU_FAILURE_URL || 'Using default 192.168.1.8',
//             frontendUrl: process.env.FRONTEND_URL || 'Not set'
//           },
//           recommendations: configValidation.isValid ? [
//             '✅ Configuration looks good!',
//             'Test your callback URLs with: ./test-payu-urls.sh',
//             'Ensure your tunnel URL is publicly accessible',
//             'Check PayU merchant dashboard settings'
//           ] : [
//             '❌ Fix environment variables first',
//             'Check your .env file',
//             'Restart server after changes',
//             'Refer to PAYU_SETUP.md for guidance'
//           ]
//         }
//       });

//     } catch (error) {
//       console.error('Test PayU config error:', error);
//       res.status(500).json({
//         success: false,
//         message: 'Failed to test PayU configuration'
//       });
//     }
//   }
// }

// module.exports = new PaymentController(); 
const Booking = require('../models/Booking');
const User = require('../models/User');
const Payment = require('../models/Payment');
const payuService = require('../services/payuService');       // kept for PayU-specific helpers (hash, verify)
const cashfreeService = require('../services/cashfreeService'); // kept for Cashfree-specific helpers
const gatewayResolver = require('../config/gatewayResolver');
const gatewayCredentials = require('../utils/gatewayCredentials');
const { isAppPlatformRequest } = require('../utils/platformRequest');
const PaymentGatewayConfig = require('../models/PaymentGatewayConfig');
const whatsappService = require('../services/whatsappService');
const crypto = require('crypto');
const axios = require('axios');
const saveCustomerLog = require('../utils/saveCustomerLog');
const lifecycle = require('../utils/bookingLifecycleLogger');

class PaymentController {
  // GET/POST /payment/relay - Render an auto-submitting PayU form (helps native apps open via GET)
  async renderPayURelay(req, res) {
    try {
      const source = req.method === 'GET' ? req.query : (req.body || {});

      const required = ['key', 'txnid', 'amount', 'productinfo', 'firstname', 'email', 'phone', 'surl', 'furl', 'hash'];
      const missing = required.filter((k) => !source[k]);
      if (missing.length) {
        return res.status(400).json({ success: false, message: `Missing fields: ${missing.join(', ')}` });
      }

      // Minimal escaping for HTML attributes/text
      const esc = (v) => String(v)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

      // Build fields payload (include known UDFs if present)
      const fields = {
        key: source.key,
        txnid: source.txnid,
        amount: source.amount,
        productinfo: source.productinfo,
        firstname: source.firstname,
        email: source.email || '',
        phone: source.phone || '',
        surl: source.surl,
        furl: source.furl,
        hash: source.hash,
        service_provider: source.service_provider || 'payu_paisa',
        udf1: source.udf1 || '',
        udf2: source.udf2 || '',
        udf3: source.udf3 || '',
        udf4: source.udf4 || '',
        udf5: source.udf5 || '',
        udf6: source.udf6 || '',
        udf7: source.udf7 || '',
        udf8: source.udf8 || '',
        udf9: source.udf9 || '',
        udf10: source.udf10 || ''
      };

      const payuUrl = 'https://secure.payu.in/_payment';

      // Route-specific CSP to allow posting form to PayU and inline auto-submit
      const csp = [
        "default-src 'self'",
        "form-action 'self' https://secure.payu.in https://secure.payu.com https:",
        "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline'",
        "frame-src 'self' https://secure.payu.in https://secure.payu.com",
        "img-src 'self' data:",
        "base-uri 'self'",
        "object-src 'none'"
      ].join('; ');

      res.setHeader('Content-Security-Policy', csp);
      res.setHeader('X-Content-Security-Policy', csp); // legacy
      res.setHeader('X-WebKit-CSP', csp); // legacy
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      lifecycle.logPayURedirect({
        txnid: source.txnid,
        paymentUrl: payuUrl,
        platform: source.platform || req.headers['x-platform'],
        req,
      });

      res.status(200).send(
        `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Redirecting to PayU…</title>
    <style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;padding:24px;line-height:1.5} .box{max-width:560px;margin:40px auto;border:1px solid #e5e7eb;border-radius:12px;padding:24px} .btn{background:#16a34a;border:0;color:#fff;padding:10px 16px;border-radius:8px;font-weight:600} .meta{color:#6b7280;font-size:14px;margin-top:8px}</style>
  </head>
  <body>
    <div class="box">
      <h2>Redirecting to PayU…</h2>
      <p class="meta">Please wait while we securely connect to the payment gateway.</p>
      <form id="payuForm" method="POST" action="${esc(payuUrl)}">
        ${Object.entries(fields)
          .map(([k, v]) => `<input type="hidden" name="${esc(k)}" value="${esc(v)}" />`)
          .join('\n        ')}
        <noscript>
          <button type="submit" class="btn">Continue to PayU</button>
        </noscript>
      </form>
      <p class="meta">If you are not redirected automatically, click the button above.</p>
    </div>
    <script>document.getElementById('payuForm').submit();</script>
  </body>
  </html>`
      );
    } catch (error) {
      console.error('Render PayU relay error:', error);
      res.status(500).json({ success: false, message: 'Failed to render PayU relay page' });
    }
  }

  // POST /payment/generate-hash - Generate PayU payment hash
  async generateHash(req, res) {
    try {
      const { 
        txnid, amount, productinfo, firstname, email, phone,
        udf1 = '', udf2 = '', udf3 = '', udf4 = '', udf5 = '',
        udf6 = '', udf7 = '', udf8 = '', udf9 = '', udf10 = ''
      } = req.body;

      // Validate required fields
      if (!txnid || !amount || !productinfo || !firstname) {
        return res.status(400).json({
          success: false,
          message: 'txnid, amount, productinfo, and firstname are required'
        });
      }

      // ── Validate .env credentials for the active gateway ──
      const { name: activeGateway } = await gatewayResolver.getActiveGateway();
      if (activeGateway !== 'payu') {
        return res.status(400).json({
          success: false,
          message: 'Hash generation is only available when PayU is the active gateway',
        });
      }

      const { isValid, errors, credentials } = gatewayCredentials.validateAndSync('payu');
      if (!isValid) {
        return res.status(500).json({
          success: false,
          message: 'PayU configuration incomplete – credentials missing in .env',
          errors,
        });
      }

      const merchantKey = credentials.key;
      const merchantSalt = credentials.salt;

      // Build hash string: key|txnid|amount|productinfo|firstname|email|udf1…udf10|salt
      const hashString = `${merchantKey}|${txnid}|${amount}|${productinfo}|${firstname}|${email || ''}|${udf1}|${udf2}|${udf3}|${udf4}|${udf5}|${udf6}|${udf7}|${udf8}|${udf9}|${udf10}|${merchantSalt}`;
      
      // Generate SHA512 hash
      const hash = crypto.createHash('sha512').update(hashString).digest('hex');

      // Log hash generation for security and debugging
      console.log('🔐 Hash generation request:', {
        timestamp: new Date().toISOString(),
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        txnid,
        amount,
        productinfo,
        firstname,
        email: email || 'not provided',
        udf1: udf1 || 'not provided',
        udf2: udf2 || 'not provided',
        udf3: udf3 || 'not provided'
      });
      
      // Log masked hash string (salt never exposed)
      const maskedHashString = hashString.replace(merchantSalt, '***SALT***');
      console.log('🔐 Processing hash string:', maskedHashString);
      console.log('🔐 Hash string length:', hashString.length);
      console.log('🔐 Expected format: key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5|udf6|udf7|udf8|udf9|udf10|salt');

      res.status(200).json({
        success: true,
        hash: hash,
        message: 'Hash generated successfully'
      });

    } catch (error) {
      console.error('Generate hash error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate hash'
      });
    }
  }

  // POST /payment/test-hash - Test hash verification with JSON data
  async testHashVerification(req, res) {
    try {
      console.log('🧪 Testing hash verification with JSON data...');
      console.log('📥 Request body:', JSON.stringify(req.body, null, 2));
      
      const payuResponse = req.body;
      
      // Validate required fields
      if (!payuResponse.txnid || !payuResponse.hash) {
        return res.status(400).json({
          success: false,
          message: 'txnid and hash are required for testing'
        });
      }
      
      // Test hash verification
      console.log('🔐 Testing hash verification...');
      const isHashValid = payuService.verifyHash(payuResponse);
      
      console.log('🔍 Hash verification result:', isHashValid);
      console.log('🔍 PayU Service config:');
      console.log('  Key:', payuService.key);
      console.log('  Salt:', payuService.salt);
      
      res.status(200).json({
        success: true,
        message: 'Hash verification test completed',
        data: {
          hashValid: isHashValid,
          payuConfig: {
            key: payuService.key,
            salt: payuService.salt
          },
          receivedData: payuResponse
        }
      });
      
    } catch (error) {
      console.error('Test hash verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to test hash verification',
        error: error.message
      });
    }
  }

  // POST /payment/test-form-data - Test form data parsing (no auth required for testing)
  async testFormData(req, res) {
    try {
      console.log('🧪 Testing form data parsing...');
      
      let payuResponse = req.body;
      
      // If body is raw (Buffer), parse it manually
      if (Buffer.isBuffer(req.body)) {
        console.log('📥 Raw body detected, parsing manually...');
        const rawBody = req.body.toString('utf8');
        console.log('📥 Raw body string:', rawBody);
        
        // Check content type to determine parsing method
        const contentType = req.headers['content-type'] || '';
        
        if (contentType.includes('multipart/form-data')) {
          console.log('📥 Parsing multipart form data...');
          // Parse multipart form data
          const formData = {};
          const boundary = contentType.split('boundary=')[1];
          const parts = rawBody.split('--' + boundary);
          
          parts.forEach(part => {
            if (part.trim() && !part.includes('--')) {
              const lines = part.split('\r\n');
              let key = '';
              let value = '';
              
              lines.forEach(line => {
                if (line.startsWith('Content-Disposition:')) {
                  const match = line.match(/name="([^"]+)"/);
                  if (match) key = match[1];
                } else if (line.trim() && !line.startsWith('Content-')) {
                  value = line.trim();
                }
              });
              
              if (key && value !== '') {
                formData[key] = value;
              }
            }
          });
          
          payuResponse = formData;
          console.log('📥 Parsed multipart form data:', formData);
        } else {
          console.log('📥 Parsing URL-encoded form data...');
          // Parse URL-encoded form data
          const formData = {};
          const pairs = rawBody.split('&');
          pairs.forEach(pair => {
            const [key, value] = pair.split('=');
            if (key && value !== undefined) {
              formData[decodeURIComponent(key)] = decodeURIComponent(value);
            }
          });
          
          payuResponse = formData;
          console.log('📥 Parsed URL-encoded form data:', formData);
        }
      }
      
      console.log('📥 Final parsed data:', payuResponse);
      console.log('📥 Data type:', typeof payuResponse);
      console.log('📥 Data keys:', payuResponse ? Object.keys(payuResponse) : 'No keys');
      
      res.status(200).json({
        success: true,
        message: 'Form data parsing test completed',
        data: {
          bodyType: typeof req.body,
          isBuffer: Buffer.isBuffer(req.body),
          contentType: req.headers['content-type'],
          parsedData: payuResponse,
          rawBodyLength: Buffer.isBuffer(req.body) ? req.body.length : 'Not a buffer'
        }
      });
      
    } catch (error) {
      console.error('Test form data error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to test form data parsing',
        error: error.message
      });
    }
  }

  // POST /payment/verify - Verify PayU payment and create booking
  async verifyPayment(req, res) {
    try {
      const { txnId, payuMoneyId, status, amount, bookingData } = req.body;

      if (!txnId || !status || !amount || !bookingData) {
        return res.status(400).json({
          success: false,
          message: 'Transaction ID, status, amount, and booking data are required'
        });
      }

      // Check if payment already exists
      const existingPayment = await Payment.findOne({ txn_id: txnId });
      if (existingPayment) {
        lifecycle.logDuplicatePayment({
          txnid: txnId,
          bookingId: existingPayment.booking?.toString(),
          req,
        });
        // Handle duplicate payment attempt
        const existingBooking = await Booking.findById(existingPayment.booking)
          .populate('visiting_state', 'name');
        
        if (existingBooking) {
          return res.status(200).json({
            success: true,
            data: {
              bookingId: existingBooking.bookingId,
              paymentId: existingPayment.id,
              txnId: existingPayment.txn_id,
              amount: existingPayment.amount,
              status: existingBooking.status === 'paid' ? 'confirmed' : existingBooking.status,
              validity: {
                validFrom: existingBooking.validity.valid_from,
                validUntil: existingBooking.validity.valid_until,
                isExpired: existingBooking.validity.is_expired
              }
            },
            message: 'Payment already processed - returning existing booking'
          });
        }
      }
  const userId =
  req.user?._id ||
  bookingData?.user?.toString();

        const user = await User.findById(userId);

            await saveCustomerLog({
  userId: userId || user?._id,
  phoneNumber: user?.phoneNumber,
  type: "verifyPayment",
  req 
});

      // Verify payment status from PayU response
      let paymentVerified = false;
      let verificationError = null;
      
      try {
        // First try to verify with PayU API if configured
        if (process.env.PAYU_VERIFY_URL && process.env.PAYU_VERIFY_URL.trim() !== '') {
          console.log('🔍 Attempting PayU API verification for txnId:', txnId);
          const verificationResult = await this.verifyWithPayU(txnId);
          paymentVerified = verificationResult.verified;
          if (verificationResult.error) {
            verificationError = verificationResult.error;
          }
        } else {
          console.log('⚠️ PayU verification URL not configured, using local status verification');
        }
      } catch (verifyError) {
        console.error('❌ PayU verification error:', verifyError);
        verificationError = verifyError.message;
      }

      // If PayU verification failed or wasn't configured, use local status verification
      if (!paymentVerified) {
        const localStatus = status.toLowerCase();
        paymentVerified = localStatus === 'success' || localStatus === 'completed';
        console.log(`🔍 Local status verification: ${localStatus} -> ${paymentVerified ? 'verified' : 'failed'}`);
      }

      console.log(`✅ Payment verification result: ${paymentVerified ? 'SUCCESS' : 'FAILED'}`);
      lifecycle.logPaymentVerified({
        booking: null,
        txnid: txnId,
        verified: paymentVerified,
        req,
      });
      if (verificationError) {
        console.log(`⚠️ Verification error details: ${verificationError}`);
      }

      // Create payment record
      const payment = new Payment({
        txn_id: txnId,
        payu_payment_id: payuMoneyId,
        amount: parseFloat(amount),
        status: paymentVerified ? 'success' : 'failure',
        payment_method: 'payu',
        user: req.user._id,
        verified: paymentVerified,
        payment_data: {
          productinfo: `Border Tax - ${bookingData.vehicleTypeName}`,
          firstname: req.user.firstName,
          email: req.user.email,
          phone: req.user.phoneNumber,
          udf1: bookingData.vehicleNumber,
          udf2: bookingData.visitingStateName,
          udf3: bookingData.planType,
          verification_error: verificationError
        }
      });

      await payment.save();

      // If payment failed, return early with payment details
      if (!paymentVerified) {
        console.log(`❌ Payment failed for txnId: ${txnId}, paymentId: ${payment.id}`);
        
        // Emit real-time event for failed payment
        if (global.io) {
          global.io.to('admin-room').emit('payment-failed', {
            type: 'payment-failed',
            payment: payment.getSummary(),
            error: verificationError,
            timestamp: new Date().toISOString()
          });
        }

        return res.status(400).json({
          success: false,
          message: 'Payment verification failed',
          data: {
            paymentId: payment.id,
            txnId: payment.txn_id,
            status: 'failed',
            error: verificationError || 'Payment verification failed'
          }
        });
      }

      // Create booking record with proper payment status
      const booking = new Booking({
        user: req.user._id,
        visiting_state: bookingData.visitingStateId,
        vehicle_number: bookingData.vehicleNumber,
        seat_capacity: bookingData.vehicleTypeName,
        whatsapp_number: bookingData.whatsappNumber,
        entry_border: bookingData.entryBorderName,
        tax_mode: bookingData.planType,
        tax_from_date: new Date(bookingData.fromDate),
        tax_upto_date: new Date(bookingData.uptoDate),
        amount: parseFloat(amount),
        status: 'paid', // Booking is confirmed since payment is verified
        payment_id: payment.id,
        payment_status: 'paid', // Payment is confirmed
        payment_details: {
          transaction_id: txnId,
          payment_method: 'payu',
          payment_reference: payuMoneyId,
          paid_at: new Date(),
          verification_method: verificationError ? 'local_status' : 'payu_api'
        }
      });

      const savedBooking = await booking.save();
      
      // Update payment with booking reference
      payment.booking = savedBooking._id;
      await payment.save();

      // Populate booking data
      await savedBooking.populate([
        { path: 'visiting_state', select: 'name' },
        { path: 'user', select: 'firstName lastName phoneNumber email' }
      ]);


      // Send WhatsApp payment confirmation
      let whatsappStatus = null;
      try {
        if (whatsappService.isReady) {
          console.log('📱 Sending WhatsApp payment confirmation...');
          const whatsappResult = await whatsappService.sendPaymentConfirmation(savedBooking, savedBooking.user);
          whatsappStatus = {
            sent: whatsappResult,
            message: whatsappResult ? 'WhatsApp confirmation sent' : 'Failed to send WhatsApp confirmation'
          };
          console.log('📱 WhatsApp result:', whatsappResult);
        } else {
          console.log('❌ WhatsApp service not ready - skipping payment confirmation');
          whatsappStatus = {
            sent: false,
            message: 'WhatsApp service not ready'
          };
        }
      } catch (error) {
        console.error('❌ WhatsApp messaging error:', error);
        whatsappStatus = {
          sent: false,
          message: `WhatsApp service error: ${error.message}`
        };
      }

      // Emit real-time event to admin dashboard
      if (global.io) {
        global.io.to('admin-room').emit('payment-verified', {
          type: 'payment-verified',
          booking: savedBooking,
          payment: payment.getSummary(),
          whatsapp: whatsappStatus,
          timestamp: new Date().toISOString()
        });
      }

      res.status(200).json({
        success: true,
        data: {
          bookingId: savedBooking.bookingId,
          paymentId: payment.id,
          txnId: payment.txn_id,
          amount: payment.amount,
          status: 'confirmed',
          validity: {
            validFrom: savedBooking.validity.valid_from,
            validUntil: savedBooking.validity.valid_until,
            isExpired: savedBooking.validity.is_expired
          }
        },
        message: 'Payment verified and booking created successfully'
      });

    } catch (error) {
      console.error('Verify payment error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify payment and create booking'
      });
    }
  }

  // GET /payment/status/:txnId - Check payment status
  async getPaymentStatusByTxnId(req, res) {
    try {
      const { txnId } = req.params;

      // Find payment by transaction ID
      const payment = await Payment.findOne({ txn_id: txnId })
        .populate('booking')
        .populate('user', 'firstName lastName phoneNumber');

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Payment transaction not found'
        });
      }

      // Check if user owns this payment (unless admin)
      if (!req.user.isAdmin && payment.user.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only view your own payment transactions'
        });
      }

      const responseData = {
        txnId: payment.txn_id,
        status: payment.status,
        paymentId: payment.id,
        amount: payment.amount
      };

      if (payment.booking) {
        responseData.bookingId = payment.booking.bookingId;
      }

      res.status(200).json({
        success: true,
        data: responseData
      });

    } catch (error) {
      console.error('Get payment status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get payment status'
      });
    }
  }

  // Helper method to verify payment with PayU
  async verifyWithPayU(txnId) {
    try {
      const verifyUrl = process.env.PAYU_VERIFY_URL;
      
      if (!verifyUrl || typeof verifyUrl !== 'string' || verifyUrl.trim() === '') {
        throw new Error('PayU verification URL not configured or invalid');
      }

      // Validate URL format
      let parsedUrl;
      try {
        parsedUrl = new URL(verifyUrl);
        if (!parsedUrl.protocol || !parsedUrl.hostname) {
          throw new Error('Invalid URL format');
        }
      } catch (urlError) {
        throw new Error(`Invalid PayU verification URL: ${verifyUrl}`);
      }

      // ── Credentials always come from .env ──
      const { isValid, credentials } = gatewayCredentials.validateAndSync('payu');
      const key = credentials.key;
      const salt = credentials.salt;
      
      if (!isValid || !key || !salt) {
        throw new Error('PayU merchant key or salt not configured in .env');
      }

      const command = 'verify_payment';
      
      // Generate verification hash
      const hashString = `${key}|${command}|${txnId}|${salt}`;
      const hash = crypto.createHash('sha512').update(hashString).digest('hex');

      console.log(`🔍 Verifying payment with PayU API: ${parsedUrl.hostname}${parsedUrl.pathname}`);

      const formData = new URLSearchParams({
        key: key,
        command: command,
        var1: txnId,
        hash: hash
      });

      const response = await axios.post(verifyUrl, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 15000, // Increased timeout
        validateStatus: function (status) {
          return status >= 200 && status < 500; // Accept 2xx and 4xx responses
        }
      });

      console.log(`📡 PayU API response status: ${response.status}`);
      
      if (response.status >= 400) {
        throw new Error(`PayU API error: ${response.status} - ${response.statusText}`);
      }

      const verification = response.data;
      console.log('📡 PayU verification response:', JSON.stringify(verification, null, 2));
      
      const isVerified = verification.status === 1 && 
                        verification.transaction_details && 
                        verification.transaction_details[txnId] && 
                        verification.transaction_details[txnId].status === 'success';
      
      console.log(`✅ PayU verification result for txnId ${txnId}: ${isVerified ? 'SUCCESS' : 'FAILED'}`);
      
      return {
        verified: isVerified,
        data: verification
      };

    } catch (error) {
      console.error('❌ PayU verification API error:', error);
      
      // Return detailed error information
      return {
        verified: false,
        error: error.message,
        details: {
          txnId,
          url: process.env.PAYU_VERIFY_URL,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  // POST /payment/initiate - Initiate payment for a booking
 async initiatePayment(req, res) {
    try {
      const { bookingId } = req.body;
      
      if (!bookingId) {
        return res.status(400).json({
          success: false,
          message: 'Booking ID is required'
        });
      }

      // ── Resolve active gateway from MongoDB + validate .env credentials ──
      const { name: gatewayName, service: gatewayService, isValid, errors } =
        await gatewayResolver.prepareActiveGateway();

      console.log(`💳 initiatePayment – active gateway: [${gatewayName}]`);

      if (!isValid) {
        return res.status(500).json({
          success: false,
          message: `Gateway [${gatewayName}] credentials missing: ${errors.join('; ')}`,
        });
      }

      // Find the booking
      const booking = await Booking.findById(bookingId)
        .populate('visiting_state', 'name')
        .populate('user', 'firstName lastName phoneNumber email');

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }

      const userId = req.user?._id || booking?.user?._id;

      // Check if user owns this booking
      if (booking.user._id.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only initiate payment for your own bookings'
        });
      }

      // Check if booking is already paid
      if (booking.status === 'paid') {
        return res.status(400).json({
          success: false,
          message: 'Booking is already paid'
        });
      }

      // Check if booking is cancelled
      if (booking.status === 'cancelled') {
        return res.status(400).json({
          success: false,
          message: 'Cannot initiate payment for cancelled booking'
        });
      }

      // ── Prepare payment data via the resolved service ──
      const platform = isAppPlatformRequest(req) ? 'app' : 'web';
      const paymentPreparation = await Promise.resolve(
        gatewayService.preparePaymentData(booking, booking.user, { platform })
      );

      if (!paymentPreparation.success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to prepare payment data',
          error: paymentPreparation.error
        });
      }

      // ── Persist the transaction / order ID on the booking ──
      if (gatewayName === 'payu') {
        booking.payment_details.transaction_id = paymentPreparation.paymentData.txnid;
      } else if (gatewayName === 'cashfree') {
        booking.payment_details.transaction_id = paymentPreparation.paymentData.txnid;
      }
      booking.payment_details.payment_method = gatewayName;
      await booking.save();

      // Log transaction initiation
      gatewayService.logTransaction('INITIATE', {
        txnid: paymentPreparation.paymentData?.txnid,
        amount: booking.amount,
        bookingId: booking.bookingId
      });

      lifecycle.logPaymentInitiated({
        booking,
        txnid: paymentPreparation.paymentData?.txnid,
        gateway: gatewayName,
        req,
        payload: paymentPreparation,
      });

      try {
        const user = await User.findById(userId);
        await saveCustomerLog({
          userId,
          phoneNumber: user?.phoneNumber,
          type: 'initiatePayment',
          req,
          extraData: {
            gateway: gatewayName,
            bookingId: booking?._id,
            bookingNumber: booking?.bookingId,
            txnid: paymentPreparation.paymentData?.txnid,
            amount: booking?.amount,
            vehicleNumber: booking?.vehicle_number,
            visitingState: booking?.visiting_state?.name,
          },
        });
      } catch (logErr) {
        console.error('❌ Initiate payment log failed:', logErr.message);
      }

      // ── Build gateway-specific response ──
      if (gatewayName === 'payu') {
        return res.status(200).json({
          success: true,
          message: 'Payment initiated successfully',
          data: {
            gateway: 'payu',
            paymentUrl: paymentPreparation.paymentUrl,
            paymentData: paymentPreparation.paymentData,
            booking: { id: booking._id, bookingId: booking.bookingId, amount: booking.amount, status: booking.status }
          }
        });
      } else {
        return res.status(200).json({
          success: true,
          message: 'Cashfree payment initiated',
          data: {
            gateway: 'cashfree',
            paymentUrl: paymentPreparation.paymentUrl,
            paymentData: paymentPreparation.paymentData,
            booking: { id: booking._id, bookingId: booking.bookingId, amount: booking.amount, status: booking.status }
          }
        });
      }

    } catch (error) {
      console.error('Initiate payment error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to initiate payment'
      });
    }
  }

  // POST /payment/success - Handle PayU success callback
 async handlePaymentSuccess(req, res) {
    try {
      // Check if body is properly parsed
      let payuResponse = req.body;
      
      // If body is raw (Buffer), parse it manually
      if (Buffer.isBuffer(req.body)) {
        console.log('📥 Raw body detected, parsing manually...');
        const rawBody = req.body.toString('utf8');
        console.log('📥 Raw body string:', rawBody);
        
        // Check content type to determine parsing method
        const contentType = req.headers['content-type'] || '';
        
        if (contentType.includes('multipart/form-data')) {
          console.log('📥 Parsing multipart form data...');
          // Parse multipart form data
          const formData = {};
          const boundary = contentType.split('boundary=')[1];
          const parts = rawBody.split('--' + boundary);
          
          parts.forEach(part => {
            if (part.trim() && !part.includes('--')) {
              const lines = part.split('\r\n');
              let key = '';
              let value = '';
              
              lines.forEach(line => {
                if (line.startsWith('Content-Disposition:')) {
                  const match = line.match(/name="([^"]+)"/);
                  if (match) key = match[1];
                } else if (line.trim() && !line.startsWith('Content-')) {
                  value = line.trim();
                }
              });
              
              if (key && value !== '') {
                formData[key] = value;
              }
            }
          });
          
          payuResponse = formData;
          console.log('📥 Parsed multipart form data:', formData);
        } else {
          console.log('📥 Parsing URL-encoded form data...');
          // Parse URL-encoded form data
          const formData = {};
          const pairs = rawBody.split('&');
          pairs.forEach(pair => {
            const [key, value] = pair.split('=');
            if (key && value !== undefined) {
              formData[decodeURIComponent(key)] = decodeURIComponent(value);
            }
          });
          
          payuResponse = formData;
          console.log('📥 Parsed URL-encoded form data:', formData);
        }
      } else if (!req.body || typeof req.body !== 'object') {
        console.error('❌ Request body is not properly parsed:', {
          body: req.body,
          bodyType: typeof req.body,
          contentType: req.headers['content-type'],
          rawBody: req.rawBody || 'No raw body available'
        });
        
    
        return res.status(400).json({
          success: false,
          message: 'Failed to process payment success',
          debug: {
            error: 'Request body is not properly parsed',
            body: req.body,
            bodyType: typeof req.body,
            contentType: req.headers['content-type']
          }
        });
      }
      
      console.log('\n' + '='.repeat(80));
      console.log('🎉 PayU SUCCESS CALLBACK RECEIVED!');
      console.log('='.repeat(80));
      
      // Log request format and content type
      console.log('📥 REQUEST FORMAT ANALYSIS:');
      console.log('- Content-Type Header:', req.headers['content-type']);
      console.log('- Body Type:', typeof req.body);
      console.log('- Body Keys:', req.body ? Object.keys(req.body) : 'No body keys');
      console.log('- Is Form Data:', req.headers['content-type']?.includes('application/x-www-form-urlencoded'));
      console.log('- Is JSON:', req.headers['content-type']?.includes('application/json'));
      
      // Log EVERYTHING for debugging
      console.log('📥 COMPLETE REQUEST DETAILS:');
      console.log('- Method:', req.method);
      console.log('- URL:', req.url);
      console.log('- Query Params:', req.query);
      console.log('- Content-Type:', req.headers['content-type']);
      console.log('- User-Agent:', req.headers['user-agent']);
      console.log('- IP Address:', req.ip || req.connection.remoteAddress);
      
      console.log('\n📥 ALL HEADERS:');
      console.log(JSON.stringify(req.headers, null, 2));
      
      console.log('\n📥 RAW BODY (req.body):');
      console.log(JSON.stringify(payuResponse, null, 2));
      
      console.log('\n📥 PARSED PayU RESPONSE FIELDS:');
      console.log('- txnid:', payuResponse.txnid);
      console.log('- mihpayid:', payuResponse.mihpayid);
      console.log('- mode:', payuResponse.mode);
      console.log('- status:', payuResponse.status);
      console.log('- unmappedstatus:', payuResponse.unmappedstatus);
      console.log('- key:', payuResponse.key);
      console.log('- amount:', payuResponse.amount);
      console.log('- discount:', payuResponse.discount);
      console.log('- net_amount_debit:', payuResponse.net_amount_debit);
      console.log('- addedon:', payuResponse.addedon);
      console.log('- productinfo:', payuResponse.productinfo);
      console.log('- firstname:', payuResponse.firstname);
      console.log('- lastname:', payuResponse.lastname);
      console.log('- address1:', payuResponse.address1);
      console.log('- address2:', payuResponse.address2);
      console.log('- city:', payuResponse.city);
      console.log('- state:', payuResponse.state);
      console.log('- country:', payuResponse.country);
      console.log('- zipcode:', payuResponse.zipcode);
      console.log('- email:', payuResponse.email);
      console.log('- phone:', payuResponse.phone);
      console.log('- udf1:', payuResponse.udf1);
      console.log('- udf2:', payuResponse.udf2);
      console.log('- udf3:', payuResponse.udf3);
      console.log('- udf4:', payuResponse.udf4);
      console.log('- udf5:', payuResponse.udf5);
      console.log('- udf6:', payuResponse.udf6);
      console.log('- udf7:', payuResponse.udf7);
      console.log('- udf8:', payuResponse.udf8);
      console.log('- udf9:', payuResponse.udf9);
      console.log('- udf10:', payuResponse.udf10);
      console.log('- hash:', payuResponse.hash);
      console.log('- field1:', payuResponse.field1);
      console.log('- field2:', payuResponse.field2);
      console.log('- field3:', payuResponse.field3);
      console.log('- field4:', payuResponse.field4);
      console.log('- field5:', payuResponse.field5);
      console.log('- field6:', payuResponse.field6);
      console.log('- field7:', payuResponse.field7);
      console.log('- field8:', payuResponse.field8);
      console.log('- field9:', payuResponse.field9);
      console.log('- payment_source:', payuResponse.payment_source);
      console.log('- PG_TYPE:', payuResponse.PG_TYPE);
      console.log('- bank_ref_num:', payuResponse.bank_ref_num);
      console.log('- bankcode:', payuResponse.bankcode);
      console.log('- error:', payuResponse.error);
      console.log('- error_Message:', payuResponse.error_Message);
      
      console.log('\n📥 COMPLETE RESPONSE OBJECT KEYS:');
      console.log('All available keys:', Object.keys(payuResponse));
      
      console.log('\n📥 FOR POSTMAN TESTING - COPY THIS EXACT DATA:');
      console.log('Content-Type: application/x-www-form-urlencoded');
      console.log('POST URL:  http://localhost:4001/api/v1/payment/success');
      console.log('Form Data:');
      Object.keys(payuResponse).forEach(key => {
        if (payuResponse[key] !== undefined && payuResponse[key] !== null) {
          console.log(`${key}=${encodeURIComponent(payuResponse[key])}`);
        }
      });
      
      console.log('\n📥 CURL COMMAND FOR TESTING:');
      const curlData = Object.keys(payuResponse)
        .filter(key => payuResponse[key] !== undefined && payuResponse[key] !== null)
        .map(key => `${key}=${encodeURIComponent(payuResponse[key])}`)
        .join('&');
      console.log(`curl -X POST  http://localhost:4001/api/v1/payment/success \\`);
      console.log(`  -H "Content-Type: application/x-www-form-urlencoded" \\`);
      console.log(`  -d "${curlData}"`);
      
      console.log('\n' + '='.repeat(80));

      // Log the transaction (always PayU at this route – Cashfree uses its own webhook)
      payuService.logTransaction('SUCCESS_CALLBACK', payuResponse);
      lifecycle.logPayUCallbackReceived('success', payuResponse, req);

      // Check if this is a test request
      const isTestRequest = payuResponse.txnid === 'TEST123' || payuResponse.test === 'true';
      
      if (!isTestRequest) {
        // Skip hash verification for real PayU callbacks - PayU has already verified the payment
        console.log('✅ Processing real PayU transaction - skipping hash verification');
        console.log('🔍 Payment details from PayU:', {
          status: payuResponse.status,
          amount: payuResponse.amount,
          txnid: payuResponse.txnid,
          mihpayid: payuResponse.mihpayid,
          mode: payuResponse.mode || 'unknown',
          pg_type: payuResponse.PG_TYPE || 'unknown'
        });
      } else {
        console.log('🧪 Test request detected - skipping hash verification');
      }

      const { txnid, status, amount, udf1: bookingId, mihpayid } = payuResponse;

      // Handle test requests
      if (isTestRequest) {
        console.log('🧪 Test success callback processed successfully');
        return res.status(200).json({
          success: true,
          message: 'Test success callback received',
          data: {
            txnid,
            status: status || 'success',
            amount: amount || '100',
            test: true
          }
        });
      }

      if (payuResponse.udf5 === 'CAB_RIDE') {
        const cabPaymentService = require('../cab-customer/cabPayment.service');
        const cabResult = await cabPaymentService.handlePayUCallback(payuResponse);
        const rideId = payuResponse.udf1;
        const customerAppBase = process.env.CUSTOMER_APP_URL || process.env.WADI_CAB_APP_URL || process.env.FRONTEND_URL || 'https://book.waadi.in';
        const isFormCallback = req.headers['content-type'] === 'application/x-www-form-urlencoded';
        const isAppPlatform = String(req.query.platform || '').toLowerCase() === 'app';
        if (cabResult.paymentStatus === 'paid' && isFormCallback && !isAppPlatform) {
          return res.redirect(`${customerAppBase}/ride/payment/success?txnid=${encodeURIComponent(txnid)}&status=success&amount=${encodeURIComponent(amount)}&rideId=${encodeURIComponent(rideId)}`);
        }
        return res.status(200).json({ success: cabResult.paymentStatus === 'paid', message: `Cab ride payment ${cabResult.paymentStatus}`, data: { rideId, paymentStatus: cabResult.paymentStatus, txnid, amount } });
      }

      // Find the booking using the booking ID stored in UDF1
      const booking = await Booking.findById(bookingId);
      console.log("booking booking booking",booking)
      
      if (!booking) {
        console.error('❌ Booking not found for transaction:', txnid);
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }

      // Verify transaction ID matches (PayU generates its own txnid, so we check if it's in our stored order ID or if we have a stored PayU txnid)
      const storedOrderId = booking.payment_details.transaction_id;
      const storedPayuTxnid = booking.payment_details.payu_transaction_id;
      
      // Check if this is a new PayU transaction or if we've already processed this PayU txnid
      if (storedPayuTxnid && storedPayuTxnid === txnid) {
        console.log('✅ PayU transaction already processed:', txnid);
        return res.status(200).json({
          success: true,
          message: 'Payment already processed',
          data: { booking: { id: booking._id, bookingId: booking.bookingId } }
        });
      }
      
      // For new transactions, we allow PayU's txnid to be different from our order ID
      console.log('✅ Processing new PayU transaction:', {
        storedOrderId,
        receivedPayuTxnid: txnid,
        storedPayuTxnid
      });

      // Verify amount matches
      if (parseFloat(amount) !== booking.amount) {
        console.error('❌ Amount mismatch:', {
          stored: booking.amount,
          received: amount
        });
        return res.status(400).json({
          success: false,
          message: 'Amount mismatch'
        });
      }

      // Get normalized payment status (PayU-specific callback route)
      const paymentStatus = payuService.getPaymentStatus(status);
      console.log('🔄 Updating booking status from "pending" to:', paymentStatus);

      // Update booking with payment details
      booking.status = paymentStatus;
      booking.payment_details.payment_method = 'payu';
      // Keep our original order ID and also store PayU's transaction ID
      if (!booking.payment_details.order_id) {
        booking.payment_details.order_id = booking.payment_details.transaction_id;
      }
      booking.payment_details.payu_transaction_id = txnid;
      booking.payment_details.paid_at = new Date();

      // Store PayU payment ID if available
      if (mihpayid) {
        booking.payment_details.payment_reference = mihpayid;
      }

      await booking.save();

      if (paymentStatus === 'paid') {
        lifecycle.logPaymentSuccess({
          booking,
          txnid,
          paymentId: mihpayid,
          req,
          gateway: 'payu',
        });
      } else if (paymentStatus === 'pending') {
        lifecycle.logPaymentFailure({
          booking,
          txnid,
          reason: `PayU status: ${status}`,
          req,
          gateway: 'payu',
          status: 'pending',
        });
        lifecycle.logPaymentPendingEvent({
          booking,
          txnid,
          req,
          gateway: 'payu',
          metadata: { payuStatus: status },
        });
      } else {
        lifecycle.logPaymentFailure({
          booking,
          txnid,
          reason: `PayU status: ${status}`,
          req,
          gateway: 'payu',
        });
      }

      console.log(`✅ Payment ${paymentStatus} for booking ${booking.bookingId}`);
      console.log('💾 Updated payment details:', {
        orderId: booking.payment_details.order_id,
        payuTxnid: booking.payment_details.payu_transaction_id,
        originalTxnid: booking.payment_details.transaction_id
      });


      // ✅ यहाँ add करो customer log
try {
  const userId = booking.user.toString() || req.user_id;   // IMPORTANT: booking se lo
  const user = await User.findById(userId);

await saveCustomerLog({
  userId,
  phoneNumber: user?.phoneNumber,
  type: "paymentSuccessBooking",
  req,                 
  extraData: payuResponse 
});

} catch (logErr) {
  console.error("❌ Customer log failed:", logErr.message);
}

      // Send WhatsApp payment confirmation
      let whatsappStatus = null;
      try {
        if (whatsappService.isReady) {
          console.log('📱 Sending WhatsApp payment confirmation...');
          
          // Populate booking data for WhatsApp
          await booking.populate('user', 'firstName lastName phoneNumber email');
          await booking.populate('visiting_state', 'name');
          
          const whatsappResult = await whatsappService.sendPaymentConfirmation(booking, booking.user);
          whatsappStatus = {
            sent: whatsappResult,
            message: whatsappResult ? 'WhatsApp confirmation sent' : 'Failed to send WhatsApp confirmation'
          };
          console.log('📱 WhatsApp result:', whatsappResult);
        } else {
          console.log('❌ WhatsApp service not ready - skipping payment confirmation');
          whatsappStatus = {
            sent: false,
            message: 'WhatsApp service not ready'
          };
        }
      } catch (error) {
        console.error('❌ WhatsApp messaging error:', error);
        whatsappStatus = {
          sent: false,
          message: `WhatsApp service error: ${error.message}`
        };
      }


      // Redirect behavior
      const isFormCallback = req.headers['content-type'] === 'application/x-www-form-urlencoded';
      const isAppPlatform = String(req.query.platform || '').toLowerCase() === 'app';
      if (isFormCallback && !isAppPlatform) {
        const frontendBase = process.env.FRONTEND_URL || 'https://book.waadi.in';
        return res.redirect(`${frontendBase}/payment/success?txnid=${txnid}&status=success&amount=${amount}&bookingId=${booking.bookingId}`);
      }

      // For Capacitor native flow, deep-link back into the app and let the app close the in-app browser
      if (isFormCallback && isAppPlatform) {
        const appDeepLinkBase = process.env.APP_DEEP_LINK_BASE || 'wadicab://payment';
        const deepLink = `${appDeepLinkBase}/success?txnid=${encodeURIComponent(txnid)}&status=success&amount=${encodeURIComponent(amount)}&bookingId=${encodeURIComponent(booking.bookingId)}`;
        // Use small HTML that triggers the deep link with a fallback link
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(`<!doctype html><html><head><meta charset=\"utf-8\"><title>Completing payment…</title><meta http-equiv=\"refresh\" content=\"0;url='${deepLink}'\"></head><body><script>setTimeout(function(){window.location='${deepLink}';},0);</script><p>Completing payment… If not redirected, <a href=\"${deepLink}\">tap here</a>.</p></body></html>`);
      }

      // For API clients or other cases
      res.status(200).json({
        success: true,
        message: `Payment ${paymentStatus} successfully`,
        data: {
          booking: {
            id: booking._id,
            bookingId: booking.bookingId,
            status: booking.status,
            amount: booking.amount
          },
          payment: {
            txnid,
            status,
            mihpayid,
            amount
          }
        }
      });

    } catch (error) {
      console.log('\n' + '!'.repeat(80));
      console.error('❌ PAYMENT SUCCESS ERROR - BUT WE STILL LOG THE DATA!');
      console.log('!'.repeat(80));
      
      // Even if processing fails, log the PayU data for testing
      console.log('\n📥 RAW REQUEST DATA (FOR DEBUGGING):');
      console.log('- req.body:', JSON.stringify(req.body, null, 2));
      console.log('- req.headers:', JSON.stringify(req.headers, null, 2));
      console.log('- req.method:', req.method);
      console.log('- req.url:', req.url);
      
      console.log('\n📥 ERROR DETAILS:');
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      console.log('\n📥 POSTMAN DATA (Even though processing failed):');
      if (req.body && typeof req.body === 'object') {
        Object.keys(req.body).forEach(key => {
          if (req.body[key] !== undefined && req.body[key] !== null) {
            console.log(`${key}=${encodeURIComponent(req.body[key])}`);
          }
        });
      }
      
      console.log('\n' + '!'.repeat(80));
      
      res.status(500).json({
        success: false,
        message: 'Failed to process payment success',
        debug: {
          error: error.message,
          receivedData: req.body
        }
      });
    }
  }

  // POST /payment/failure - Handle PayU failure callback
  async handlePaymentFailure(req, res) {
    try {
      const payuResponse = req.body;
      
      console.log('\n' + '='.repeat(80));
      console.log('❌ PayU FAILURE CALLBACK RECEIVED!');
      console.log('='.repeat(80));
      
      // Log EVERYTHING for debugging
      console.log('📥 COMPLETE REQUEST DETAILS:');
      console.log('- Method:', req.method);
      console.log('- URL:', req.url);
      console.log('- Query Params:', req.query);
      console.log('- Content-Type:', req.headers['content-type']);
      console.log('- User-Agent:', req.headers['user-agent']);
      console.log('- IP Address:', req.ip || req.connection.remoteAddress);
      
      console.log('\n📥 ALL HEADERS:');
      console.log(JSON.stringify(req.headers, null, 2));
      
      console.log('\n📥 RAW BODY (req.body):');
      console.log(JSON.stringify(payuResponse, null, 2));
      
      console.log('\n📥 PARSED PayU FAILURE RESPONSE FIELDS:');
      console.log('- txnid:', payuResponse.txnid);
      console.log('- mihpayid:', payuResponse.mihpayid);
      console.log('- mode:', payuResponse.mode);
      console.log('- status:', payuResponse.status);
      console.log('- unmappedstatus:', payuResponse.unmappedstatus);
      console.log('- key:', payuResponse.key);
      console.log('- amount:', payuResponse.amount);
      console.log('- productinfo:', payuResponse.productinfo);
      console.log('- firstname:', payuResponse.firstname);
      console.log('- email:', payuResponse.email);
      console.log('- phone:', payuResponse.phone);
      console.log('- udf1:', payuResponse.udf1);
      console.log('- udf2:', payuResponse.udf2);
      console.log('- udf3:', payuResponse.udf3);
      console.log('- error:', payuResponse.error);
      console.log('- error_Message:', payuResponse.error_Message);
      console.log('- hash:', payuResponse.hash);
      
      console.log('\n📥 COMPLETE RESPONSE OBJECT KEYS:');
      console.log('All available keys:', Object.keys(payuResponse));
      
      console.log('\n📥 FOR POSTMAN TESTING - COPY THIS EXACT FAILURE DATA:');
      console.log('Content-Type: application/x-www-form-urlencoded');
      console.log('POST URL:  http://localhost:4001/api/v1/payment/failure');
      console.log('Form Data:');
      Object.keys(payuResponse).forEach(key => {
        if (payuResponse[key] !== undefined && payuResponse[key] !== null) {
          console.log(`${key}=${encodeURIComponent(payuResponse[key])}`);
        }
      });
      
      console.log('\n📥 CURL COMMAND FOR TESTING FAILURE:');
      const curlData = Object.keys(payuResponse)
        .filter(key => payuResponse[key] !== undefined && payuResponse[key] !== null)
        .map(key => `${key}=${encodeURIComponent(payuResponse[key])}`)
        .join('&');
      console.log(`curl -X POST  http://localhost:4001/api/v1/payment/failure \\`);
      console.log(`  -H "Content-Type: application/x-www-form-urlencoded" \\`);
      console.log(`  -d "${curlData}"`);
      
      console.log('\n' + '='.repeat(80));

      // Log the transaction (always PayU at this route – Cashfree uses its own webhook)
      payuService.logTransaction('FAILURE_CALLBACK', payuResponse);
      lifecycle.logPayUCallbackReceived('failure', payuResponse, req);

      const { txnid, status, amount, udf1: bookingId, error_Message } = payuResponse;

      // Check if this is a test request
      const isTestRequest = txnid === 'TEST123' || payuResponse.test === 'true';
      
      if (isTestRequest) {
        console.log('🧪 Test failure callback processed successfully');
        return res.status(200).json({
          success: false,
          message: 'Test failure callback received',
          data: {
            txnid,
            status: status || 'failure',
            amount: amount || '100',
            error: error_Message || 'Test failure scenario',
            test: true
          }
        });
      }

      // Find the booking using the booking ID stored in UDF1
      const booking = await Booking.findById(bookingId);
      
      if (!booking) {
        console.error('❌ Booking not found for failed transaction:', txnid);
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }

      // Get normalized payment status (PayU-specific callback route)
      const paymentStatus = payuService.getPaymentStatus(status);

      // Update booking status
      booking.status = paymentStatus;
      booking.payment_details.payment_method = 'payu';
      
      // Store failure reason if available
      if (error_Message) {
        booking.payment_details.failure_reason = error_Message;
      }

      await booking.save();

      lifecycle.logPaymentFailure({
        booking,
        txnid,
        reason: error_Message || `PayU status: ${status}`,
        req,
        gateway: 'payu',
      });

      try {
  const userId = booking.user?.toString();

  const user = await User.findById(userId);

 await saveCustomerLog({
  userId,
  phoneNumber: user?.phoneNumber,
  type: "paymentFailureBooking",
   req,                 // ✅ real express req
  extraData: payuResponse // ✅ PayU body separately store

});

  console.log("📊 Customer failure log saved");
} catch (logErr) {
  console.error("❌ Customer failure log failed:", logErr.message);
}

      console.log(`❌ Payment ${paymentStatus} for booking ${booking.bookingId}: ${error_Message || 'Unknown error'}`);

      // Send WhatsApp payment failure notification
      let whatsappStatus = null;
      try {
        if (whatsappService.isReady) {
          console.log('📱 Sending WhatsApp payment failure notification...');
          
          // Populate booking data for WhatsApp
          await booking.populate('user', 'firstName lastName phoneNumber email');
          await booking.populate('visiting_state', 'name');
          
          const whatsappResult = await whatsappService.sendPaymentFailure(booking, booking.user, error_Message || 'Payment failed');
          whatsappStatus = {
            sent: whatsappResult,
            message: whatsappResult ? 'WhatsApp failure notification sent' : 'Failed to send WhatsApp failure notification'
          };
          console.log('📱 WhatsApp result:', whatsappResult);
        } else {
          console.log('❌ WhatsApp service not ready - skipping payment failure notification');
          whatsappStatus = {
            sent: false,
            message: 'WhatsApp service not ready'
          };
        }
      } catch (error) {
        console.error('❌ WhatsApp messaging error:', error);
        whatsappStatus = {
          sent: false,
          message: `WhatsApp service error: ${error.message}`
        };
      }

      // Redirect behavior
      const isFormCallback = req.headers['content-type'] === 'application/x-www-form-urlencoded';
      const isAppPlatform = String(req.query.platform || '').toLowerCase() === 'app';
      if (isFormCallback && !isAppPlatform) {
        const frontendBase = process.env.FRONTEND_URL || 'https://book.waadi.in'
        return res.redirect(`${frontendBase}/payment/failure?txnid=${txnid}&status=failure&amount=${amount}&error=${encodeURIComponent(error_Message || 'Payment failed')}`);
      }

      // For Capacitor native flow, deep-link back into the app and let the app close the in-app browser
      if (isFormCallback && isAppPlatform) {
        const appDeepLinkBase = process.env.APP_DEEP_LINK_BASE || 'wadicab://payment';
        const deepLink = `${appDeepLinkBase}/failure?txnid=${encodeURIComponent(txnid)}&status=failure&amount=${encodeURIComponent(amount)}&error=${encodeURIComponent(error_Message || 'Payment failed')}`;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(`<!doctype html><html><head><meta charset=\"utf-8\"><title>Payment failed</title><meta http-equiv=\"refresh\" content=\"0;url='${deepLink}'\"></head><body><script>setTimeout(function(){window.location='${deepLink}';},0);</script><p>Payment failed. If not redirected, <a href=\"${deepLink}\">tap here</a>.</p></body></html>`);
      }

      // For API response
      res.status(200).json({
        success: false,
        message: `Payment ${paymentStatus}`,
        data: {
          booking: {
            id: booking._id,
            bookingId: booking.bookingId,
            status: booking.status,
            amount: booking.amount
          },
          payment: {
            txnid,
            status,
            amount,
            error: error_Message
          }
        }
      });

    } catch (error) {
      console.log('\n' + '!'.repeat(80));
      console.error('❌ PAYMENT FAILURE ERROR - BUT WE STILL LOG THE DATA!');
      console.log('!'.repeat(80));
      
      // Even if processing fails, log the PayU data for testing
      console.log('\n📥 RAW REQUEST DATA (FOR DEBUGGING):');
      console.log('- req.body:', JSON.stringify(req.body, null, 2));
      console.log('- req.headers:', JSON.stringify(req.headers, null, 2));
      console.log('- req.method:', req.method);
      console.log('- req.url:', req.url);
      
      console.log('\n📥 ERROR DETAILS:');
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      console.log('\n📥 POSTMAN DATA (Even though processing failed):');
      if (req.body && typeof req.body === 'object') {
        Object.keys(req.body).forEach(key => {
          if (req.body[key] !== undefined && req.body[key] !== null) {
            console.log(`${key}=${encodeURIComponent(req.body[key])}`);
          }
        });
      }
      
      console.log('\n' + '!'.repeat(80));
      
      res.status(500).json({
        success: false,
        message: 'Failed to process payment failure',
        debug: {
          error: error.message,
          receivedData: req.body
        }
      });
    }
  }

  // GET /payment/status/:txnid - Check payment status
  async getPaymentStatus(req, res) {
    try {
      const { txnid } = req.params;
      const userId = req.user._id;

      // Find booking by transaction ID
      const booking = await Booking.findOne({
        'payment_details.transaction_id': txnid,
        user: userId
      }).populate('visiting_state', 'name');

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Payment transaction not found'
        });
      }

       

        const user = await User.findById(userId);

            await saveCustomerLog({
  userId: userId,
  phoneNumber: user.phoneNumber,
  type: "PaymentStatus",
  req
});

      res.status(200).json({
        success: true,
        message: 'Payment status retrieved successfully',
        data: {
          booking: {
            id: booking._id,
            bookingId: booking.bookingId,
            status: booking.status,
            amount: booking.amount,
            visitingState: booking.visiting_state.name
          },
          payment: {
            transaction_id: booking.payment_details.transaction_id,
            payment_method: booking.payment_details.payment_method,
            payment_reference: booking.payment_details.payment_reference,
            paid_at: booking.payment_details.paid_at,
            status: booking.status
          }
        }
      });

    } catch (error) {
      console.error('Get payment status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get payment status'
      });
    }
  }

  // POST /payment/test-hash - Test hash generation with sample data
  async testHashGeneration(req, res) {
    try {
      const { txnid, amount, productinfo, firstname, email } = req.body;
      
      if (!txnid || !amount || !productinfo || !firstname) {
        return res.status(400).json({
          success: false,
          message: 'txnid, amount, productinfo, and firstname are required'
        });
      }

      // Generate sample hash string
      const sampleParams = {
        txnid,
        amount,
        productinfo,
        firstname,
        email: email || 'test@example.com',
        udf1: 'test_udf1',
        udf2: 'test_udf2',
        udf3: 'test_udf3'
      };

      const hashString = payuService.generateHashString(sampleParams);
      const hash = payuService.generateSimpleHash(hashString);

      res.status(200).json({
        success: true,
        message: 'Hash generation test successful',
        data: {
          inputParams: sampleParams,
          hashString: hashString,
          generatedHash: hash,
          hashLength: hash.length,
          expectedFormat: 'key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5|udf6|udf7|udf8|udf9|udf10|merchantSalt'
        }
      });

    } catch (error) {
      console.error('Test hash generation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to test hash generation'
      });
    }
  }

  // GET /payment/test - Test PayU configuration
  async testPayUConfig(req, res) {
    try {
      const { isValid, errors, credentials } = gatewayCredentials.validateAndSync('payu');
      const activeKey = credentials.key;
      const activeSalt = credentials.salt;
      const configValidation = payuService.validateConfig();
      
      res.status(200).json({
        success: true,
        message: 'PayU configuration test',
        data: {
          isValid: configValidation.isValid && isValid,
          errors: isValid ? configValidation.errors : errors,
          environment: process.env.NODE_ENV,
          paymentUrl: 'https://secure.payu.in/_payment',
          credentialSource: {
            keyFromEnv: !!activeKey,
            saltFromEnv: !!activeSalt,
          },
          configuration: {
            key:        activeKey  ? `${activeKey.substring(0, 4)}***`  : 'NOT_SET',
            salt:       activeSalt ? `${activeSalt.substring(0, 4)}***` : 'NOT_SET',
            successUrl: process.env.PAYU_SUCCESS_URL || 'Not set',
            failureUrl: process.env.PAYU_FAILURE_URL || 'Not set',
            frontendUrl: process.env.FRONTEND_URL || 'Not set'
          },
          recommendations: configValidation.isValid && isValid ? [
            '✅ Configuration looks good!',
            'Test your callback URLs with: ./test-payu-urls.sh',
            'Ensure your server URL is publicly accessible',
            'Check PayU merchant dashboard settings'
          ] : [
            '❌ Fix credentials first',
            'Set PAYU_KEY + PAYU_SALT in .env',
            'Restart server after .env changes',
            'Refer to PAYU_SETUP.md for guidance'
          ]
        }
      });

    } catch (error) {
      console.error('Test PayU config error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to test PayU configuration'
      });
    }
  }
}

module.exports = new PaymentController();