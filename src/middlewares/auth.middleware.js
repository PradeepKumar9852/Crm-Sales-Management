const User = require('../models/User');
const TokenBlacklist = require('../models/TokenBlacklist');
const { verifyToken } = require('../utils/jwt');
const AppError = require('../utils/appError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Middleware to authenticate requests via JWT
 */
const authenticate = asyncHandler(async (req, res, next) => {
  let token;

  // 1. Check Authorization header
  if (req.headers.authorization) {
    let authHeader = req.headers.authorization.trim();
    if (/^bearer\s+/i.test(authHeader)) {
      token = authHeader.replace(/^bearer\s+/i, '').trim();
      // Handle accidental double "Bearer" prefix (e.g. "Bearer Bearer <token>")
      token = token.replace(/^bearer\s+/i, '').trim();
      // Remove accidental enclosing quotes (e.g. "token" or 'token')
      if (
        (token.startsWith('"') && token.endsWith('"')) ||
        (token.startsWith("'") && token.endsWith("'"))
      ) {
        token = token.slice(1, -1).trim();
      }
    }
  } else if (req.cookies && req.cookies.token) {
    // Or check cookie if available
    token = req.cookies.token;
  } else if (req.query && req.query.token) {
    // Or check query parameter (for direct browser URL testing)
    token = req.query.token;
  }

  if (!token) {
    return next(new AppError('Authentication required. Please provide a valid Bearer token.', 401));
  }

  // Check if token has been revoked / logged out
  const isRevoked = await TokenBlacklist.findOne({ token });
  if (isRevoked) {
    return next(new AppError('This session has been logged out. Please log in again.', 401));
  }

  req.token = token;

  // 2. Verify token
  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('Your session has expired. Please log in again.', 401));
    }
    return next(new AppError('Invalid authentication token.', 401));
  }

  // 3. Check if user still exists
  const currentUser = await User.findById(decoded.id).select('-password');
  if (!currentUser) {
    return next(new AppError('The user belonging to this token no longer exists.', 401));
  }

  // 4. Check if user is active
  if (!currentUser.isActive) {
    return next(new AppError('Your account has been deactivated. Please contact an administrator.', 403));
  }

  // Attach user to request
  req.user = currentUser;
  next();
});

/**
 * Middleware for Role-Based Access Control (RBAC)
 * @param  {...string} allowedRoles - e.g. 'admin', 'manager', 'sales_rep'
 */
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          `Access forbidden: Role '${req.user.role}' is not authorized to perform this action.`,
          403
        )
      );
    }

    next();
  };
};

module.exports = {
  authenticate,
  authorizeRoles,
};
