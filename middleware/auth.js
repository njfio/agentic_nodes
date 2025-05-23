/**
 * Authentication Middleware
 * Verifies JWT tokens and attaches user to request
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware to authenticate JWT tokens
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
/**
 * Validate JWT token format
 * @param {string} token - The token to validate
 * @returns {boolean} - Whether the token is valid
 */
const isValidTokenFormat = (token) => {
  if (!token) return false;

  // Basic JWT format check: should be three parts separated by dots
  const parts = token.split('.');
  if (parts.length !== 3) return false;

  // Each part should be base64url encoded
  try {
    for (const part of parts) {
      // Check if it's valid base64url format (may contain only A-Z, a-z, 0-9, -, _, = padding)
      if (!/^[A-Za-z0-9_-]+={0,2}$/.test(part)) return false;
    }
    return true;
  } catch (e) {
    return false;
  }
};

const auth = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');

    if (!authHeader) {
      // Special case for Docker environment - check for test user
      if (process.env.DOCKER_ENV === 'true' || process.env.NODE_ENV === 'development') {
        try {
          // Try to find the test user
          const testUser = await User.findOne({ username: 'testuser' });
          if (testUser) {
            // Attach test user to request for Docker/development environment
            req.user = testUser;
            console.log('Using test user for Docker/development environment');
            next();
            return;
          }
        } catch (testUserError) {
          console.warn('Error finding test user:', testUserError);
        }
      }

      return res.status(401).json({ message: 'No authentication token, access denied' });
    }

    // Extract token from Bearer format
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

    if (!token) {
      return res.status(401).json({ message: 'No authentication token, access denied' });
    }

    // Validate token format
    if (!isValidTokenFormat(token)) {
      return res.status(401).json({ message: 'Token format is invalid' });
    }

    try {
      // Verify token (ensure JWT_SECRET is set)
      if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET environment variable is required');
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Find user by id
      const user = await User.findById(decoded.id);

      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      // Attach user to request
      req.user = user;
      req.token = token;

      next();
    } catch (error) {
      console.error('Token verification error:', error);
      res.status(401).json({ message: 'Token is not valid' });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Optional authentication middleware
 * Attaches user to request if token is valid, but doesn't require it
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const optionalAuth = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');

    // Special case for Docker environment - check for test user
    if (process.env.DOCKER_ENV === 'true' || process.env.NODE_ENV === 'development') {
      try {
        // Try to find the test user
        const testUser = await User.findOne({ username: 'testuser' });
        if (testUser) {
          // Attach test user to request for Docker/development environment
          req.user = testUser;
          next();
          return;
        }
      } catch (testUserError) {
        console.warn('Error finding test user in optionalAuth:', testUserError);
      }
    }

    if (!authHeader) {
      // No token, but that's okay
      next();
      return;
    }

    // Extract token from Bearer format
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

    if (!token) {
      // No token, but that's okay
      next();
      return;
    }

    // Validate token format
    if (!isValidTokenFormat(token)) {
      // Invalid token format, but that's okay for optional auth
      next();
      return;
    }

    try {
      // Verify token (ensure JWT_SECRET is set)
      if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET environment variable is required');
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Find user by id
      const user = await User.findById(decoded.id);

      if (user) {
        // Attach user to request
        req.user = user;
        req.token = token;
      }

      next();
    } catch (error) {
      // Invalid token, but that's okay for optional auth
      next();
    }
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    next();
  }
};

module.exports = { auth, optionalAuth };
