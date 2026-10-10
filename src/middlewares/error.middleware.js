const AppError = require('../utils/appError');
const ApiResponse = require('../utils/apiResponse');

/**
 * Handle Mongoose CastError (e.g. invalid MongoDB ObjectId)
 */
const handleCastErrorDB = (err) => {
  const message = `Invalid value for field '${err.path}': ${err.value}`;
  return new AppError(message, 400);
};

/**
 * Handle Mongoose duplicate key errors (code 11000)
 */
const handleDuplicateFieldsDB = (err) => {
  const field = Object.keys(err.keyValue || {})[0] || 'field';
  const value = err.keyValue ? err.keyValue[field] : '';
  const message = `Duplicate value '${value}' for '${field}'. Please use another value.`;
  return new AppError(message, 409);
};

/**
 * Handle Mongoose Validation Error
 */
const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => ({
    field: el.path,
    message: el.message,
  }));
  const message = 'Invalid input data.';
  return new AppError(message, 400, errors);
};

/**
 * Handle JWT Errors
 */
const handleJWTError = () =>
  new AppError('Invalid authentication token. Please log in again.', 401);

const handleJWTExpiredError = () =>
  new AppError('Your token has expired. Please log in again.', 401);

/**
 * 404 Not Found Middleware
 */
const notFoundHandler = (req, res, next) => {
  next(new AppError(`Cannot ${req.method} ${req.originalUrl} - Route not found`, 404));
};

/**
 * Global Centralized Error Handling Middleware
 */
const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  let error = { ...err };
  error.message = err.message;
  error.name = err.name;
  error.stack = err.stack;

  // Handle specific database and auth errors
  if (err.name === 'CastError') error = handleCastErrorDB(err);
  if (err.code === 11000) error = handleDuplicateFieldsDB(err);
  if (err.name === 'ValidationError') error = handleValidationErrorDB(err);
  if (err.name === 'JsonWebTokenError') error = handleJWTError();
  if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();

  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'An unexpected error occurred.',
      errors: error.errors || null,
      stack: error.stack,
    });
  }

  // Production response: don't leak unhandled internal details
  if (error.isOperational) {
    return ApiResponse.error(res, {
      statusCode: error.statusCode,
      message: error.message,
      errors: error.errors || null,
    });
  }

  // Generic internal server error
  console.error('CRITICAL INTERNAL ERROR:', err);
  return ApiResponse.error(res, {
    statusCode: 500,
    message: 'Internal server error. Please try again later.',
  });
};

module.exports = {
  notFoundHandler,
  globalErrorHandler,
};
