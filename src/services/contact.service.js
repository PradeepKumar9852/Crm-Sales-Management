const Contact = require('../models/Contact');
const Activity = require('../models/Activity');
const Deal = require('../models/Deal');
const AppError = require('../utils/appError');
const { ROLES } = require('../constants/roles');

/**
 * Create a new customer contact
 */
const createContact = async (contactData, user) => {
  const existingContact = await Contact.findOne({ email: contactData.email.toLowerCase() });
  if (existingContact) {
    throw new AppError('A contact with this email address already exists.', 409);
  }

  const contact = await Contact.create({
    ...contactData,
    email: contactData.email.toLowerCase(),
    createdBy: user._id,
    assignedTo: contactData.assignedTo || user._id,
  });

  return contact.populate(['assignedTo', 'createdBy']);
};

/**
 * Get contacts with search, filtering, pagination, and RBAC
 */
const getContacts = async (queryParams, user) => {
  const {
    search,
    status,
    type,
    company,
    assignedTo,
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

  if (status) {
    filter.status = status;
  }

  if (type) {
    filter.type = type;
  }

  if (company) {
    filter.company = { $regex: company, $options: 'i' };
  }

  if (search) {
    const searchRegex = { $regex: search, $options: 'i' };
    const searchFilter = [
      { firstName: searchRegex },
      { lastName: searchRegex },
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

  const [contacts, total] = await Promise.all([
    Contact.find(filter)
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(limitNum),
    Contact.countDocuments(filter),
  ]);

  const { buildPaginationMeta } = require('../utils/pagination');

  return {
    contacts,
    meta: buildPaginationMeta(total, pageNum, limitNum),
  };
};

/**
 * Get single contact by ID
 */
const getContactById = async (id, user) => {
  const contact = await Contact.findById(id)
    .populate('assignedTo', 'name email role department')
    .populate('createdBy', 'name email');

  if (!contact) {
    throw new AppError('Contact not found.', 404);
  }

  const isSalesExec =
    user.role === ROLES.SALES_EXECUTIVE || user.role === 'sales_rep';

  if (
    isSalesExec &&
    contact.assignedTo?._id?.toString() !== user._id.toString() &&
    contact.createdBy?._id?.toString() !== user._id.toString()
  ) {
    throw new AppError('You do not have permission to view this contact.', 403);
  }

  return contact;
};

/**
 * Update contact
 */
const updateContact = async (id, updateData, user) => {
  const contact = await Contact.findById(id);

  if (!contact) {
    throw new AppError('Contact not found.', 404);
  }

  const isSalesExec =
    user.role === ROLES.SALES_EXECUTIVE || user.role === 'sales_rep';

  if (
    isSalesExec &&
    contact.assignedTo?.toString() !== user._id.toString() &&
    contact.createdBy?.toString() !== user._id.toString()
  ) {
    throw new AppError('You do not have permission to edit this contact.', 403);
  }

  if (updateData.email) {
    updateData.email = updateData.email.toLowerCase();
    const existing = await Contact.findOne({ email: updateData.email, _id: { $ne: id } });
    if (existing) {
      throw new AppError('Email address already in use by another contact.', 409);
    }
  }

  Object.assign(contact, updateData);
  await contact.save();

  return contact.populate(['assignedTo', 'createdBy']);
};

/**
 * Delete contact
 */
const deleteContact = async (id, user) => {
  const contact = await Contact.findById(id);

  if (!contact) {
    throw new AppError('Contact not found.', 404);
  }

  const isSalesExec =
    user.role === ROLES.SALES_EXECUTIVE || user.role === 'sales_rep';

  if (isSalesExec && contact.createdBy.toString() !== user._id.toString()) {
    throw new AppError('You do not have permission to delete this contact.', 403);
  }

  await Contact.findByIdAndDelete(id);
  return true;
};

/**
 * Get interaction history and complete timeline for a contact
 * Aggregates all activities and deals linked to this contact in chronological order
 */
const getContactTimeline = async (id, user) => {
  const contact = await getContactById(id, user);

  // Fetch activities
  const activities = await Activity.find({
    entityType: 'Contact',
    entityId: contact._id,
  })
    .populate('performedBy', 'name email role')
    .sort({ createdAt: -1 });

  // Fetch deals
  const deals = await Deal.find({ contact: contact._id })
    .populate('assignedTo', 'name email')
    .sort({ createdAt: -1 });

  // Unify timeline events
  const timeline = [
    ...activities.map((act) => ({
      type: 'activity',
      activityType: act.type,
      title: act.subject,
      description: act.description,
      status: act.status,
      date: act.scheduledAt || act.createdAt,
      user: act.performedBy,
      raw: act,
    })),
    ...deals.map((deal) => ({
      type: 'deal',
      title: `Deal created: ${deal.title}`,
      description: `Value: $${deal.value} | Stage: ${deal.stage}`,
      status: deal.stage,
      date: deal.createdAt,
      user: deal.assignedTo,
      raw: deal,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    contact,
    timeline,
    summary: {
      totalActivities: activities.length,
      totalDeals: deals.length,
      dealsTotalValue: deals.reduce((acc, curr) => acc + curr.value, 0),
    },
  };
};

module.exports = {
  createContact,
  getContacts,
  getContactById,
  updateContact,
  deleteContact,
  getContactTimeline,
};
