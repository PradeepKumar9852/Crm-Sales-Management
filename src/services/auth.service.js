const User = require('../models/User');
const AppError = require('../utils/appError');
const { generateToken } = require('../utils/jwt');

/**
 * Register a new user
 */
const register = async (userData) => {
  const existingUser = await User.findOne({ email: userData.email.toLowerCase() });
  if (existingUser) {
    throw new AppError('An account with this email address already exists.', 409);
  }

  const user = await User.create({
    ...userData,
    email: userData.email.toLowerCase(),
  });

  const token = generateToken({
    id: user._id,
    role: user.role,
    email: user.email,
  });

  return {
    user: user.toJSON(),
    token,
  };
};

/**
 * Authenticate user login
 */
const login = async (email, password) => {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid email or password credentials.', 401);
  }

  if (!user.isActive) {
    throw new AppError('Your account has been deactivated. Please contact an administrator.', 403);
  }

  // Update last login timestamp
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  const token = generateToken({
    id: user._id,
    role: user.role,
    email: user.email,
  });

  return {
    user: user.toJSON(),
    token,
  };
};

/**
 * Get current authenticated user profile
 */
const getProfile = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found.', 404);
  }
  return user;
};

/**
 * Update authenticated user profile
 */
const updateProfile = async (userId, updateData) => {
  // Prevent changing email or role through profile update
  delete updateData.email;
  delete updateData.role;
  delete updateData.password;

  const user = await User.findByIdAndUpdate(userId, updateData, {
    returnDocument: 'after',
    runValidators: true,
  });

  if (!user) {
    throw new AppError('User not found.', 404);
  }

  return user;
};

/**
 * Update user password
 */
const updatePassword = async (userId, currentPassword, newPassword) => {
  const user = await User.findById(userId).select('+password');
  if (!user) {
    throw new AppError('User not found.', 404);
  }

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    throw new AppError('Current password does not match.', 400);
  }

  user.password = newPassword;
  await user.save();

  return true;
};

/**
 * Revoke token upon logout
 */
const logout = async (token, userId) => {
  if (!token) return true;
  try {
    const TokenBlacklist = require('../models/TokenBlacklist');
    const { verifyToken } = require('../utils/jwt');
    const decoded = verifyToken(token);
    const expiresAt = decoded.exp
      ? new Date(decoded.exp * 1000)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await TokenBlacklist.create({
      token,
      user: userId,
      expiresAt,
    });
  } catch (err) {
    // If token is expired or invalid, blacklist entry is not required
  }
  return true;
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  updatePassword,
  logout,
};
