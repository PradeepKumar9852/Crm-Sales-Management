const dealService = require('../services/deal.service');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Create a new deal
 * POST /api/v1/deals
 */
const createDeal = asyncHandler(async (req, res) => {
  const deal = await dealService.createDeal(req.body, req.user);

  return ApiResponse.success(res, {
    statusCode: 201,
    message: 'Deal created successfully',
    data: { deal },
  });
});

/**
 * Get deals with search, filters, pagination
 * GET /api/v1/deals
 */
const getDeals = asyncHandler(async (req, res) => {
  const result = await dealService.getDeals(req.query, req.user);

  return ApiResponse.success(res, {
    statusCode: 200,
    message: 'Deals retrieved successfully',
    data: result.deals,
    meta: result.meta,
  });
});

/**
 * Get pipeline summary and metrics
 * GET /api/v1/deals/pipeline/summary
 */
const getPipelineSummary = asyncHandler(async (req, res) => {
  const summary = await dealService.getPipelineSummary(req.user);

  return ApiResponse.success(res, {
    statusCode: 200,
    message: 'Pipeline summary retrieved successfully',
    data: summary,
  });
});

/**
 * Get single deal by ID
 * GET /api/v1/deals/:id
 */
const getDealById = asyncHandler(async (req, res) => {
  const result = await dealService.getDealById(req.params.id, req.user);

  return ApiResponse.success(res, {
    statusCode: 200,
    message: 'Deal retrieved successfully',
    data: result,
  });
});

/**
 * Update deal
 * PUT /api/v1/deals/:id
 */
const updateDeal = asyncHandler(async (req, res) => {
  const deal = await dealService.updateDeal(req.params.id, req.body, req.user);

  return ApiResponse.success(res, {
    statusCode: 200,
    message: 'Deal updated successfully',
    data: { deal },
  });
});

/**
 * Update deal stage
 * PATCH /api/v1/deals/:id/stage
 */
const updateDealStage = asyncHandler(async (req, res) => {
  const targetStage = req.body.currentStage || req.body.stage;
  const deal = await dealService.updateDealStage(
    req.params.id,
    targetStage,
    {
      probability: req.body.probability,
      lostReason: req.body.lostReason,
    },
    req.user
  );

  return ApiResponse.success(res, {
    statusCode: 200,
    message: `Deal stage updated to ${targetStage}`,
    data: { deal },
  });
});

/**
 * Delete deal
 * DELETE /api/v1/deals/:id
 */
const deleteDeal = asyncHandler(async (req, res) => {
  await dealService.deleteDeal(req.params.id, req.user);

  return ApiResponse.success(res, {
    statusCode: 200,
    message: 'Deal deleted successfully',
  });
});

module.exports = {
  createDeal,
  getDeals,
  getPipelineSummary,
  getDealById,
  updateDeal,
  updateDealStage,
  deleteDeal,
};
