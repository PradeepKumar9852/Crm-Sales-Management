const mongoose = require('mongoose');
const Lead = require('../models/Lead');
const Deal = require('../models/Deal');
const Customer = require('../models/Customer');
const Activity = require('../models/Activity');
const User = require('../models/User');
const {
  ROLES,
  LEAD_STATUS,
  DEAL_STAGES,
  DEAL_STAGE_LIST,
  ACTIVITY_STATUSES,
} = require('../constants/roles');

/**
 * Build user-scoped query filter based on role and identity
 */
const buildScope = (user) => {
  const isSalesExec =
    user.role === ROLES.SALES_EXECUTIVE || user.role === 'sales_rep';

  if (!isSalesExec) {
    return { queryScope: {}, aggScope: {} };
  }

  const userId = new mongoose.Types.ObjectId(user._id);
  return {
    queryScope: { $or: [{ assignedTo: user._id }, { createdBy: user._id }] },
    aggScope: { $or: [{ assignedTo: userId }, { createdBy: userId }] },
  };
};

/**
 * Lead Analytics & Conversion Rate
 */
const getLeadAnalytics = async (user) => {
  const { queryScope } = buildScope(user);

  const [totalLeads, newLeads, qualifiedLeads, convertedLeads] = await Promise.all([
    Lead.countDocuments(queryScope),
    Lead.countDocuments({ ...queryScope, status: LEAD_STATUS.NEW }),
    Lead.countDocuments({ ...queryScope, status: LEAD_STATUS.QUALIFIED }),
    Lead.countDocuments({
      ...queryScope,
      $or: [
        { isConverted: true },
        { status: LEAD_STATUS.CONVERTED },
        { status: 'Won' },
      ],
    }),
  ]);

  const conversionRate =
    totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;

  return {
    totalLeads,
    newLeads,
    qualifiedLeads,
    convertedLeads,
    conversionRate: `${conversionRate}%`,
    conversionRateNumeric: conversionRate,
  };
};

/**
 * Deal Analytics & Revenue Financials
 */
const getDealAnalytics = async (user) => {
  const { queryScope, aggScope } = buildScope(user);

  const [totalDeals, wonDeals, lostDeals] = await Promise.all([
    Deal.countDocuments(queryScope),
    Deal.countDocuments({
      ...queryScope,
      $or: [{ currentStage: DEAL_STAGES.WON }, { stage: DEAL_STAGES.WON }],
    }),
    Deal.countDocuments({
      ...queryScope,
      $or: [{ currentStage: DEAL_STAGES.LOST }, { stage: DEAL_STAGES.LOST }],
    }),
  ]);

  const openDeals = Math.max(0, totalDeals - (wonDeals + lostDeals));

  // Total won revenue & total expected revenue aggregation
  const financialStats = await Deal.aggregate([
    { $match: aggScope },
    {
      $group: {
        _id: null,
        totalPipelineValue: { $sum: { $ifNull: ['$dealValue', '$value'] } },
        totalRevenueWon: {
          $sum: {
            $cond: [
              { $in: [{ $ifNull: ['$currentStage', '$stage'] }, [DEAL_STAGES.WON, 'Closed Won']] },
              { $ifNull: ['$dealValue', '$value'] },
              0,
            ],
          },
        },
        totalExpectedRevenue: {
          $sum: '$expectedRevenue',
        },
      },
    },
  ]);

  const financials = financialStats[0] || {
    totalPipelineValue: 0,
    totalRevenueWon: 0,
    totalExpectedRevenue: 0,
  };

  return {
    totalDeals,
    openDeals,
    wonDeals,
    lostDeals,
    totalRevenue: financials.totalRevenueWon,
    totalPipelineValue: financials.totalPipelineValue,
    expectedRevenue: financials.totalExpectedRevenue,
  };
};

/**
 * Sales Pipeline Breakdown across all stages
 */
const getPipelineBreakdown = async (user) => {
  const { aggScope } = buildScope(user);

  const pipelineStatsRaw = await Deal.aggregate([
    { $match: aggScope },
    {
      $group: {
        _id: { $ifNull: ['$currentStage', '$stage'] },
        count: { $sum: 1 },
        totalValue: { $sum: { $ifNull: ['$dealValue', '$value'] } },
      },
    },
  ]);

  const pipelineMap = pipelineStatsRaw.reduce((acc, curr) => {
    if (curr._id) {
      acc[curr._id] = { count: curr.count, value: curr.totalValue };
    }
    return acc;
  }, {});

  return DEAL_STAGE_LIST.map((stage) => ({
    stage,
    dealsCount: pipelineMap[stage]?.count || 0,
    totalValue: pipelineMap[stage]?.value || 0,
  }));
};

/**
 * Activity Analytics (Pending, Overdue, Completed)
 */
const getActivityAnalytics = async (user) => {
  const isSalesExec =
    user.role === ROLES.SALES_EXECUTIVE || user.role === 'sales_rep';
  const activityScope = isSalesExec
    ? { $or: [{ assignedTo: user._id }, { createdBy: user._id }] }
    : {};

  const now = new Date();

  const [pendingActivities, overdueActivities, completedActivities, totalActivities] = await Promise.all([
    Activity.countDocuments({
      ...activityScope,
      status: ACTIVITY_STATUSES.PENDING,
      $or: [{ dueDate: { $gte: now } }, { scheduledAt: { $gte: now } }],
    }),
    Activity.countDocuments({
      ...activityScope,
      $or: [
        { status: ACTIVITY_STATUSES.OVERDUE },
        {
          status: ACTIVITY_STATUSES.PENDING,
          $or: [{ dueDate: { $lt: now } }, { scheduledAt: { $lt: now } }],
        },
      ],
    }),
    Activity.countDocuments({
      ...activityScope,
      status: ACTIVITY_STATUSES.COMPLETED,
    }),
    Activity.countDocuments(activityScope),
  ]);

  return {
    pendingActivities,
    overdueActivities,
    completedActivities,
    totalActivities,
  };
};

/**
 * Get comprehensive sales analytics and KPI metrics
 */
const getDashboardMetrics = async (user) => {
  const { queryScope } = buildScope(user);

  const [
    leadStats,
    dealStats,
    pipelineBreakdown,
    activityStats,
    totalCustomers,
  ] = await Promise.all([
    getLeadAnalytics(user),
    getDealAnalytics(user),
    getPipelineBreakdown(user),
    getActivityAnalytics(user),
    Customer.countDocuments(queryScope),
  ]);

  return {
    metrics: {
      totalLeads: leadStats.totalLeads,
      newLeads: leadStats.newLeads,
      qualifiedLeads: leadStats.qualifiedLeads,
      convertedLeads: leadStats.convertedLeads,
      totalCustomers,
      totalDeals: dealStats.totalDeals,
      openDeals: dealStats.openDeals,
      wonDeals: dealStats.wonDeals,
      lostDeals: dealStats.lostDeals,
      totalRevenue: dealStats.totalRevenue,
      totalPipelineValue: dealStats.totalPipelineValue,
      expectedRevenue: dealStats.expectedRevenue,
      conversionRate: leadStats.conversionRate,
      pendingActivities: activityStats.pendingActivities,
      overdueActivities: activityStats.overdueActivities,
    },
    pipelineBreakdown,
  };
};

/**
 * Get Team-level performance analytics for Managers and Admins
 */
const getTeamPerformance = async () => {
  // Aggregate performance across all sales executives
  const salesUsers = await User.find({
    role: { $in: [ROLES.SALES_EXECUTIVE, 'sales_rep'] },
    isActive: true,
  }).select('name email role department');

  const teamData = await Promise.all(
    salesUsers.map(async (exec) => {
      const execId = new mongoose.Types.ObjectId(exec._id);

      const [
        leadsCount,
        wonDealsCount,
        wonRevenueAgg,
        openDealsCount,
        pendingActivitiesCount,
      ] = await Promise.all([
        Lead.countDocuments({ assignedTo: exec._id }),
        Deal.countDocuments({
          assignedTo: exec._id,
          $or: [{ currentStage: DEAL_STAGES.WON }, { stage: DEAL_STAGES.WON }],
        }),
        Deal.aggregate([
          {
            $match: {
              assignedTo: execId,
              $or: [{ currentStage: DEAL_STAGES.WON }, { stage: DEAL_STAGES.WON }],
            },
          },
          { $group: { _id: null, wonTotal: { $sum: { $ifNull: ['$dealValue', '$value'] } } } },
        ]),
        Deal.countDocuments({
          assignedTo: exec._id,
          $and: [
            { currentStage: { $nin: [DEAL_STAGES.WON, DEAL_STAGES.LOST] } },
            { stage: { $nin: [DEAL_STAGES.WON, DEAL_STAGES.LOST] } },
          ],
        }),
        Activity.countDocuments({
          assignedTo: exec._id,
          status: ACTIVITY_STATUSES.PENDING,
        }),
      ]);

      const wonRevenue = wonRevenueAgg[0]?.wonTotal || 0;
      const totalDeals = openDealsCount + wonDealsCount;
      const winRate = totalDeals > 0 ? Math.round((wonDealsCount / totalDeals) * 100) : 0;

      return {
        executive: {
          id: exec._id,
          name: exec.name,
          email: exec.email,
          department: exec.department,
        },
        assignedLeads: leadsCount,
        openDeals: openDealsCount,
        wonDeals: wonDealsCount,
        wonRevenue,
        winRate: `${winRate}%`,
        pendingActivities: pendingActivitiesCount,
      };
    })
  );

  return teamData;
};

module.exports = {
  getDashboardMetrics,
  getLeadAnalytics,
  getDealAnalytics,
  getPipelineBreakdown,
  getActivityAnalytics,
  getTeamPerformance,
};
