const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

// Import routes
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const stateRoutes = require('./src/routes/stateRoutes');
const districtRoutes = require('./src/routes/districtRoutes');
const vehicleTypeRoutes = require('./src/routes/vehicleTypeRoutes');
const planRoutes = require('./src/routes/planRoutes');
const bookingRoutes = require('./src/routes/bookingRoutes');
const paymentRoutes = require('./src/routes/paymentRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const insuranceInquiryRoutes = require('./src/routes/insuranceInquiryRoutes');
const pushRoutes = require('./src/routes/pushRoutes');
const whatsappRoutes = require('./src/routes/whatsappRoutes');
const appSettingsRoutes = require('./src/routes/appSettingsRoutes');
const cabBookingRoutes = require('./src/routes/cabBookingRoutes');
const appVersionRoutes = require('./src/routes/appVersionRoutes');
const versionTrackingRoutes = require('./src/routes/versionTrackingRoutes');
const validationRoutes = require('./src/routes/validationRoutes');
const cashfreeRoutes      = require('./src/routes/cashfreeRoutes');
const gatewayAdminRoutes  = require('./src/routes/gatewayAdminRoutes');
const logRoutes           = require('./src/routes/logRoutes');
const { startCashfreeReconciliationJob } = require('./src/jobs/cashfreeReconciliation');
const gatewayCredentials = require('./src/utils/gatewayCredentials');
 
const whatsappService = require('./src/services/whatsappService');

// Import middleware
const errorHandler = require('./src/middleware/errorHandler');
const notFound = require('./src/middleware/notFound');
const correlationId = require('./src/middleware/correlationId');
const requestLogger = require('./src/middleware/requestLogger');
const { checkMaintenanceMode } = require('./src/middleware/maintenanceCheck');

const app = express();
const server = createServer(app);



// Allowed Origins
const allowedOrigins = [
  'https://localhost',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',

  'https://31.97.229.97:3000',
  'https://admin.waadi.in',
  'https://api.waadi.in',
  'https://waadi.in',

  'http://192.168.1.8:3001',
  'http://192.168.1.36:3000',
  'http://31.97.229.97:3001',
  'http://31.97.229.97:3000',
  'http://31.97.229.97:3002',

  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:3002',

  'https://31.97.229.97:3000:3001'
];


// Socket.IO
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true
  }
});


// Express CORS
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// const io = new Server(server, {
//     cors: {
//       origin: process.env.NODE_ENV === 'production' 
//         ? ['https://localhost','http://localhost:3000','https://31.97.229.97:3000','https://admin.waadi.in','https://31.97.229.97:3000','http://192.168.1.8:3001', "http://31.97.229.97:3001", "http://localhost:3001", "https://api.waadi.in", "http://192.168.1.36:3000", "http://127.0.0.1:3000", "http://127.0.0.1:3001","http://127.0.0.1:3002"]
//         : ['https://localhost','http://localhost:3000','https://31.97.229.97:3000','https://admin.waadi.in','https://31.97.229.97:3000','http://192.168.1.8:3001', "http://31.97.229.97:3001", "http://localhost:3001", "https://api.waadi.in", "http://192.168.1.36:3000", "http://127.0.0.1:3000", "http://127.0.0.1:3001", "http://127.0.0.1:3002"],
//       credentials: true
//     }
// });

// Security middleware
const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      'form-action': ["'self'", 'https://secure.payu.in'],
      'script-src': ["'self'", "'unsafe-inline'"],
      'style-src': ["'self'", "'unsafe-inline'"],
      'frame-src': ["'self'", 'https://secure.payu.in'],
      'img-src': ["'self'", 'data:'],
    }
  }
});

// Skip helmet for the relay path to avoid CSP conflicts; controller sets route-specific CSP
app.use((req, res, next) => {
  if (req.path.startsWith('/api/v1/payment/relay')) return next();
  if (req.path.startsWith('/api/v1/payment/cashfree/relay')) return next();
  return helmetMiddleware(req, res, next);
});
app.use(compression());

// CORS configuration
  // app.use(cors({
  //   origin: process.env.NODE_ENV === 'production' 
  //     ?['https://localhost','https://31.97.229.97:3000','https://31.97.229.97:3000', 'http://192.168.1.8:3001', "http://31.97.229.97:3001", "http://localhost:3001", " https://api.waadi.in/", " https://api.waadi.in/", "http://192.168.1.36:3000", "https://31.97.229.97:3000", 'https://31.97.229.97:3000', "https://31.97.229.97:3000:3001", "https://admin.waadi.in", "http://127.0.0.1:3000", "http://127.0.0.1:3001","http://127.0.0.1:3002"]
  //     : ['https://localhost','https://31.97.229.97:3000','https://31.97.229.97:3000', 'http://192.168.1.8:3001', "http://31.97.229.97:3001", "http://localhost:3001", " https://api.waadi.in/", " https://api.waadi.in/", "http://192.168.1.36:3000", "https://31.97.229.97:3000", 'https://31.97.229.97:3000',  "https://31.97.229.97:3000:3001", "https://admin.waadi.in", "http://127.0.0.1:3000", "http://127.0.0.1:3001", "http://127.0.0.1:3002"],
  //   credentials: true
  // }));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Rate limiting removed

// Raw body parser for payment callbacks (before other body parsers)
app.use('/api/v1/payment/success', express.raw({ type: ['application/x-www-form-urlencoded', 'multipart/form-data'], limit: '10mb' }));
app.use('/api/v1/payment/failure', express.raw({ type: ['application/x-www-form-urlencoded', 'multipart/form-data'], limit: '10mb' }));
app.use('/api/v1/payment/cashfree/webhook', express.raw({ type: '*/*', limit: '2mb' }));

// Correlation ID (early — available for all handlers)
app.use(correlationId);

// Raw body parser for payment callbacks (before other body parsers)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Structured API logging (after body parsers)
app.use(requestLogger);

// Database connection


console.log("get the real db name",process.env.MONGODB_URI)
mongoose.connection.once("open", () => {
  console.log("Connected DB:", mongoose.connection.db.databaseName);
});
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ MongoDB Connected');
  gatewayCredentials.syncCashfreeService();
  startCashfreeReconciliationJob();
})
.catch(err => console.error('❌ MongoDB Connection Error:', err));


// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);
  
  // Join admin room for real-time updates
  socket.on('join-admin', () => {
    socket.join('admin-room');
    console.log('👑 Admin joined room');
  });

  // Mobile app users join a private room for booking/document updates
  socket.on('join-user', (payload = {}) => {
    const userId = payload.userId || payload;
    if (!userId) return;
    socket.join(`user-${userId}`);
    console.log('📱 User joined room:', userId);
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

// Make io available globally
global.io = io;

// Initialize WhatsApp service
const initializeWhatsApp = async () => {
  try {
    console.log('🔄 Initializing WhatsApp service...');
    const success = await whatsappService.initialize();
    if (success) {
      console.log('✅ WhatsApp service initialized successfully');
    } else {
      console.log('⚠️ WhatsApp service initialization failed - will retry on first message');
    }
  } catch (error) {
    console.error('❌ WhatsApp service initialization error:', error);
  }
};

// Initialize WhatsApp after a short delay to ensure server is ready
setTimeout(initializeWhatsApp, 3000);


// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    payuConfig: {
      isConfigured: !!((process.env.PAYU_MERCHANT_KEY || process.env.PAYU_KEY) && (process.env.PAYU_MERCHANT_SALT || process.env.PAYU_SALT)),
      hasCallbackUrls: !!(process.env.PAYU_SUCCESS_URL && process.env.PAYU_FAILURE_URL),
      environment: process.env.PAYU_ENVIRONMENT || 'production',
      hasVerifyUrl: !!(process.env.PAYU_VERIFY_URL && process.env.PAYU_VERIFY_URL.trim() !== ''),
      verifyUrlValid: (() => {
        try {
          if (!process.env.PAYU_VERIFY_URL) return false;
          new URL(process.env.PAYU_VERIFY_URL);
          return true;
        } catch {
          return false;
        }
      })()
    },
    whatsappConfig: {
      isConnected: whatsappService.isConnected,
      isReady: whatsappService.isReady
    }
  });
});

// API routes
// Auth and user profiles should remain available regardless of maintenance
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/states', checkMaintenanceMode, stateRoutes);
app.use('/api/v1/districts', checkMaintenanceMode, districtRoutes);
app.use('/api/v1/vehicle-types', checkMaintenanceMode, vehicleTypeRoutes);
app.use('/api/v1/plans', checkMaintenanceMode, planRoutes);
app.use('/api/v1/bookings', checkMaintenanceMode, bookingRoutes);
app.use('/api/v1/payment', checkMaintenanceMode, paymentRoutes);
app.use('/api/v1/payment/cashfree', checkMaintenanceMode, cashfreeRoutes);
 
// Gateway admin routes (admin panel – switch/configure gateways)
app.use('/api/v1/admin/payment-gateway', gatewayAdminRoutes);
app.use('/api/v1/admin', adminRoutes); // Admin routes don't need maintenance check
app.use('/api/v1/push', pushRoutes); // Push routes don't need maintenance check
app.use('/api/v1/whatsapp', whatsappRoutes); // WhatsApp routes don't need maintenance check
app.use('/api/v1', appSettingsRoutes); // App settings routes handle their own maintenance logic
app.use('/api/v1', insuranceInquiryRoutes);
app.use('/api/v1', cabBookingRoutes);
app.use('/api/v1', appVersionRoutes); // App version routes
app.use('/api/v1', versionTrackingRoutes); // Version tracking routes
app.use('/api/v1', validationRoutes); // Validation routes
app.use('/api/v1/logs', logRoutes); // Client log ingestion

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 4001;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
}); 