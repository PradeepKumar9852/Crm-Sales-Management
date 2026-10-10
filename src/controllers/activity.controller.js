const activityService = require('../services/activity.service');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Log a new activity
 * POST /api/v1/activities
 */
const createActivity = asyncHandler(async (req, res) => {
  const activity = await activityService.createActivity(req.body, req.user);

  return ApiResponse.success(res, {
    statusCode: 201,
    message: 'Activity logged successfully',
    data: { activity },
  });
});

/**
 * Get activities with filtering
 * GET /api/v1/activities
 */
const getActivities = asyncHandler(async (req, res) => {
  const result = await activityService.getActivities(req.query, req.user);

  return ApiResponse.success(res, {
    statusCode: 200,
    message: 'Activities retrieved successfully',
    data: result.activities,
    meta: result.meta,
  });
});

/**
 * Get single activity by ID
 * GET /api/v1/activities/:id
 */
const getActivityById = asyncHandler(async (req, res) => {
  const activity = await activityService.getActivityById(req.params.id, req.user);

  return ApiResponse.success(res, {
    statusCode: 200,
    message: 'Activity retrieved successfully',
    data: { activity },
  });
});

/**
 * Update activity details
 * PUT /api/v1/activities/:id
 */
const updateActivity = asyncHandler(async (req, res) => {
  const activity = await activityService.updateActivity(req.params.id, req.body, req.user);

  return ApiResponse.success(res, {
    statusCode: 200,
    message: 'Activity updated successfully',
    data: { activity },
  });
});

/**
 * Update activity status (Complete / Cancel)
 * PATCH /api/v1/activities/:id/status
 */
const updateActivityStatus = asyncHandler(async (req, res) => {
  const { status, outcome } = req.body;
  const activity = await activityService.updateActivityStatus(
    req.params.id,
    status,
    outcome,
    req.user
  );

  return ApiResponse.success(res, {
    statusCode: 200,
    message: `Activity marked as ${status}`,
    data: { activity },
  });
});

/**
 * Delete activity
 * DELETE /api/v1/activities/:id
 */
const deleteActivity = asyncHandler(async (req, res) => {
  await activityService.deleteActivity(req.params.id, req.user);

  return ApiResponse.success(res, {
    statusCode: 200,
    message: 'Activity deleted successfully',
  });
});

module.exports = {
  createActivity,
  getActivities,
  getActivityById,
  updateActivity,
  updateActivityStatus,
  deleteActivity,
};
