const Timeline = require('../models/Timeline');
const Lead = require('../models/Lead');
const Customer = require('../models/Customer');
const Deal = require('../models/Deal');
const AppError = require('../utils/appError');
const { ROLES } = require('../constants/roles');

/**
 * Record a timeline audit event (Append-Only / Immutable)
 */
const recordTimeline = async ({
  action,
  entityType,
  entityId,
  performedBy,
  previousValue = null,
  newValue = null,
  metadata = {},
}) => {
  try {
    return await Timeline.create({
      action,
      entityType,
      entityId,
      performedBy,
      previousValue,
      newValue,
      metadata,
    });
  } catch (error) {
    // Non-blocking error logging for timeline audit
    console.error('Failed to record timeline event:', error.message);
    return null;
  }
};

/**
 * Retrieve timeline history for an entity (Lead, Customer, Deal)
 * Enforces record access restrictions for sales executives
 */
const getTimelineForEntity = async (entityType, entityId, user = null) => {
  const validTypes = ['Lead', 'Customer', 'Deal'];
  if (!validTypes.includes(entityType)) {
    throw new AppError(`Invalid entity type '${entityType}'. Supported types: ${validTypes.join(', ')}.`, 400);
  }

  // Access validation for Sales Executives
  if (user) {
    const isSalesExec = user.role === ROLES.SALES_EXECUTIVE || user.role === 'sales_rep';
    if (isSalesExec) {
      let entity;
      if (entityType === 'Lead') entity = await Lead.findById(entityId);
      else if (entityType === 'Customer') entity = await Customer.findById(entityId);
      else if (entityType === 'Deal') entity = await Deal.findById(entityId);

      if (!entity) {
        throw new AppError(`${entityType} not found.`, 404);
      }

      const assignedToId = entity.assignedTo?._id?.toString() || entity.assignedTo?.toString();
      const createdById = entity.createdBy?._id?.toString() || entity.createdBy?.toString();
      const userIdStr = user._id.toString();

      if (assignedToId !== userIdStr && createdById !== userIdStr) {
        throw new AppError(`You do not have permission to view the audit history for this ${entityType.toLowerCase()}.`, 403);
      }
    }
  }

  return Timeline.find({ entityType, entityId })
    .populate('performedBy', 'name email role department')
    .sort({ createdAt: -1 });
};

module.exports = {
  recordTimeline,
  getTimelineForEntity,
};
