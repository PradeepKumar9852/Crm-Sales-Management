const { z } = require('zod');
const { ROLE_LIST } = require('../constants/roles');

const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(ROLE_LIST).optional(),
  phone: z.string().optional(),
  department: z.string().optional(),
  isActive: z.boolean().optional(),
});

const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  role: z.enum(ROLE_LIST).optional(),
  phone: z.string().optional(),
  department: z.string().optional(),
  isActive: z.boolean().optional(),
});

const toggleUserStatusSchema = z.object({
  isActive: z.boolean({ required_error: 'isActive flag is required (true/false)' }),
});

module.exports = {
  createUserSchema,
  updateUserSchema,
  toggleUserStatusSchema,
};
