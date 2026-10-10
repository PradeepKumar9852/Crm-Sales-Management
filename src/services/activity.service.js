const Activity = require('../models/Activity');
const Lead = require('../models/Lead');
const Deal = require('../models/Deal');
const Customer = require('../models/Customer');
const AppError = require('../utils/appError');
const { recordTimeline } = require('./timeline.service');
const { ROLES, ACTIVITY_STATUSES, TIMELINE_ACTIONS } = require('../constants/roles');

/**
 * Validate that the referenced entity exists
 */
const validateEntityExists = async (entityType, entityId) => {
  let entity;
  switch (entityType) {
    case 'Lead':
      entity = await Lead.findById(entityId);
      break;
    case 'Deal':
      entity = await Deal.findById(entityId);
      break;
    case 'Customer':
    case 'Contact':
      entity = await Customer.findById(entityId);
      break;
    default:
      throw new AppError('Invalid entity type specified.', 400);
  }

  if (!entity) {
    throw new AppError(`${entityType} with ID ${entityId} does not exist.`, 404);
  }

  return entity;
};

/**
 * Create a new CRM activity / follow-up
 */
const createActivity = async (activityData, user) => {
  await validateEntityExists(activityData.entityType, activityData.entityId);

  const isSalesExec =
    user.role === ROLES.SALES_EXECUTIVE || user.role === 'sales_rep';

  const activity = await Activity.create({
    ...activityData,
    title: activityData.title || activityData.subject,
    subject: activityData.title || activityData.subject,
    dueDate: activityData.dueDate || activityData.scheduledAt,
    scheduledAt: activityData.dueDate || activityData.scheduledAt,
    assignedTo: activityData.assignedTo || user._id,
    performedBy: activityData.assignedTo || user._id,
    createdBy: user._id,
  });

  // Record in timeline
  const action = activity.type === 'Note' ? TIMELINE_ACTIONS.NOTE_ADDED : TIMELINE_ACTIONS.FOLLOW_UP_CREATED;
  await recordTimeline({
    action,
    entityType: activity.entityType === 'Contact' ? 'Customer' : activity.entityType,
    entityId: activity.entityId,
    performedBy: user._id,
    metadata: { activityType: activity.type, title: activity.title },
  });

  return activity.populate(['assignedTo', 'createdBy']);
};

/**
 * Get activities with filtering and dynamic overdue status
 */
const getActivities = async (queryParams, user) => {
  const {
    entityType,
    entityId,
    type,
    status,
    priority,
    assignedTo,
    startDate,
    endDate,
    page = 1,
    limit = 20,
  } = queryParams;

  const filter = {};

  if (entityType) filter.entityType = entityType;
  if (entityId) filter.entityId = entityId;
  if (type) filter.type = type;
  if (status) filter.status = status;
  if (priority) filter.priority = priority;

  const isSalesExec =
    user.role === ROLES.SALES_EXECUTIVE || user.role === 'sales_rep';

  if (isSalesExec) {
    filter.$or = [{ assignedTo: user._id }, { createdBy: user._id }];
  } else if (assignedTo) {
    filter.assignedTo = assignedTo;
  }

  if (startDate || endDate) {
    filter.dueDate = {};
    if (startDate) filter.dueDate.$gte = new Date(startDate);
    if (endDate) filter.dueDate.$lte = new Date(endDate);
  }

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  const [activities, total] = await Promise.all([
    Activity.find(filter)
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email')
      .sort({ dueDate: 1 })
      .skip(skip)
      .limit(limitNum),
    Activity.countDocuments(filter),
  ]);

  // Check and update overdue items in memory
  const now = new Date();
  activities.forEach((act) => {
    if (act.status === ACTIVITY_STATUSES.PENDING && act.dueDate && new Date(act.dueDate) < now) {
      act.status = ACTIVITY_STATUSES.OVERDUE;
    }
  });

  const { buildPaginationMeta } = require('../utils/pagination');

  return {
    activities,
    meta: buildPaginationMeta(total, pageNum, limitNum),
  };
};

/**
 * Get activity by ID
 */
const getActivityById = async (id, user) => {
  const activity = await Activity.findById(id)
    .populate('assignedTo', 'name email role')
    .populate('createdBy', 'name email');

  if (!activity) {
    throw new AppError('Activity not found.', 404);
  }

  const isSalesExec =
    user.role === ROLES.SALES_EXECUTIVE || user.role === 'sales_rep';

  if (
    isSalesExec &&
    activity.assignedTo?._id?.toString() !== user._id.toString() &&
    activity.createdBy?._id?.toString() !== user._id.toString()
  ) {
    throw new AppError('You do not have permission to view this activity.', 403);
  }

  return activity;
};

/**
 * Update activity details
 */
const updateActivity = async (id, updateData, user) => {
  const activity = await Activity.findById(id);

  if (!activity) {
    throw new AppError('Activity not found.', 404);
  }

  const isSalesExec =
    user.role === ROLES.SALES_EXECUTIVE || user.role === 'sales_rep';

  if (
    isSalesExec &&
    activity.assignedTo?.toString() !== user._id.toString() &&
    activity.createdBy?.toString() !== user._id.toString()
  ) {
    throw new AppError('You do not have permission to edit this activity.', 403);
  }

  Object.assign(activity, updateData);
  await activity.save();

  return activity.populate(['assignedTo', 'createdBy']);
};

/**
 * Mark activity as completed
 */
const updateActivityStatus = async (id, status, outcome, user) => {
  const activity = await Activity.findById(id);

  if (!activity) {
    throw new AppError('Activity not found.', 404);
  }

  const isSalesExec =
    user.role === ROLES.SALES_EXECUTIVE || user.role === 'sales_rep';

  if (
    isSalesExec &&
    activity.assignedTo?.toString() !== user._id.toString() &&
    activity.createdBy?.toString() !== user._id.toString()
  ) {
    throw new AppError('You do not have permission to update this activity.', 403);
  }

  activity.status = status;
  if (outcome !== undefined) {
    activity.outcome = outcome;
  }
  if (status === ACTIVITY_STATUSES.COMPLETED) {
    activity.completedDate = new Date();

    // Record follow-up completed in timeline
    await recordTimeline({
      action: TIMELINE_ACTIONS.FOLLOW_UP_COMPLETED,
      entityType: activity.entityType === 'Contact' ? 'Customer' : activity.entityType,
      entityId: activity.entityId,
      performedBy: user._id,
      metadata: { outcome },
    });
  }

  await activity.save();

  return activity.populate(['assignedTo', 'createdBy']);
};

/**
 * Delete activity
 */
const deleteActivity = async (id, user) => {
  const activity = await Activity.findById(id);

  if (!activity) {
    throw new AppError('Activity not found.', 404);
  }

  const isSalesExec =
    user.role === ROLES.SALES_EXECUTIVE || user.role === 'sales_rep';

  if (isSalesExec && activity.createdBy.toString() !== user._id.toString()) {
    throw new AppError('You do not have permission to delete this activity.', 403);
  }

  await Activity.findByIdAndDelete(id);
  return true;
};

module.exports = {
  createActivity,
  getActivities,
  getActivityById,
  updateActivity,
  updateActivityStatus,
  deleteActivity,
};
