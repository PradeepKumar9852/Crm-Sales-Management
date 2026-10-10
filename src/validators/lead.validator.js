const { z } = require('zod');
const {
  LEAD_STATUS_LIST,
  LEAD_SOURCES,
  LEAD_PRIORITY_LIST,
} = require('../constants/roles');

const baseLeadSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(100).optional(),
  contactName: z.string().min(2, 'Contact name must be at least 2 characters').optional(),
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().optional(),
  company: z.string().optional(),
  source: z.enum(LEAD_SOURCES).optional(),
  status: z.enum(LEAD_STATUS_LIST).optional(),
  priority: z.enum(LEAD_PRIORITY_LIST).optional(),
  assignedTo: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID').optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  estimatedValue: z.number().min(0).optional(),
});

const createLeadSchema = baseLeadSchema.refine((data) => data.name || data.title, {
  message: 'Lead name or title is required',
  path: ['name'],
});

const updateLeadSchema = baseLeadSchema.partial();

const assignLeadSchema = z.object({
  assignedTo: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID for assignment'),
});

const changeLeadStatusSchema = z.object({
  status: z.enum(LEAD_STATUS_LIST),
});

const changeLeadPrioritySchema = z.object({
  priority: z.enum(LEAD_PRIORITY_LIST),
});

const convertLeadSchema = z.object({
  createDeal: z.boolean().optional().default(true),
  dealName: z.string().optional(),
  dealTitle: z.string().optional(),
  dealValue: z.number().min(1, 'Deal value must be greater than zero').optional(),
  value: z.number().min(1).optional(),
  expectedClosingDate: z.string().optional(),
  expectedCloseDate: z.string().optional(),
});

module.exports = {
  createLeadSchema,
  updateLeadSchema,
  assignLeadSchema,
  changeLeadStatusSchema,
  changeLeadPrioritySchema,
  convertLeadSchema,
};