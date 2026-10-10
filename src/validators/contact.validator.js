const { z } = require('zod');
const { CONTACT_STATUSES, CONTACT_TYPES } = require('../constants/roles');

const addressSchema = z
  .object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
  })
  .optional();

const createContactSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  email: z.string().email('Please provide a valid email address'),
  phone: z.string().optional(),
  company: z.string().optional(),
  title: z.string().optional(),
  department: z.string().optional(),
  address: addressSchema,
  status: z.enum(CONTACT_STATUSES).optional(),
  type: z.enum(CONTACT_TYPES).optional(),
  tags: z.array(z.string()).optional(),
  leadSource: z.string().optional(),
  assignedTo: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID').optional(),
});

const updateContactSchema = createContactSchema.partial();

module.exports = {
  createContactSchema,
  updateContactSchema,
};
