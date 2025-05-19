/**
 * Rate limiting middleware to protect against abuse
 */

// In-memory store for rate limiting
const rateStore = new Map();

/**
 * Simple rate limiter middleware
 * @param {object} options - Rate limiter options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.maxRequests - Maximum number of requests per window
 * @param {string} options.keyGenerator - Function to generate rate limit key (default: IP address)
 * @param {boolean} options.skipSuccessfulRequests - Whether to skip counting successful requests
 * @returns {function} - Express middleware function
 */
function rateLimiter(options = {}) {
  const {
    windowMs = 60 * 1000, // 1 minute by default
    maxRequests = 100, // 100 requests per minute by default
    skipSuccessfulRequests = false,
    keyGenerator = (req) => req.ip || req.headers['x-forwarded-for'] || 'unknown'
  } = options;

  // Cleanup function to remove old entries
  const cleanup = () => {
    const now = Date.now();
    for (const [key, data] of rateStore.entries()) {
      if (now - data.timestamp > windowMs) {
        rateStore.delete(key);
      }
    }
  };

  // Run cleanup every minute
  setInterval(cleanup, 60 * 1000);

  // Return middleware function
  return (req, res, next) => {
    // Generate key for this request
    const key = keyGenerator(req);

    // Get current time
    const now = Date.now();

    // Get or create rate data for this key
    let rateData = rateStore.get(key);
    if (!rateData) {
      rateData = {
        count: 0,
        timestamp: now,
        blocked: false
      };
      rateStore.set(key, rateData);
    }

    // If time window has passed, reset count
    if (now - rateData.timestamp > windowMs) {
      rateData.count = 0;
      rateData.timestamp = now;
      rateData.blocked = false;
    }

    // Check if request is blocked
    if (rateData.blocked) {
      return res.status(429).json({
        error: 'Too many requests, please try again later',
        retryAfter: Math.ceil((rateData.timestamp + windowMs - now) / 1000)
      });
    }

    // Increment request count
    rateData.count++;

    // Add headers to response
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - rateData.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil((rateData.timestamp + windowMs) / 1000));

    // If count exceeds maximum, block requests
    if (rateData.count > maxRequests) {
      rateData.blocked = true;
      return res.status(429).json({
        error: 'Too many requests, please try again later',
        retryAfter: Math.ceil((rateData.timestamp + windowMs - now) / 1000)
      });
    }

    // If skipSuccessfulRequests is enabled, decrement count on successful response
    if (skipSuccessfulRequests) {
      const originalSend = res.send;
      res.send = function (...args) {
        if (res.statusCode < 400) {
          rateData.count--;
        }
        return originalSend.apply(res, args);
      };
    }

    next();
  };
}

// Special rate limiters for sensitive routes
const authRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 20, // 20 requests per 15 minutes
  skipSuccessfulRequests: true // Don't count successful logins
});

const apiRateLimiter = rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100 // 100 requests per minute
});

module.exports = {
  rateLimiter,
  authRateLimiter,
  apiRateLimiter
};