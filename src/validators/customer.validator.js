const { z } = require('zod');
const { ROLES } = require('../constants/roles');

const addressSchema = z
  .object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
  })
  .optional();

const createCustomerSchema = z.object({
  name: z.string().min(2, 'Customer name must be at least 2 characters').max(100),
  email: z.string().email('Please provide a valid email address'),
  phone: z.string().optional(),
  company: z.string().optional(),
  address: addressSchema,
  status: z.enum(['Active', 'Inactive', 'Customer', 'Lead']).optional(),
  notes: z.string().optional(),
  assignedTo: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID').optional(),
  lead: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid lead ID').optional(),
});

const updateCustomerSchema = createCustomerSchema.partial();

module.exports = {
  createCustomerSchema,
  updateCustomerSchema,
};
