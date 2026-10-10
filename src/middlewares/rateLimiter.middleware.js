const rateLimit = require('express-rate-limit');
const ApiResponse = require('../utils/apiResponse');

/**
 * Standard API Rate Limiter
 * 300 requests per 15 minutes window
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return ApiResponse.error(res, {
      statusCode: 429,
      message: 'Too many requests from this IP. Please try again after 15 minutes.',
    });
  },
});

/**
 * Strict Rate Limiter for Authentication & Sensitive endpoints
 * 15 requests per 15 minutes to prevent brute-force attacks
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return ApiResponse.error(res, {
      statusCode: 429,
      message: 'Too many authentication attempts. Please try again after 15 minutes.',
    });
  },
});

module.exports = {
  apiLimiter,
  authLimiter,
};
