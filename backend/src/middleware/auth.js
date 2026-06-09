const JWTUtils = require('../utils/jwt');
const User = require('../models/User');

// Middleware to verify JWT token
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Authorization header is required'
      });
    }

    // Extract token from Bearer header
    const token = JWTUtils.extractTokenFromHeader(authHeader);
    
    // Verify the token
    const decoded = JWTUtils.verifyAccessToken(token);
    
    // Find user in database
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    // Check if user's phone is verified (for most operations)
    if (!user.isPhoneVerified && req.path !== '/verify-phone' && req.path !== '/resend-otp') {
      return res.status(403).json({
        success: false,
        message: 'Phone number verification required',
        code: 'PHONE_VERIFICATION_REQUIRED'
      });
    }

    // Add user to request object
    req.user = user;
    req.token = token;
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
      error: error.message
    });
  }
};

// Middleware to check user role/type
const authorize = (...allowedUserTypes) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!allowedUserTypes.includes(req.user.userType)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        requiredRole: allowedUserTypes,
        userRole: req.user.userType
      });
    }

    next();
  };
};

// Optional authentication middleware (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      req.user = null;
      return next();
    }

    const token = JWTUtils.extractTokenFromHeader(authHeader);
    const decoded = JWTUtils.verifyAccessToken(token);
    
    const user = await User.findById(decoded.userId);
    if (user && user.isActive) {
      req.user = user;
      req.token = token;
    } else {
      req.user = null;
    }
    
    next();
  } catch (error) {
    // Don't fail for optional auth, just set user as null
    req.user = null;
    next();
  }
};

// Middleware to check if user owns the resource
const checkResourceOwnership = (resourceUserIdField = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // For admin users, allow access to all resources
    if (req.user.userType === 'admin') {
      return next();
    }

    // Check if the resource belongs to the authenticated user
    const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
    
    if (resourceUserId && resourceUserId !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Resource does not belong to user'
      });
    }

    next();
  };
};

// Middleware to check rate limiting per user
const userRateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const userRequests = new Map();

  return (req, res, next) => {
    if (!req.user) {
      return next();
    }

    const userId = req.user._id.toString();
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get user's request history
    let userRequestHistory = userRequests.get(userId) || [];
    
    // Filter out requests outside the time window
    userRequestHistory = userRequestHistory.filter(timestamp => timestamp > windowStart);
    
    // Check if user exceeded the limit
    if (userRequestHistory.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((userRequestHistory[0] + windowMs - now) / 1000)
      });
    }

    // Add current request timestamp
    userRequestHistory.push(now);
    userRequests.set(userId, userRequestHistory);

    // Clean up old entries periodically
    if (Math.random() < 0.1) { // 10% chance to cleanup
      for (const [key, timestamps] of userRequests.entries()) {
        const validTimestamps = timestamps.filter(t => t > windowStart);
        if (validTimestamps.length === 0) {
          userRequests.delete(key);
        } else {
          userRequests.set(key, validTimestamps);
        }
      }
    }

    next();
  };
};

// Middleware to validate phone verification status
const requirePhoneVerification = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (!req.user.isPhoneVerified) {
    return res.status(403).json({
      success: false,
      message: 'Phone number verification required',
      code: 'PHONE_VERIFICATION_REQUIRED'
    });
  }

  next();
};

// Middleware to check if user has added vehicle information
const requireVehicleInfo = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (!req.user.vehicles || req.user.vehicles.length === 0) {
    return res.status(403).json({
      success: false,
      message: 'Vehicle information required. Please add your vehicle details.',
      code: 'VEHICLE_INFO_REQUIRED'
    });
  }

  next();
};

// Middleware to log user activity
const logUserActivity = (activity) => {
  return (req, res, next) => {
    if (req.user) {
      // Log user activity (implement logging service as needed)
      console.log(`🔍 User Activity: ${req.user._id} - ${activity} - ${req.method} ${req.path}`);
    }
    next();
  };
};

// Extract user info from token without requiring database lookup (for performance)
const extractUserFromToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      req.tokenUser = null;
      return next();
    }

    const token = JWTUtils.extractTokenFromHeader(authHeader);
    const decoded = JWTUtils.verifyAccessToken(token);
    
    req.tokenUser = {
      userId: decoded.userId,
      phoneNumber: decoded.phoneNumber,
      userType: decoded.userType
    };
    
    next();
  } catch (error) {
    req.tokenUser = null;
    next();
  }
};

module.exports = {
  authenticate,
  authorize,
  optionalAuth,
  checkResourceOwnership,
  userRateLimit,
  requirePhoneVerification,
  requireVehicleInfo,
  logUserActivity,
  extractUserFromToken
}; 