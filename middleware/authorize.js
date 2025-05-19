/**
 * Authorization Middleware
 * Checks if the user has the required role
 */

/**
 * Middleware to check if the user has the required role
 * @param {string|string[]} roles - Required role(s)
 * @returns {Function} - Express middleware function
 */
const authorize = (roles) => {
  // Convert single role to array
  if (typeof roles === 'string') {
    roles = [roles];
  }
  
  return (req, res, next) => {
    // Check if user exists (should be attached by auth middleware)
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // Check if user has required role
    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden - Insufficient permissions' });
    }
    
    // User has required role, proceed
    next();
  };
};

module.exports = authorize;
