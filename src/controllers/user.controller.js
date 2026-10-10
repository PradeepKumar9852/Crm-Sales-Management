const userService = require('../services/user.service');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Create a new user (Admin)
 * POST /api/v1/users
 */
const createUser = asyncHandler(async (req, res) => {
  const user = await userService.createUser(req.body);

  return ApiResponse.success(res, {
    statusCode: 201,
    message: 'User created successfully',
    data: { user },
  });
});

/**
 * Get all users with search, filters, pagination, sorting (Admin/Manager)
 * GET /api/v1/users
 */
const getAllUsers = asyncHandler(async (req, res) => {
  const result = await userService.getAllUsers(req.query);

  return ApiResponse.success(res, {
    statusCode: 200,
    message: 'Users retrieved successfully',
    data: result.users,
    meta: result.meta,
  });
});

/**
 * Get user by ID (Admin/Manager)
 * GET /api/v1/users/:id
 */
const getUserById = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(req.params.id);

  return ApiResponse.success(res, {
    statusCode: 200,
    message: 'User details retrieved',
    data: { user },
  });
});

/**
 * Update user details/role (Admin)
 * PUT /api/v1/users/:id
 */
const updateUser = asyncHandler(async (req, res) => {
  const user = await userService.updateUser(req.params.id, req.body);

  return ApiResponse.success(res, {
    statusCode: 200,
    message: 'User updated successfully',
    data: { user },
  });
});

/**
 * Activate or deactivate user (Admin)
 * PATCH /api/v1/users/:id/status
 */
const toggleUserStatus = asyncHandler(async (req, res) => {
  const { isActive } = req.body;
  const user = await userService.toggleUserStatus(req.params.id, isActive);

  return ApiResponse.success(res, {
    statusCode: 200,
    message: `User account ${isActive ? 'activated' : 'deactivated'} successfully`,
    data: { user },
  });
});

/**
 * Delete user (Admin)
 * DELETE /api/v1/users/:id
 */
const deleteUser = asyncHandler(async (req, res) => {
  await userService.deleteUser(req.params.id);

  return ApiResponse.success(res, {
    statusCode: 200,
    message: 'User deleted successfully',
  });
});

/**
 * Get sales executives list for assignment
 * GET /api/v1/users/sales-reps
 */
const getSalesReps = asyncHandler(async (req, res) => {
  const reps = await userService.getSalesReps();

  return ApiResponse.success(res, {
    statusCode: 200,
    message: 'Sales executives retrieved successfully',
    data: reps,
  });
});

module.exports = {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  toggleUserStatus,
  deleteUser,
  getSalesReps,
};
