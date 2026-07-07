const JWTUtils = require('../utils/jwt');
const Customer = require('../models/Customer');

async function authenticateCustomer(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ success: false, message: 'Authorization required' });
    }

    const token = JWTUtils.extractTokenFromHeader(authHeader);
    const decoded = JWTUtils.verifyAccessToken(token);

    if (decoded.role !== 'customer' && decoded.userType !== 'customer') {
      return res.status(403).json({ success: false, message: 'Customer access only' });
    }

    const customer = await Customer.findById(decoded.userId);
    if (!customer || customer.status === 'suspended') {
      return res.status(401).json({ success: false, message: 'Account not found or suspended' });
    }

    req.customer = customer;
    req.user = { ...customer.toObject(), role: 'customer', _id: customer._id };
    req.token = token;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
      error: error.message,
    });
  }
}

module.exports = { authenticateCustomer };
