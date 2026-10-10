const Deal = require('../models/Deal');
const Activity = require('../models/Activity');
const AppError = require('../utils/appError');
const { recordTimeline } = require('./timeline.service');
const {
  ROLES,
  DEAL_STAGES,
  DEAL_STAGE_PROBABILITIES,
  TIMELINE_ACTIONS,
} = require('../constants/roles');

/**
 * Create a new deal
 */
const createDeal = async (dealData, user) => {
  // Validate closing date is in the future
  const closingDate = new Date(dealData.expectedClosingDate || dealData.expectedCloseDate);
  if (isNaN(closingDate.getTime())) {
    throw new AppError('A valid expected closing date is required.', 400);
  }

  const isSalesExec =
    user.role === ROLES.SALES_EXECUTIVE || user.role === 'sales_rep';

  const deal = await Deal.create({
    ...dealData,
    dealName: dealData.dealName || dealData.title,
    title: dealData.dealName || dealData.title,
    dealValue: dealData.dealValue || dealData.value,
    value: dealData.dealValue || dealData.value,
    expectedClosingDate: closingDate,
    createdBy: user._id,
    assignedTo: dealData.assignedTo || (isSalesExec ? user._id : dealData.assignedTo),
  });

  await recordTimeline({
    action: TIMELINE_ACTIONS.DEAL_CREATED,
    entityType: 'Deal',
    entityId: deal._id,
    performedBy: user._id,
    newValue: {
      dealName: deal.dealName,
      dealValue: deal.dealValue,
      stage: deal.currentStage,
    },
  });

  return deal.populate(['assignedTo', 'customer', 'lead', 'createdBy']);
};

/**
 * Get deals with search, filter, pagination, and RBAC
 */
const getDeals = async (queryParams, user) => {
  const {
    search,
    stage,
    currentStage,
    assignedTo,
    customer,
    lead,
    minAmount,
    maxAmount,
    startDate,
    endDate,
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = queryParams;

  const filter = {};

  const isSalesExec =
    user.role === ROLES.SALES_EXECUTIVE || user.role === 'sales_rep';

  if (isSalesExec) {
    filter.$or = [{ assignedTo: user._id }, { createdBy: user._id }];
  } else if (assignedTo) {
    filter.assignedTo = assignedTo;
  }

  const stageFilter = stage || currentStage;
  if (stageFilter) {
    filter.$or = [{ currentStage: stageFilter }, { stage: stageFilter }];
  }

  if (customer) filter.customer = customer;
  if (lead) filter.lead = lead;

  if (minAmount || maxAmount) {
    filter.dealValue = {};
    if (minAmount) filter.dealValue.$gte = Number(minAmount);
    if (maxAmount) filter.dealValue.$lte = Number(maxAmount);
  }

  if (startDate || endDate) {
    filter.expectedClosingDate = {};
    if (startDate) filter.expectedClosingDate.$gte = new Date(startDate);
    if (endDate) filter.expectedClosingDate.$lte = new Date(endDate);
  }

  if (search) {
    const searchRegex = { $regex: search, $options: 'i' };
    const searchFilter = [{ dealName: searchRegex }, { title: searchRegex }, { description: searchRegex }];

    if (filter.$or) {
      filter.$and = [{ $or: filter.$or }, { $or: searchFilter }];
      delete filter.$or;
    } else {
      filter.$or = searchFilter;
    }
  }

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;
  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [deals, total] = await Promise.all([
    Deal.find(filter)
      .populate('assignedTo', 'name email role')
      .populate('customer', 'name email company phone')
      .populate('lead', 'name company email')
      .populate('createdBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(limitNum),
    Deal.countDocuments(filter),
  ]);

  const { buildPaginationMeta } = require('../utils/pagination');

  return {
    deals,
    meta: buildPaginationMeta(total, pageNum, limitNum),
  };
};

/**
 * Get single deal by ID with activities and timeline history
 */
const getDealById = async (id, user) => {
  const deal = await Deal.findById(id)
    .populate('assignedTo', 'name email role department')
    .populate('customer', 'name email company phone address')
    .populate('lead', 'name company email phone status')
    .populate('createdBy', 'name email');

  if (!deal) {
    throw new AppError('Deal not found.', 404);
  }

  const isSalesExec =
    user.role === ROLES.SALES_EXECUTIVE || user.role === 'sales_rep';

  if (
    isSalesExec &&
    deal.assignedTo?._id?.toString() !== user._id.toString() &&
    deal.createdBy?._id?.toString() !== user._id.toString()
  ) {
    throw new AppError('You do not have permission to view this deal.', 403);
  }

  const [activities, timeline] = await Promise.all([
    Activity.find({ entityType: 'Deal', entityId: deal._id })
      .populate('assignedTo', 'name email')
      .sort({ dueDate: -1 }),
    require('./timeline.service').getTimelineForEntity('Deal', deal._id),
  ]);

  return {
    deal,
    activities,
    timeline,
  };
};

/**
 * Update deal details
 */
const updateDeal = async (id, updateData, user) => {
  const deal = await Deal.findById(id);

  if (!deal) {
    throw new AppError('Deal not found.', 404);
  }

  const isSalesExec =
    user.role === ROLES.SALES_EXECUTIVE || user.role === 'sales_rep';

  if (
    isSalesExec &&
    deal.assignedTo?.toString() !== user._id.toString() &&
    deal.createdBy?.toString() !== user._id.toString()
  ) {
    throw new AppError('You do not have permission to edit this deal.', 403);
  }

  // Enforce Business Rule 1: A closed Won or Lost deal cannot be freely moved back to active stages
  const currentDealStage = deal.currentStage || deal.stage;
  const isCurrentlyClosed =
    currentDealStage === DEAL_STAGES.WON || currentDealStage === DEAL_STAGES.LOST;

  const targetStage = updateData.currentStage || updateData.stage;
  if (isCurrentlyClosed && targetStage && targetStage !== currentDealStage) {
    throw new AppError('A closed Won or Lost deal cannot be moved back to an active stage.', 400);
  }

  // Enforce Business Rule 2: Lost deal requires lostReason
  if (targetStage === DEAL_STAGES.LOST) {
    const reason = updateData.lostReason || deal.lostReason;
    if (!reason || !reason.trim()) {
      throw new AppError('A valid reason is required when marking a deal as Lost.', 400);
    }
  }

  // Check assignment change
  if (updateData.assignedTo && updateData.assignedTo !== deal.assignedTo?.toString()) {
    await recordTimeline({
      action: TIMELINE_ACTIONS.DEAL_ASSIGNED,
      entityType: 'Deal',
      entityId: deal._id,
      performedBy: user._id,
      previousValue: deal.assignedTo,
      newValue: updateData.assignedTo,
    });
  }

  Object.assign(deal, updateData);
  await deal.save();

  return deal.populate(['assignedTo', 'customer', 'lead', 'createdBy']);
};

/**
 * Update deal stage with strict business rules
 */
const updateDealStage = async (id, newStage, options = {}, user) => {
  const deal = await Deal.findById(id);

  if (!deal) {
    throw new AppError('Deal not found.', 404);
  }

  const isSalesExec =
    user.role === ROLES.SALES_EXECUTIVE || user.role === 'sales_rep';

  if (
    isSalesExec &&
    deal.assignedTo?.toString() !== user._id.toString() &&
    deal.createdBy?.toString() !== user._id.toString()
  ) {
    throw new AppError('You do not have permission to update this deal stage.', 403);
  }

  const previousStage = deal.currentStage || deal.stage;

  // Business Rule 1: Cannot move closed Won/Lost back to active stages
  if (
    (previousStage === DEAL_STAGES.WON || previousStage === DEAL_STAGES.LOST) &&
    newStage !== previousStage
  ) {
    throw new AppError('A closed Won or Lost deal cannot be moved back to an active stage.', 400);
  }

  // Business Rule 2: Lost reason required
  if (newStage === DEAL_STAGES.LOST) {
    const reason = options.lostReason || deal.lostReason;
    if (!reason || !reason.trim()) {
      throw new AppError('A valid reason is required when marking a deal as Lost.', 400);
    }
    deal.lostReason = reason;
  }

  deal.currentStage = newStage;
  deal.stage = newStage;

  if (options.probability !== undefined) {
    deal.probability = options.probability;
  } else {
    deal.probability = DEAL_STAGE_PROBABILITIES[newStage] ?? deal.probability;
  }

  if (newStage === DEAL_STAGES.WON || newStage === DEAL_STAGES.LOST) {
    deal.actualClosingDate = new Date();
  }

  await deal.save();

  // Record timeline event
  let action = TIMELINE_ACTIONS.DEAL_STAGE_CHANGED;
  if (newStage === DEAL_STAGES.WON) action = TIMELINE_ACTIONS.DEAL_WON;
  if (newStage === DEAL_STAGES.LOST) action = TIMELINE_ACTIONS.DEAL_LOST;

  await recordTimeline({
    action,
    entityType: 'Deal',
    entityId: deal._id,
    performedBy: user._id,
    previousValue: previousStage,
    newValue: newStage,
    metadata: {
      probability: deal.probability,
      lostReason: deal.lostReason || null,
    },
  });

  return deal.populate(['assignedTo', 'customer', 'lead', 'createdBy']);
};

/**
 * Delete deal
 */
const deleteDeal = async (id, user) => {
  const deal = await Deal.findById(id);

  if (!deal) {
    throw new AppError('Deal not found.', 404);
  }

  const isSalesExec =
    user.role === ROLES.SALES_EXECUTIVE || user.role === 'sales_rep';

  if (isSalesExec && deal.createdBy.toString() !== user._id.toString()) {
    throw new AppError('You do not have permission to delete this deal.', 403);
  }

  await Deal.findByIdAndDelete(id);
  return true;
};

/**
 * Pipeline Summary showing deals count & total value per stage
 */
const getPipelineSummary = async (user) => {
  const match = {};
  const isSalesExec =
    user.role === ROLES.SALES_EXECUTIVE || user.role === 'sales_rep';

  if (isSalesExec) {
    match.$or = [{ assignedTo: user._id }, { createdBy: user._id }];
  }

  const pipeline = [
    { $match: match },
    {
      $group: {
        _id: { $ifNull: ['$currentStage', '$stage'] },
        totalDeals: { $sum: 1 },
        totalValue: { $sum: { $ifNull: ['$dealValue', '$value'] } },
        avgProbability: { $avg: '$probability' },
        weightedExpectedRevenue: {
          $sum: {
            $multiply: [
              { $ifNull: ['$dealValue', '$value'] },
              { $divide: ['$probability', 100] },
            ],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        stage: '$_id',
        totalDeals: 1,
        totalValue: 1,
        avgProbability: { $round: ['$avgProbability', 1] },
        weightedExpectedRevenue: { $round: ['$weightedExpectedRevenue', 2] },
      },
    },
  ];

  const stageBreakdown = await Deal.aggregate(pipeline);

  let grandTotalValue = 0;
  let grandTotalDeals = 0;
  let grandTotalExpectedRevenue = 0;

  stageBreakdown.forEach((item) => {
    grandTotalValue += item.totalValue;
    grandTotalDeals += item.totalDeals;
    grandTotalExpectedRevenue += item.weightedExpectedRevenue;
  });

  return {
    stageBreakdown,
    summary: {
      totalDeals: grandTotalDeals,
      totalPipelineValue: grandTotalValue,
      totalExpectedRevenue: Math.round(grandTotalExpectedRevenue * 100) / 100,
    },
  };
};

module.exports = {
  createDeal,
  getDeals,
  getDealById,
  updateDeal,
  updateDealStage,
  deleteDeal,
  getPipelineSummary,
};
