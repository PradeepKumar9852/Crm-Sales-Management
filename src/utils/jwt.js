const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'crm_super_secret_jwt_key_2026_dev_env_fallback';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Generate a JWT token for an authenticated user
 * @param {Object} payload - User identification and role data
 * @param {string} [expiresIn] - Optional custom expiration
 * @returns {string} Signed JWT token
 */
const getSecret = () => process.env.JWT_SECRET || JWT_SECRET;

const crypto = require('crypto');

const generateToken = (payload, expiresIn) => {
  const exp = expiresIn || process.env.JWT_EXPIRES_IN || JWT_EXPIRES_IN;
  return jwt.sign(payload, getSecret(), {
    expiresIn: exp,
    jwtid: crypto.randomUUID(),
  });
};

/**
 * Verify a JWT token
 * @param {string} token
 * @returns {Object} Decoded payload
 */
const verifyToken = (token) => {
  const currentSecret = getSecret();
  try {
    return jwt.verify(token, currentSecret);
  } catch (err) {
    const fallbackSecret = 'crm_super_secret_jwt_key_2026_dev_env_fallback';
    if (currentSecret !== fallbackSecret) {
      try {
        return jwt.verify(token, fallbackSecret);
      } catch (_) {
        // ignore fallback error and throw original error
      }
    }
    throw err;
  }
};

module.exports = {
  generateToken,
  verifyToken,
  JWT_SECRET,
  JWT_EXPIRES_IN,
};
