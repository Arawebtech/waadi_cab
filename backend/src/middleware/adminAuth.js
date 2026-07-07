const Admin = require('../models/Admin');
const tokenService = require('../cab-services/token.service');

/**
 * Validates admin JWT and attaches req.admin.
 * Used by admin management and saved-place admin routes.
 */
async function adminAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized access',
        code: 'AUTH_HEADER_REQUIRED',
      });
    }

    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    let decoded;
    try {
      decoded = tokenService.verifyAccessToken(token);
    } catch (err) {
      const message = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
      return res.status(401).json({
        success: false,
        message,
        code: err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
      });
    }

    if (decoded.role !== 'admin' && decoded.accountType !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access',
        code: 'ADMIN_REQUIRED',
      });
    }

    const admin = await Admin.findById(decoded.sub || decoded.userId).select('-password');
    if (!admin || !admin.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User account not found',
        code: 'ADMIN_NOT_FOUND',
      });
    }

    req.admin = admin;
    req.user = req.user || { _id: admin._id, role: 'admin', adminRole: admin.role };
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized access',
    });
  }
}

module.exports = adminAuth;
