const { z } = require('zod');

/**
 * Common reusable validation schemas
 */

// MongoDB ObjectId Regex (24 hex characters)
const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const objectIdSchema = z
  .string()
  .trim()
  .regex(objectIdRegex, 'Invalid MongoDB ObjectId format');

const idParamSchema = z.object({
  id: objectIdSchema,
});

const entityParamsSchema = z.object({
  entityType: z.enum(['Lead', 'Customer', 'Deal', 'Contact']),
  entityId: objectIdSchema,
});

const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
  sortBy: z.string().trim().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc').optional(),
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
});

module.exports = {
  objectIdSchema,
  idParamSchema,
  entityParamsSchema,
  paginationQuerySchema,
};
