const authService = require('../services/auth.service');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Register a new user
 * POST /api/v1/auth/register
 */
const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);

  // Set cookie if needed
  res.cookie('token', result.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  return ApiResponse.success(res, {
    statusCode: 201,
    message: 'User registered successfully',
    data: result,
  });
});

/**
 * Login user
 * POST /api/v1/auth/login
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password);

  res.cookie('token', result.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return ApiResponse.success(res, {
    statusCode: 200,
    message: 'Login successful',
    data: result,
  });
});

/**
 * Get current authenticated user profile
 * GET /api/v1/auth/me
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await authService.getProfile(req.user._id);

  return ApiResponse.success(res, {
    statusCode: 200,
    message: 'Profile retrieved successfully',
    data: { user },
  });
});

/**
 * Update authenticated user profile
 * PUT /api/v1/auth/update-profile
 */
const updateProfile = asyncHandler(async (req, res) => {
  const updatedUser = await authService.updateProfile(req.user._id, req.body);

  return ApiResponse.success(res, {
    statusCode: 200,
    message: 'Profile updated successfully',
    data: { user: updatedUser },
  });
});

/**
 * Update password
 * PUT /api/v1/auth/update-password
 */
const updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  await authService.updatePassword(req.user._id, currentPassword, newPassword);

  return ApiResponse.success(res, {
    statusCode: 200,
    message: 'Password changed successfully',
  });
});

/**
 * Logout user
 * POST /api/v1/auth/logout
 */
const logout = asyncHandler(async (req, res) => {
  if (req.token) {
    await authService.logout(req.token, req.user?._id);
  }
  res.clearCookie('token');

  return ApiResponse.success(res, {
    statusCode: 200,
    message: 'Logged out successfully',
  });
});

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  updatePassword,
  logout,
};
