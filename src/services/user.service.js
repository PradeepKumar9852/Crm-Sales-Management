const User = require('../models/User');
const AppError = require('../utils/appError');
const { ROLES } = require('../constants/roles');

/**
 * Create a new user (Admin only)
 */
const createUser = async (userData) => {
  const existing = await User.findOne({ email: userData.email.toLowerCase() });
  if (existing) {
    throw new AppError('An account with this email address already exists.', 409);
  }

  const user = await User.create({
    ...userData,
    email: userData.email.toLowerCase(),
  });

  return user;
};

/**
 * Get all users with optional role filtering, active status, search, and sorting
 */
const getAllUsers = async (query = {}) => {
  const {
    role,
    isActive,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    page = 1,
    limit = 20,
  } = query;

  const filter = {};

  if (role) filter.role = role;
  if (isActive !== undefined) filter.isActive = isActive === 'true' || isActive === true;

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const total = await User.countDocuments(filter);
  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const users = await User.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit, 10));

  const { buildPaginationMeta } = require('../utils/pagination');

  return {
    users,
    meta: buildPaginationMeta(total, page, limit),
  };
};

/**
 * Get user by ID
 */
const getUserById = async (id) => {
  const user = await User.findById(id);
  if (!user) {
    throw new AppError('User not found.', 404);
  }
  return user;
};

/**
 * Update user details or role (Admin only)
 */
const updateUser = async (id, updateData) => {
  delete updateData.password; // Handled via dedicated password reset

  const user = await User.findByIdAndUpdate(id, updateData, {
    returnDocument: 'after',
    runValidators: true,
  });

  if (!user) {
    throw new AppError('User not found.', 404);
  }

  return user;
};

/**
 * Activate or deactivate user account (Admin only)
 */
const toggleUserStatus = async (id, isActive) => {
  const user = await User.findByIdAndUpdate(
    id,
    { isActive: Boolean(isActive) },
    { returnDocument: 'after' }
  );

  if (!user) {
    throw new AppError('User not found.', 404);
  }

  return user;
};

/**
 * Delete user (Admin only)
 */
const deleteUser = async (id) => {
  const user = await User.findByIdAndDelete(id);
  if (!user) {
    throw new AppError('User not found.', 404);
  }
  return true;
};

/**
 * Get list of active Sales Executives for assignment dropdowns
 */
const getSalesReps = async () => {
  return User.find({
    role: { $in: [ROLES.SALES_EXECUTIVE, ROLES.SALES_MANAGER, 'sales_rep', 'manager'] },
    isActive: true,
  }).select('name email role department');
};

module.exports = {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  toggleUserStatus,
  deleteUser,
  getSalesReps,
};
