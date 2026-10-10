const { z } = require('zod');
const { ACTIVITY_TYPE_LIST, ACTIVITY_STATUS_LIST } = require('../constants/roles');

const createActivitySchema = z.object({
  type: z.enum(ACTIVITY_TYPE_LIST),
  title: z.string().min(1, 'Activity title is required').max(200).optional(),
  subject: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  status: z.enum(ACTIVITY_STATUS_LIST).optional(),
  priority: z.enum(['Low', 'Medium', 'High']).optional(),
  dueDate: z.string().optional(),
  scheduledAt: z.string().optional(),
  durationMinutes: z.number().min(1).optional(),
  outcome: z.string().optional(),
  entityType: z.enum(['Lead', 'Customer', 'Deal', 'Contact']),
  entityId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid entity ID'),
  assignedTo: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
}).refine(
  (data) => Boolean(data.title || data.subject),
  { message: 'Activity title or subject is required', path: ['title'] }
);

const updateActivitySchema = z.object({
  type: z.enum(ACTIVITY_TYPE_LIST).optional(),
  title: z.string().min(1).max(200).optional(),
  subject: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  status: z.enum(ACTIVITY_STATUS_LIST).optional(),
  priority: z.enum(['Low', 'Medium', 'High']).optional(),
  dueDate: z.string().optional(),
  durationMinutes: z.number().min(1).optional(),
  outcome: z.string().optional(),
});

const updateActivityStatusSchema = z.object({
  status: z.enum(ACTIVITY_STATUS_LIST),
  outcome: z.string().optional(),
});

module.exports = {
  createActivitySchema,
  updateActivitySchema,
  updateActivityStatusSchema,
};
