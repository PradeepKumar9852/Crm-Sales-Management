const { z } = require('zod');
const { DEAL_STAGE_LIST } = require('../constants/roles');

const createDealSchema = z.object({
  dealName: z.string().min(2, 'Deal name must be at least 2 characters').max(150).optional(),
  title: z.string().min(2).max(150).optional(),
  dealValue: z.number().min(1, 'Deal value must be greater than zero').optional(),
  value: z.number().min(1).optional(),
  currency: z.string().length(3).optional(),
  currentStage: z.enum(DEAL_STAGE_LIST).optional(),
  stage: z.enum(DEAL_STAGE_LIST).optional(),
  probability: z.number().min(0).max(100).optional(),
  expectedClosingDate: z.string().optional(),
  expectedCloseDate: z.string().optional(),
  customer: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid customer ID').optional(),
  contact: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid contact ID').optional(),
  lead: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid lead ID').optional(),
  assignedTo: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID').optional(),
  description: z.string().optional(),
  lostReason: z.string().optional(),
  pipeline: z.string().optional(),
  tags: z.array(z.string()).optional(),
}).refine(
  (data) => Boolean(data.dealName || data.title),
  { message: 'Deal name or title is required', path: ['dealName'] }
).refine(
  (data) => (data.dealValue !== undefined && data.dealValue > 0) || (data.value !== undefined && data.value > 0),
  { message: 'Deal value must be greater than zero', path: ['dealValue'] }
).refine(
  (data) => Boolean(data.expectedClosingDate || data.expectedCloseDate),
  { message: 'Expected closing date is required', path: ['expectedClosingDate'] }
);

const updateDealSchema = z.object({
  dealName: z.string().min(2).max(150).optional(),
  title: z.string().min(2).max(150).optional(),
  dealValue: z.number().min(1).optional(),
  value: z.number().min(1).optional(),
  currency: z.string().length(3).optional(),
  currentStage: z.enum(DEAL_STAGE_LIST).optional(),
  stage: z.enum(DEAL_STAGE_LIST).optional(),
  probability: z.number().min(0).max(100).optional(),
  expectedClosingDate: z.string().optional(),
  expectedCloseDate: z.string().optional(),
  customer: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  assignedTo: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  description: z.string().optional(),
  lostReason: z.string().optional(),
});

const updateDealStageSchema = z.object({
  stage: z.enum(DEAL_STAGE_LIST).optional(),
  currentStage: z.enum(DEAL_STAGE_LIST).optional(),
  probability: z.number().min(0).max(100).optional(),
  lostReason: z.string().optional(),
}).refine(
  (data) => Boolean(data.stage || data.currentStage),
  { message: 'Target stage is required', path: ['stage'] }
);

module.exports = {
  createDealSchema,
  updateDealSchema,
  updateDealStageSchema,
};
