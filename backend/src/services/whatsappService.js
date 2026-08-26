const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const path = require('path');
const fs = require('fs');

function resolveChromeExecutable() {
  const fromEnv = process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_PATH;
  if (fromEnv && fs.existsSync(fromEnv)) return fromEnv;

  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ];

  return candidates.find((candidate) => candidate && fs.existsSync(candidate)) || null;
}

class WhatsAppService {
  constructor() {
    this.client = null;
    this.isReady = false;
    this.isConnected = false;
    this.qrCode = null;
    this.sessionPath = path.join(__dirname, '../sessions');
    this.lastStatus = null;
  }

  async initialize() {
    try {
      if (process.env.WHATSAPP_ENABLED === 'false') {
        console.log('ℹ️ WhatsApp service disabled (WHATSAPP_ENABLED=false)');
        return false;
      }

      console.log('🔄 Initializing WhatsApp Web client...');

      const executablePath = resolveChromeExecutable();
      if (executablePath) {
        console.log('🌐 WhatsApp using browser:', executablePath);
      } else {
        console.warn('⚠️ No local Chrome/Edge found — WhatsApp Web may fail until Chrome is installed');
      }

      // Create client with LocalAuth for session persistence
      this.client = new Client({
        authStrategy: new LocalAuth({
          clientId: "wadi-cab-bot",
          dataPath: this.sessionPath
        }),
        puppeteer: {
          headless: true,
          ...(executablePath ? { executablePath } : {}),
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-software-rasterizer',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
          ]
        }
      });

      // QR Code event
      this.client.on('qr', (qr) => {
        console.log('📱 QR Code received');
        this.qrCode = qr;
        // Display QR code in terminal
        // qrcode.generate(qr, { small: true });
      });

      // Ready event
      this.client.on('ready', () => {
        console.log('✅ WhatsApp client is ready!');
        this.isReady = true;
        this.isConnected = true;
        this.qrCode = null; // Clear QR code when ready
      });

      // Authentication success
      this.client.on('authenticated', () => {
        console.log('🔐 WhatsApp authentication successful');
      });

      // Authentication failure
      this.client.on('auth_failure', (msg) => {
        console.error('❌ WhatsApp authentication failed:', msg);
        this.isReady = false;
        this.isConnected = false;
      });

      // Disconnected event
      this.client.on('disconnected', (reason) => {
        console.log('🔌 WhatsApp client disconnected:', reason);
        this.isReady = false;
        this.isConnected = false;
      });

      // Message event (for receiving messages)
      this.client.on('message', (message) => {
        console.log('📨 Received message:', message.body);
        // Handle incoming messages if needed
      });

      // Initialize the client
      await this.client.initialize();
      console.log('✅ WhatsApp client initialized successfully');
      return true;

    } catch (error) {
      console.error('❌ Error initializing WhatsApp client:', error);
      return false;
    }
  }

  async sendMessage(phoneNumber, message) {
    if (!this.client || !this.isReady) {
      console.error('❌ WhatsApp client not ready');
      return false;
    }

    try {
      // Format phone number (add country code if not present)
      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      
      if (!formattedNumber) {
        console.error('❌ Invalid phone number format');
        return false;
      }

      console.log(`📤 Sending message to ${formattedNumber}`);
      console.log(`📱 Message: ${message.substring(0, 100)}...`);

      const result = await this.client.sendMessage(formattedNumber, message);
      
      if (result) {
        console.log('✅ Message sent successfully');
        return true;
      } else {
        console.error('❌ Failed to send message');
        return false;
      }
    } catch (error) {
      console.error('❌ Error sending message:', error);
      return false;
    }
  }

  formatPhoneNumber(phoneNumber) {
    if (!phoneNumber) {
      console.error('❌ Phone number is empty');
      return null;
    }
    
    // Remove any non-digit characters
    let cleaned = phoneNumber.toString().replace(/\D/g, '');
    
    console.log(`📱 Formatting phone number: ${phoneNumber} -> ${cleaned}`);
    
    // If number starts with 0, replace with country code
    if (cleaned.startsWith('0')) {
      cleaned = '91' + cleaned.substring(1);
    }
    
    // If number doesn't start with country code, add it
    if (!cleaned.startsWith('91')) {
      cleaned = '91' + cleaned;
    }
    
    // Validate the final number
    if (cleaned.length < 12 || cleaned.length > 13) {
      console.error(`❌ Invalid phone number length: ${cleaned} (${cleaned.length} digits)`);
      return null;
    }
    
    // Add @c.us suffix for WhatsApp
    const formattedNumber = cleaned + '@c.us';
    console.log(`📱 Final formatted number: ${formattedNumber}`);
    
    return formattedNumber;
  }

  createBookingConfirmationMessage(booking, user) {
    const bookingDate = new Date(booking.createdAt).toLocaleDateString('en-IN');
    const fromDate = booking.tax_from_date ? new Date(booking.tax_from_date).toLocaleDateString('en-IN') : 'Not specified';
    const toDate = booking.tax_upto_date ? new Date(booking.tax_upto_date).toLocaleDateString('en-IN') : 'Not specified';
    
    return `🎉 *Booking Confirmation - Wadi Cab*

*Booking ID:* ${booking.bookingId}
*Customer:* ${user.firstName} ${user.lastName}
*Phone:* ${user.phoneNumber}

*Vehicle Details:*
• Vehicle Number: ${booking.vehicle_number}
• Seat Capacity: ${booking.seat_capacity || 'Not specified'}

*Tax Details:*
• Visiting State: ${booking.visiting_state.name}
• Tax Mode: ${booking.tax_mode}
• From Date: ${fromDate}
• To Date: ${toDate}
• Amount: ₹${booking.amount.toLocaleString()}

*Booking Status:* ${booking.status.toUpperCase()}

*Booking Date:* ${bookingDate}

Thank you for choosing Wadi Cab! 🚗✨

For any queries, please contact our support team.

*Wadi Cab Team*`;
  }

  createPaymentSuccessMessage(booking, user) {
    const paymentDate = new Date().toLocaleDateString('en-IN');
    
    return `✅ *Payment Confirmed - Wadi Cab*

Dear ${user.firstName},

Your payment for booking (ID: ${booking.bookingId}) has been successfully processed.

*Payment Details:*
• Amount Paid: ₹${booking.amount.toLocaleString()}
• Payment Date: ${paymentDate}
• Transaction ID: ${booking.payment_details?.transaction_id || 'N/A'}

Your booking is now active! 🎉
We're preparing your border tax pass. You will receive the PDF in 7–10 minutes.

Thank you for choosing Wadi Cab!

*Wadi Cab Team*`;
  }

  createPaymentFailureMessage(booking, user, errorMessage = 'Payment failed') {
    return `❌ *Payment Failed - Wadi Cab*

Dear ${user.firstName},

Your payment for booking (ID: ${booking.bookingId}) could not be processed.

*Booking Details:*
• Amount: ₹${booking.amount.toLocaleString()}
• Vehicle Number: ${booking.vehicle_number}
• Visiting State: ${booking.visiting_state.name}

*Error:* ${errorMessage}

Please try again or contact our support team for assistance.

*Wadi Cab Team*`;
  }

  async sendBookingConfirmation(booking, user) {
    if (!this.isReady || !this.client) {
      console.error('❌ WhatsApp client not ready');
      return false;
    }

    try {
      const phoneNumber = this.formatPhoneNumber(user.phoneNumber);
      const message = this.createBookingConfirmationMessage(booking, user);
      
      console.log(`📤 Sending booking confirmation to ${phoneNumber}`);
      
      const result = await this.sendMessage(phoneNumber, message);
      
      if (result) {
        console.log('✅ Booking confirmation sent successfully');
        return true;
      } else {
        console.error('❌ Failed to send booking confirmation');
        return false;
      }
    } catch (error) {
      console.error('❌ Error sending booking confirmation:', error);
      return false;
    }
  }

  async sendPaymentConfirmation(booking, user) {
    if (!this.isReady || !this.client) {
      console.error('❌ WhatsApp client not ready');
      return false;
    }

    try {
      const phoneNumber = this.formatPhoneNumber(user.phoneNumber);
      const message = this.createPaymentSuccessMessage(booking, user);
      
      console.log(`📤 Sending payment confirmation to ${phoneNumber}`);
      
      const result = await this.sendMessage(phoneNumber, message);
      
      if (result) {
        console.log('✅ Payment confirmation sent successfully');
        return true;
      } else {
        console.error('❌ Failed to send payment confirmation');
        return false;
      }
    } catch (error) {
      console.error('❌ Error sending payment confirmation:', error);
      return false;
    }
  }

  async sendPaymentFailure(booking, user, errorMessage) {
    if (!this.isReady || !this.client) {
      console.error('❌ WhatsApp client not ready');
      return false;
    }

    try {
      const phoneNumber = this.formatPhoneNumber(user.phoneNumber);
      const message = this.createPaymentFailureMessage(booking, user, errorMessage);
      
      console.log(`📤 Sending payment failure notification to ${phoneNumber}`);
      
      const result = await this.sendMessage(phoneNumber, message);
      
      if (result) {
        console.log('✅ Payment failure notification sent successfully');
        return true;
      } else {
        console.error('❌ Failed to send payment failure notification');
        return false;
      }
    } catch (error) {
      console.error('❌ Error sending payment failure notification:', error);
      return false;
    }
  }

  async disconnect() {
    if (this.client) {
      try {
        await this.client.destroy();
        console.log('🔌 WhatsApp client disconnected');
        this.isReady = false;
        this.isConnected = false;
      } catch (error) {
        console.error('❌ Error disconnecting WhatsApp client:', error);
      }
    }
  }

  getStatus() {
    return {
      isConnected: this.isConnected,
      isReady: this.isReady,
      qrCode: this.qrCode,
      lastStatus: this.lastStatus
    };
  }

  getQRCode() {
    return this.qrCode;
  }
}

module.exports = new WhatsAppService();
