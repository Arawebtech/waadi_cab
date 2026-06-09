const jwt = require('jsonwebtoken');

class JWTUtils {
  // Generate access token (no expiration - tokens never expire)
  static generateAccessToken(payload) {
    return jwt.sign(
      payload,
      process.env.JWT_SECRET,
      {
        // No expiresIn - tokens never expire
        issuer: 'wadi-cab-api',
        audience: 'wadi-cab-app'
      }
    );
  }

  // Generate refresh token (no expiration - tokens never expire)
  static generateRefreshToken(payload) {
    return jwt.sign(
      payload,
      process.env.JWT_REFRESH_SECRET,
      {
        // No expiresIn - tokens never expire
        issuer: 'wadi-cab-api',
        audience: 'wadi-cab-app'
      }
    );
  }

  // Verify access token (ignores expiration - tokens never expire)
  static verifyAccessToken(token) {
    try {
      // Decode token first to check if it's valid format
      const decoded = jwt.decode(token, { complete: true });
      if (!decoded) {
        throw new Error('Invalid token format');
      }
      
      // Verify signature and other claims, but ignore expiration
      return jwt.verify(token, process.env.JWT_SECRET, {
        ignoreExpiration: true // Ignore expiration - tokens never expire
      });
    } catch (error) {
      // If it's an expiration error, still allow it (tokens never expire)
      if (error.name === 'TokenExpiredError') {
        // Decode without verification to get payload
        const decoded = jwt.decode(token);
        if (decoded) {
          return decoded;
        }
      }
      throw new Error('Invalid access token');
    }
  }

  // Verify refresh token (ignores expiration - tokens never expire)
  static verifyRefreshToken(token) {
    try {
      // Decode token first to check if it's valid format
      const decoded = jwt.decode(token, { complete: true });
      if (!decoded) {
        throw new Error('Invalid token format');
      }
      
      // Verify signature and other claims, but ignore expiration
      return jwt.verify(token, process.env.JWT_REFRESH_SECRET, {
        ignoreExpiration: true // Ignore expiration - tokens never expire
      });
    } catch (error) {
      // If it's an expiration error, still allow it (tokens never expire)
      if (error.name === 'TokenExpiredError') {
        // Decode without verification to get payload
        const decoded = jwt.decode(token);
        if (decoded) {
          return decoded;
        }
      }
      throw new Error('Invalid refresh token');
    }
  }

  // Generate token pair (access + refresh)
  static generateTokenPair(payload) {
    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);
    
      return {
        accessToken,
        refreshToken,
        tokenType: 'Bearer',
        expiresIn: 'never' // Tokens never expire
      };
  }

  // Extract token from Authorization header
  static extractTokenFromHeader(authHeader) {
    if (!authHeader) {
      throw new Error('Authorization header is required');
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new Error('Invalid authorization header format. Use: Bearer <token>');
    }

    return parts[1];
  }

  // Decode token without verification (for debugging)
  static decodeToken(token) {
    return jwt.decode(token, { complete: true });
  }

  // Check if token is expired
  static isTokenExpired(token) {
    try {
      const decoded = jwt.decode(token);
      if (!decoded || !decoded.exp) return true;
      
      const currentTime = Math.floor(Date.now() / 1000);
      return decoded.exp < currentTime;
    } catch (error) {
      return true;
    }
  }

  // Get token expiration time
  static getTokenExpiration(token) {
    try {
      const decoded = jwt.decode(token);
      if (!decoded || !decoded.exp) return null;
      
      return new Date(decoded.exp * 1000);
    } catch (error) {
      return null;
    }
  }

  // Refresh access token using refresh token
  static async refreshAccessToken(refreshToken, User) {
    try {
      const decoded = this.verifyRefreshToken(refreshToken);
      
      // Find user and verify refresh token exists in database
      const user = await User.findById(decoded.userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Check if refresh token exists (ignore expiration - tokens never expire)
      const tokenExists = user.refreshTokens.some(
        tokenObj => tokenObj.token === refreshToken
      );

      if (!tokenExists) {
        throw new Error('Refresh token not found');
      }

      // Generate new access token
      const newAccessToken = this.generateAccessToken({
        userId: user._id,
        phoneNumber: user.phoneNumber,
        userType: user.userType
      });

      return {
        accessToken: newAccessToken,
        tokenType: 'Bearer',
        expiresIn: 'never' // Tokens never expire
      };

    } catch (error) {
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }

  // Blacklist token (for logout)
  static async blacklistToken(token, BlacklistedToken) {
    try {
      const decoded = this.decodeToken(token);
      if (!decoded) return;

      const expirationDate = new Date(decoded.payload.exp * 1000);
      
      await BlacklistedToken.create({
        token,
        expiresAt: expirationDate
      });
    } catch (error) {
      console.error('Error blacklisting token:', error);
    }
  }

  // Check if token is blacklisted
  static async isTokenBlacklisted(token, BlacklistedToken) {
    try {
      const blacklistedToken = await BlacklistedToken.findOne({ token });
      return !!blacklistedToken;
    } catch (error) {
      return false;
    }
  }

  // Clean up expired refresh tokens for a user (disabled - tokens never expire)
  static async cleanupExpiredRefreshTokens(userId, User) {
    // Tokens never expire, so no cleanup needed
    // Keeping function for compatibility but it does nothing
    return;
  }

  // Validate token payload structure
  static validateTokenPayload(payload) {
    const requiredFields = ['userId', 'phoneNumber', 'userType'];
    
    for (const field of requiredFields) {
      if (!payload[field]) {
        throw new Error(`Missing required field in token payload: ${field}`);
      }
    }

    return true;
  }

  // Generate token for password reset
  static generatePasswordResetToken(payload) {
    return jwt.sign(
      payload,
      process.env.JWT_SECRET,
      {
        expiresIn: '1h', // Password reset tokens expire in 1 hour
        issuer: 'wadi-cab-api',
        audience: 'wadi-cab-app',
        subject: 'password-reset'
      }
    );
  }

  // Verify password reset token
  static verifyPasswordResetToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      if (decoded.sub !== 'password-reset') {
        throw new Error('Invalid token type');
      }
      
      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired password reset token');
    }
  }
}

module.exports = JWTUtils; 