const Customer = require('../models/Customer');
const Deal = require('../models/Deal');
const Activity = require('../models/Activity');
const User = require('../models/User');
const AppError = require('../utils/appError');
const { recordTimeline, getTimelineForEntity } = require('./timeline.service');
const { ROLES, TIMELINE_ACTIONS } = require('../constants/roles');

/**
 * Create a new customer
 */
const createCustomer = async (customerData, user) => {
  const existing = await Customer.findOne({ email: customerData.email.toLowerCase() });
  if (existing) {
    throw new AppError('A customer with this email address already exists.', 409);
  }

  if (customerData.assignedTo) {
    const targetUser = await User.findById(customerData.assignedTo);
    if (!targetUser || !targetUser.isActive) {
      throw new AppError('Cannot assign customer to an inactive or non-existent user.', 400);
    }
  }

  const isSalesExec =
    user.role === ROLES.SALES_EXECUTIVE || user.role === 'sales_rep';

  const customer = await Customer.create({
    ...customerData,
    email: customerData.email.toLowerCase(),
    createdBy: user._id,
    assignedTo: customerData.assignedTo || (isSalesExec ? user._id : user._id),
  });

  await recordTimeline({
    action: TIMELINE_ACTIONS.CUSTOMER_CREATED,
    entityType: 'Customer',
    entityId: customer._id,
    performedBy: user._id,
    newValue: { name: customer.name, email: customer.email },
  });

  return customer.populate(['assignedTo', 'createdBy', 'lead']);
};

/**
 * Get customers with search, filtering, date range, pagination
 */
const getCustomers = async (queryParams, user) => {
  const {
    search,
    status,
    company,
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

  if (isSalesExec) {
    filter.$or = [{ assignedTo: user._id }, { createdBy: user._id }];
  } else if (assignedTo) {
    filter.assignedTo = assignedTo;
  }

  if (status) filter.status = status;
  if (company) filter.company = { $regex: company, $options: 'i' };

  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  if (search) {
    const searchRegex = { $regex: search, $options: 'i' };
    const searchFilter = [
      { name: searchRegex },
      { email: searchRegex },
      { company: searchRegex },
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

  const [customers, total] = await Promise.all([
    Customer.find(filter)
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email')
      .populate('lead', 'name company source status')
      .sort(sort)
      .skip(skip)
      .limit(limitNum),
    Customer.countDocuments(filter),
  ]);

  const { buildPaginationMeta } = require('../utils/pagination');

  return {
    customers,
    meta: buildPaginationMeta(total, pageNum, limitNum),
  };
};

/**
 * Get customer by ID with deals, activities, and timeline history
 */
const getCustomerById = async (id, user) => {
  const customer = await Customer.findById(id)
    .populate('assignedTo', 'name email role department')
    .populate('createdBy', 'name email')
    .populate('lead');

  if (!customer) {
    throw new AppError('Customer not found.', 404);
  }

  const isSalesExec =
    user.role === ROLES.SALES_EXECUTIVE || user.role === 'sales_rep';

  if (
    isSalesExec &&
    customer.assignedTo?._id?.toString() !== user._id.toString() &&
    customer.createdBy?._id?.toString() !== user._id.toString()
  ) {
    throw new AppError('You do not have permission to view this customer.', 403);
  }

  const [deals, activities, timeline] = await Promise.all([
    Deal.find({ customer: customer._id }).sort({ createdAt: -1 }),
    Activity.find({ entityType: 'Customer', entityId: customer._id }).sort({ dueDate: -1 }),
    getTimelineForEntity('Customer', customer._id),
  ]);

  return {
    customer,
    deals,
    activities,
    timeline,
  };
};

/**
 * Update customer
 */
const updateCustomer = async (id, updateData, user) => {
  const customer = await Customer.findById(id);

  if (!customer) {
    throw new AppError('Customer not found.', 404);
  }

  const isSalesExec =
    user.role === ROLES.SALES_EXECUTIVE || user.role === 'sales_rep';

  if (
    isSalesExec &&
    customer.assignedTo?.toString() !== user._id.toString() &&
    customer.createdBy?.toString() !== user._id.toString()
  ) {
    throw new AppError('You do not have permission to edit this customer.', 403);
  }

  if (updateData.assignedTo && updateData.assignedTo !== customer.assignedTo?.toString()) {
    const targetUser = await User.findById(updateData.assignedTo);
    if (!targetUser || !targetUser.isActive) {
      throw new AppError('Cannot reassign customer to an inactive or non-existent user.', 400);
    }
  }

  if (updateData.email) {
    updateData.email = updateData.email.toLowerCase();
    const existing = await Customer.findOne({ email: updateData.email, _id: { $ne: id } });
    if (existing) {
      throw new AppError('Email address already in use by another customer.', 409);
    }
  }

  Object.assign(customer, updateData);
  await customer.save();

  return customer.populate(['assignedTo', 'createdBy', 'lead']);
};

/**
 * Delete customer
 */
const deleteCustomer = async (id, user) => {
  const customer = await Customer.findById(id);

  if (!customer) {
    throw new AppError('Customer not found.', 404);
  }

  const isSalesExec =
    user.role === ROLES.SALES_EXECUTIVE || user.role === 'sales_rep';

  if (isSalesExec && customer.createdBy.toString() !== user._id.toString()) {
    throw new AppError('You do not have permission to delete this customer.', 403);
  }

  const linkedDeals = await Deal.countDocuments({ customer: id });
  if (linkedDeals > 0) {
    throw new AppError('Cannot delete customer with associated deals attached.', 400);
  }

  await Customer.findByIdAndDelete(id);
  return true;
};

module.exports = {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
};
