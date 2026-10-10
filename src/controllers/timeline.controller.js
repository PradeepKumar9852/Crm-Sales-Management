const timelineService = require('../services/timeline.service');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Get timeline audit log for any entity (Lead, Customer, Deal)
 * GET /api/v1/timeline/:entityType/:entityId
 */
const getTimeline = asyncHandler(async (req, res) => {
  const { entityType, entityId } = req.params;
  const history = await timelineService.getTimelineForEntity(entityType, entityId, req.user);

  return ApiResponse.success(res, {
    statusCode: 200,
    message: `Timeline for ${entityType} retrieved successfully`,
    data: history,
  });
});

module.exports = {
  getTimeline,
};
