/**
 * Async handler utility to wrap asynchronous controller functions
 * and cleanly catch any thrown errors and pass to next()
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = asyncHandler;
