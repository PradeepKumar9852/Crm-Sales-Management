const dashboardService = require('../services/dashboard.service');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Get CRM sales metrics and pipeline overview
 * GET /api/v1/dashboard or /api/v1/analytics
 */
const getDashboardMetrics = asyncHandler(async (req, res) => {
  const metrics = await dashboardService.getDashboardMetrics(req.user);

  return ApiResponse.success(res, {
    statusCode: 200,
    message: 'Dashboard metrics retrieved successfully',
    data: metrics,
  });
});

/**
 * Get Leads analytics and conversion rate
 * GET /api/v1/analytics/leads
 */
const getLeadAnalytics = asyncHandler(async (req, res) => {
  const data = await dashboardService.getLeadAnalytics(req.user);

  return ApiResponse.success(res, {
    statusCode: 200,
    message: 'Lead analytics retrieved successfully',
    data,
  });
});

/**
 * Get Deals analytics and revenue financials
 * GET /api/v1/analytics/deals
 */
const getDealAnalytics = asyncHandler(async (req, res) => {
  const data = await dashboardService.getDealAnalytics(req.user);

  return ApiResponse.success(res, {
    statusCode: 200,
    message: 'Deal analytics retrieved successfully',
    data,
  });
});

/**
 * Get Sales pipeline stage breakdown
 * GET /api/v1/analytics/pipeline
 */
const getPipelineBreakdown = asyncHandler(async (req, res) => {
  const data = await dashboardService.getPipelineBreakdown(req.user);

  return ApiResponse.success(res, {
    statusCode: 200,
    message: 'Pipeline stage breakdown retrieved successfully',
    data,
  });
});

/**
 * Get Activities analytics
 * GET /api/v1/analytics/activities
 */
const getActivityAnalytics = asyncHandler(async (req, res) => {
  const data = await dashboardService.getActivityAnalytics(req.user);

  return ApiResponse.success(res, {
    statusCode: 200,
    message: 'Activity analytics retrieved successfully',
    data,
  });
});

/**
 * Get Team-level sales performance (Manager/Admin only)
 * GET /api/v1/dashboard/team-performance or /api/v1/analytics/team-performance
 */
const getTeamPerformance = asyncHandler(async (req, res) => {
  const teamData = await dashboardService.getTeamPerformance();

  return ApiResponse.success(res, {
    statusCode: 200,
    message: 'Team performance data retrieved successfully',
    data: teamData,
  });
});

module.exports = {
  getDashboardMetrics,
  getLeadAnalytics,
  getDealAnalytics,
  getPipelineBreakdown,
  getActivityAnalytics,
  getTeamPerformance,
};

