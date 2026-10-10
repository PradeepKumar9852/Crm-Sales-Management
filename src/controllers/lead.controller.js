const leadService = require('../services/lead.service');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Create a new lead
 * POST /api/v1/leads
 */
const createLead = asyncHandler(async (req, res) => {
  const lead = await leadService.createLead(req.body, req.user);

  return ApiResponse.success(res, {
    statusCode: 201,
    message: 'Lead created successfully',
    data: { lead },
  });
});

/**
 * Get leads with search, filters, pagination
 * GET /api/v1/leads
 */
const getLeads = asyncHandler(async (req, res) => {
  const result = await leadService.getLeads(req.query, req.user);

  return ApiResponse.success(res, {
    statusCode: 200,
    message: 'Leads retrieved successfully',
    data: result.leads,
    meta: result.meta,
  });
});

/**
 * Get single lead by ID
 * GET /api/v1/leads/:id
 */
const getLeadById = asyncHandler(async (req, res) => {
  const result = await leadService.getLeadById(req.params.id, req.user);

  return ApiResponse.success(res, {
    statusCode: 200,
    message: 'Lead retrieved successfully',
    data: result,
  });
});

/**
 * Update lead
 * PUT /api/v1/leads/:id
 */
const updateLead = asyncHandler(async (req, res) => {
  const lead = await leadService.updateLead(req.params.id, req.body, req.user);

  return ApiResponse.success(res, {
    statusCode: 200,
    message: 'Lead updated successfully',
    data: { lead },
  });
});

/**
 * Assign lead to rep
 * PATCH /api/v1/leads/:id/assign
 */
const assignLead = asyncHandler(async (req, res) => {
  const { assignedTo } = req.body;
  const lead = await leadService.assignLead(req.params.id, assignedTo, req.user);

  return ApiResponse.success(res, {
    statusCode: 200,
    message: 'Lead assigned successfully',
    data: { lead },
  });
});

/**
 * Change lead status
 * PATCH /api/v1/leads/:id/status
 */
const changeLeadStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const lead = await leadService.changeLeadStatus(req.params.id, status, req.user);

  return ApiResponse.success(res, {
    statusCode: 200,
    message: `Lead status updated to ${status}`,
    data: { lead },
  });
});

/**
 * Change lead priority
 * PATCH /api/v1/leads/:id/priority
 */
const changeLeadPriority = asyncHandler(async (req, res) => {
  const { priority } = req.body;
  const lead = await leadService.changeLeadPriority(req.params.id, priority, req.user);

  return ApiResponse.success(res, {
    statusCode: 200,
    message: `Lead priority updated to ${priority}`,
    data: { lead },
  });
});

/**
 * Convert lead to Contact & Deal
 * POST /api/v1/leads/:id/convert
 */
const convertLead = asyncHandler(async (req, res) => {
  const result = await leadService.convertLead(req.params.id, req.body, req.user);

  return ApiResponse.success(res, {
    statusCode: 200,
    message: 'Lead successfully converted to customer contact',
    data: result,
  });
});

/**
 * Delete lead
 * DELETE /api/v1/leads/:id
 */
const deleteLead = asyncHandler(async (req, res) => {
  await leadService.deleteLead(req.params.id, req.user);

  return ApiResponse.success(res, {
    statusCode: 200,
    message: 'Lead deleted successfully',
  });
});

module.exports = {
  createLead,
  getLeads,
  getLeadById,
  updateLead,
  assignLead,
  changeLeadStatus,
  changeLeadPriority,
  convertLead,
  deleteLead,
};
