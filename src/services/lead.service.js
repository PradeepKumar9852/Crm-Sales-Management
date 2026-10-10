const mongoose = require('mongoose');
const Lead = require('../models/Lead');
const Customer = require('../models/Customer');
const Deal = require('../models/Deal');
const Activity = require('../models/Activity');
const User = require('../models/User');
const AppError = require('../utils/appError');
const { recordTimeline } = require('./timeline.service');
const {
  ROLES,
  LEAD_STATUS,
  DEAL_STAGES,
  TIMELINE_ACTIONS,
} = require('../constants/roles');

/**
 * Create a new lead
 */
const createLead = async (leadData, user) => {
  // If assigning to a user, verify target user is active
  if (leadData.assignedTo) {
    const targetUser = await User.findById(leadData.assignedTo);
    if (!targetUser || !targetUser.isActive) {
      throw new AppError('Cannot assign lead to an inactive or non-existent user.', 400);
    }
  }

  const isSalesExec =
    user.role === ROLES.SALES_EXECUTIVE || user.role === 'sales_rep';

  const lead = await Lead.create({
    ...leadData,
    name: leadData.name || leadData.title || leadData.contactName,
    createdBy: user._id,
    assignedTo: leadData.assignedTo || (isSalesExec ? user._id : undefined),
  });

  // Record timeline event
  await recordTimeline({
    action: TIMELINE_ACTIONS.LEAD_CREATED,
    entityType: 'Lead',
    entityId: lead._id,
    performedBy: user._id,
    newValue: { status: lead.status, priority: lead.priority, assignedTo: lead.assignedTo },
  });

  return lead.populate(['assignedTo', 'createdBy']);
};

/**
 * Query leads with search, multi-filters, date-range, and pagination
 */
const getLeads = async (queryParams, user) => {
  const {
    search,
    status,
    priority,
    source,
    assignedTo,
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

  // Role scoping: sales executives only view their assigned or created leads
  if (isSalesExec) {
    filter.$or = [{ assignedTo: user._id }, { createdBy: user._id }];
  } else if (assignedTo) {
    filter.assignedTo = assignedTo;
  }

  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (source) filter.source = source;

  // Date range filtering
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  // Keyword search
  if (search) {
    const searchRegex = { $regex: search, $options: 'i' };
    const searchFilter = [
      { name: searchRegex },
      { company: searchRegex },
      { email: searchRegex },
      { phone: searchRegex },
    ];

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

  const [leads, total] = await Promise.all([
    Lead.find(filter)
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(limitNum),
    Lead.countDocuments(filter),
  ]);

  const { buildPaginationMeta } = require('../utils/pagination');

  return {
    leads,
    meta: buildPaginationMeta(total, pageNum, limitNum),
  };
};

/**
 * Get single lead by ID with populated relations, activities, and timeline history
 */
const getLeadById = async (id, user) => {
  const lead = await Lead.findById(id)
    .populate('assignedTo', 'name email role department')
    .populate('createdBy', 'name email')
    .populate('convertedCustomer')
    .populate('convertedDeal');

  if (!lead) {
    throw new AppError('Lead not found.', 404);
  }

  const isSalesExec =
    user.role === ROLES.SALES_EXECUTIVE || user.role === 'sales_rep';

  if (
    isSalesExec &&
    lead.assignedTo?._id?.toString() !== user._id.toString() &&
    lead.createdBy?._id?.toString() !== user._id.toString()
  ) {
    throw new AppError('You do not have permission to view this lead.', 403);
  }

  const [activities, timeline] = await Promise.all([
    Activity.find({ entityType: 'Lead', entityId: lead._id })
      .populate('assignedTo', 'name email')
      .sort({ dueDate: -1 }),
    require('./timeline.service').getTimelineForEntity('Lead', lead._id),
  ]);

  return {
    lead,
    activities,
    timeline,
  };
};

/**
 * Update an existing lead
 */
const updateLead = async (id, updateData, user) => {
  const lead = await Lead.findById(id);

  if (!lead) {
    throw new AppError('Lead not found.', 404);
  }

  const isSalesExec =
    user.role === ROLES.SALES_EXECUTIVE || user.role === 'sales_rep';

  if (
    isSalesExec &&
    lead.assignedTo?.toString() !== user._id.toString() &&
    lead.createdBy?.toString() !== user._id.toString()
  ) {
    throw new AppError('You do not have permission to edit this lead.', 403);
  }

  // Record priority or status changes in timeline if modified
  if (updateData.priority && updateData.priority !== lead.priority) {
    await recordTimeline({
      action: TIMELINE_ACTIONS.LEAD_PRIORITY_CHANGED,
      entityType: 'Lead',
      entityId: lead._id,
      performedBy: user._id,
      previousValue: lead.priority,
      newValue: updateData.priority,
    });
  }

  Object.assign(lead, updateData);
  await lead.save();

  return lead.populate(['assignedTo', 'createdBy']);
};

/**
 * Assign or reassign lead to a sales executive
 */
const assignLead = async (id, assignedToUserId, user) => {
  const isSalesExec =
    user.role === ROLES.SALES_EXECUTIVE || user.role === 'sales_rep';

  if (isSalesExec) {
    throw new AppError('Only administrators or managers can assign or reassign leads.', 403);
  }

  // Validate that the assigned user exists and is active
  const targetUser = await User.findById(assignedToUserId);
  if (!targetUser) {
    throw new AppError('Target user does not exist.', 404);
  }
  if (!targetUser.isActive) {
    throw new AppError('Cannot assign lead to an inactive user account.', 400);
  }

  const lead = await Lead.findById(id);
  if (!lead) {
    throw new AppError('Lead not found.', 404);
  }

  const previousAssigned = lead.assignedTo;
  lead.assignedTo = assignedToUserId;
  await lead.save();

  // Record assignment / reassignment in timeline
  const action = previousAssigned ? TIMELINE_ACTIONS.LEAD_REASSIGNED : TIMELINE_ACTIONS.LEAD_ASSIGNED;
  await recordTimeline({
    action,
    entityType: 'Lead',
    entityId: lead._id,
    performedBy: user._id,
    previousValue: previousAssigned,
    newValue: assignedToUserId,
    metadata: { assignedToName: targetUser.name },
  });

  return lead.populate(['assignedTo', 'createdBy']);
};

/**
 * Update lead status
 */
const changeLeadStatus = async (id, status, user) => {
  const lead = await Lead.findById(id);

  if (!lead) {
    throw new AppError('Lead not found.', 404);
  }

  const isSalesExec =
    user.role === ROLES.SALES_EXECUTIVE || user.role === 'sales_rep';

  if (
    isSalesExec &&
    lead.assignedTo?.toString() !== user._id.toString() &&
    lead.createdBy?.toString() !== user._id.toString()
  ) {
    throw new AppError('You do not have permission to change status of this lead.', 403);
  }

  const previousStatus = lead.status;
  lead.status = status;
  await lead.save();

  // Record timeline event
  await recordTimeline({
    action: TIMELINE_ACTIONS.LEAD_STATUS_CHANGED,
    entityType: 'Lead',
    entityId: lead._id,
    performedBy: user._id,
    previousValue: previousStatus,
    newValue: status,
  });

  return lead.populate(['assignedTo', 'createdBy']);
};

/**
 * Update lead priority
 */
const changeLeadPriority = async (id, priority, user) => {
  const lead = await Lead.findById(id);

  if (!lead) {
    throw new AppError('Lead not found.', 404);
  }

  const isSalesExec =
    user.role === ROLES.SALES_EXECUTIVE || user.role === 'sales_rep';

  if (
    isSalesExec &&
    lead.assignedTo?.toString() !== user._id.toString() &&
    lead.createdBy?.toString() !== user._id.toString()
  ) {
    throw new AppError('You do not have permission to change priority of this lead.', 403);
  }

  const previousPriority = lead.priority;
  lead.priority = priority;
  await lead.save();

  // Record timeline event
  await recordTimeline({
    action: TIMELINE_ACTIONS.LEAD_PRIORITY_CHANGED,
    entityType: 'Lead',
    entityId: lead._id,
    performedBy: user._id,
    previousValue: previousPriority,
    newValue: priority,
  });

  return lead.populate(['assignedTo', 'createdBy']);
};

/**
 * Convert lead into a Customer and Deal
 */
const convertLead = async (id, conversionData, user) => {
  const lead = await Lead.findById(id);

  if (!lead) {
    throw new AppError('Lead not found.', 404);
  }

  const isSalesExec =
    user.role === ROLES.SALES_EXECUTIVE || user.role === 'sales_rep';

  if (
    isSalesExec &&
    lead.assignedTo?.toString() !== user._id.toString() &&
    lead.createdBy?.toString() !== user._id.toString()
  ) {
    throw new AppError('You do not have permission to convert this lead.', 403);
  }

  if (lead.isConverted || lead.status === LEAD_STATUS.CONVERTED) {
    throw new AppError('This lead has already been converted and cannot be converted again.', 400);
  }

  // Ensure lead is in an eligible status for conversion
  if (lead.status !== LEAD_STATUS.QUALIFIED && lead.status !== LEAD_STATUS.WON) {
    throw new AppError(`Only qualified leads can be converted. Current status: '${lead.status}'.`, 400);
  }

  // Check if transactions are supported by deployment (ReplicaSet or Mongos)
  const supportsTransactions = Boolean(
    mongoose.connection.client?.topology?.description?.setName ||
    mongoose.connection.client?.topology?.description?.type === 'Sharded' ||
    mongoose.connection.client?.topology?.description?.type === 'ReplicaSetWithPrimary'
  );

  let session = null;
  let hasTransaction = false;

  if (supportsTransactions) {
    try {
      session = await mongoose.startSession();
      session.startTransaction();
      hasTransaction = true;
    } catch (err) {
      if (session) {
        session.endSession();
        session = null;
      }
    }
  }

  let createdCustomer = null;
  let createdDeal = null;

  try {
    // 1. Create or link Customer
    let customer = null;
    if (lead.email) {
      const query = Customer.findOne({ email: lead.email.toLowerCase() });
      if (hasTransaction) query.session(session);
      customer = await query;
    }

    if (!customer) {
      const customerPayload = {
        name: lead.name,
        email: lead.email || `customer_${lead._id}@crm.internal`,
        phone: lead.phone,
        company: lead.company,
        lead: lead._id,
        assignedTo: lead.assignedTo || user._id,
        createdBy: user._id,
        status: 'Active',
      };

      if (hasTransaction) {
        const [newCust] = await Customer.create([customerPayload], { session });
        customer = newCust;
      } else {
        customer = await Customer.create(customerPayload);
      }
      createdCustomer = customer;

      await recordTimeline({
        action: TIMELINE_ACTIONS.CUSTOMER_CREATED,
        entityType: 'Customer',
        entityId: customer._id,
        performedBy: user._id,
        metadata: { fromLeadId: lead._id },
      });
    }

    // 2. Create Deal if requested
    let deal = null;
    if (conversionData.createDeal !== false) {
      const dealTitle = conversionData.dealName || conversionData.dealTitle || `${lead.company || lead.name} - Deal`;
      const dealAmount = conversionData.dealValue ?? conversionData.value ?? (lead.estimatedValue || 5000);

      const dealPayload = {
        dealName: dealTitle,
        title: dealTitle,
        dealValue: dealAmount,
        value: dealAmount,
        currentStage: DEAL_STAGES.QUALIFICATION,
        stage: DEAL_STAGES.QUALIFICATION,
        expectedClosingDate:
          conversionData.expectedClosingDate ||
          conversionData.expectedCloseDate ||
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        customer: customer._id,
        lead: lead._id,
        assignedTo: lead.assignedTo || user._id,
        createdBy: user._id,
        description: `Deal converted from qualified lead: ${lead.name}`,
      };

      if (hasTransaction) {
        const [newDeal] = await Deal.create([dealPayload], { session });
        deal = newDeal;
      } else {
        deal = await Deal.create(dealPayload);
      }
      createdDeal = deal;

      await recordTimeline({
        action: TIMELINE_ACTIONS.DEAL_CREATED,
        entityType: 'Deal',
        entityId: deal._id,
        performedBy: user._id,
        metadata: { dealName: deal.dealName, dealValue: deal.dealValue },
      });
    }

    // 3. Update lead status to Converted & link records
    lead.status = LEAD_STATUS.CONVERTED;
    lead.isConverted = true;
    lead.convertedAt = new Date();
    lead.convertedCustomer = customer._id;
    if (deal) lead.convertedDeal = deal._id;

    if (hasTransaction) {
      await lead.save({ session });
      await session.commitTransaction();
    } else {
      await lead.save();
    }

    // 4. Record lead conversion in timeline
    await recordTimeline({
      action: TIMELINE_ACTIONS.LEAD_CONVERTED,
      entityType: 'Lead',
      entityId: lead._id,
      performedBy: user._id,
      newValue: {
        customerId: customer._id,
        dealId: deal ? deal._id : null,
      },
    });

    return {
      lead,
      customer,
      deal,
    };
  } catch (error) {
    if (hasTransaction) {
      await session.abortTransaction();
    } else {
      // Manual cleanup for non-transactional database to prevent partial/orphaned records
      if (createdDeal) {
        await Deal.findByIdAndDelete(createdDeal._id).catch(() => {});
      }
      if (createdCustomer && !lead.email) {
        await Customer.findByIdAndDelete(createdCustomer._id).catch(() => {});
      }
    }
    throw error;
  } finally {
    if (session) {
      session.endSession();
    }
  }
};

/**
 * Delete a lead
 */
const deleteLead = async (id, user) => {
  const lead = await Lead.findById(id);

  if (!lead) {
    throw new AppError('Lead not found.', 404);
  }

  const isSalesExec =
    user.role === ROLES.SALES_EXECUTIVE || user.role === 'sales_rep';

  if (isSalesExec && lead.createdBy.toString() !== user._id.toString()) {
    throw new AppError('You do not have permission to delete this lead.', 403);
  }

  await Lead.findByIdAndDelete(id);
  return true;
};

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
