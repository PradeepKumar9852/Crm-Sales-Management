/**
 * System-wide constants, roles, and enums for CRM Sales Management System
 * Aligned with enterprise CRM requirements
 */

const ROLES = {
  ADMIN: 'admin',
  SALES_MANAGER: 'sales_manager',
  SALES_EXECUTIVE: 'sales_executive',
};

// Also support aliases for backwards compatibility
const ROLE_ALIASES = {
  manager: ROLES.SALES_MANAGER,
  sales_rep: ROLES.SALES_EXECUTIVE,
};

const ROLE_LIST = [
  ROLES.ADMIN,
  ROLES.SALES_MANAGER,
  ROLES.SALES_EXECUTIVE,
  'manager',
  'sales_rep',
];

const LEAD_STATUS = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  QUALIFIED: 'Qualified',
  UNQUALIFIED: 'Unqualified',
  CONVERTED: 'Converted',
  LOST: 'Lost',
};

const LEAD_STATUS_LIST = Object.values(LEAD_STATUS);

const LEAD_PRIORITY = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
};

const LEAD_PRIORITY_LIST = Object.values(LEAD_PRIORITY);

const LEAD_SOURCES = [
  'Website',
  'Referral',
  'Social Media',
  'Email',
  'Phone',
  'LinkedIn',
  'Partner',
  'Other',
];

const DEAL_STAGES = {
  QUALIFICATION: 'Qualification',
  DISCOVERY: 'Discovery',
  PROPOSAL: 'Proposal',
  NEGOTIATION: 'Negotiation',
  WON: 'Won',
  LOST: 'Lost',
};

const DEAL_STAGE_LIST = Object.values(DEAL_STAGES);

const DEAL_STAGE_PROBABILITIES = {
  [DEAL_STAGES.QUALIFICATION]: 10,
  [DEAL_STAGES.DISCOVERY]: 30,
  [DEAL_STAGES.PROPOSAL]: 60,
  [DEAL_STAGES.NEGOTIATION]: 80,
  [DEAL_STAGES.WON]: 100,
  [DEAL_STAGES.LOST]: 0,
};

const ACTIVITY_TYPES = {
  CALL: 'Call',
  EMAIL: 'Email',
  MEETING: 'Meeting',
  DEMO: 'Demo',
  FOLLOW_UP: 'Follow-up',
  REMINDER: 'Reminder',
  NOTE: 'Note',
};

const ACTIVITY_TYPE_LIST = Object.values(ACTIVITY_TYPES);

const ACTIVITY_STATUSES = {
  PENDING: 'Pending',
  COMPLETED: 'Completed',
  OVERDUE: 'Overdue',
};

const ACTIVITY_STATUS_LIST = Object.values(ACTIVITY_STATUSES);

const TIMELINE_ACTIONS = {
  LEAD_CREATED: 'Lead created',
  LEAD_ASSIGNED: 'Lead assigned',
  LEAD_REASSIGNED: 'Lead reassigned',
  LEAD_STATUS_CHANGED: 'Lead status changed',
  LEAD_PRIORITY_CHANGED: 'Lead priority changed',
  LEAD_CONVERTED: 'Lead converted',
  NOTE_ADDED: 'Note added',
  FOLLOW_UP_CREATED: 'Follow-up created',
  FOLLOW_UP_COMPLETED: 'Follow-up completed',
  CUSTOMER_CREATED: 'Customer created',
  DEAL_CREATED: 'Deal created',
  DEAL_STAGE_CHANGED: 'Deal stage changed',
  DEAL_ASSIGNED: 'Deal assigned',
  DEAL_WON: 'Deal won',
  DEAL_LOST: 'Deal lost',
};

const CONTACT_STATUSES = ['Lead', 'Customer', 'Active', 'Inactive'];
const CONTACT_TYPES = ['Prospect', 'Customer', 'Partner', 'Vendor'];

module.exports = {
  ROLES,
  ROLE_ALIASES,
  ROLE_LIST,
  LEAD_STATUS,
  LEAD_STATUS_LIST,
  LEAD_PRIORITY,
  LEAD_PRIORITY_LIST,
  LEAD_SOURCES,
  DEAL_STAGES,
  DEAL_STAGE_LIST,
  DEAL_STAGE_PROBABILITIES,
  ACTIVITY_TYPES,
  ACTIVITY_TYPE_LIST,
  ACTIVITY_STATUSES,
  ACTIVITY_STATUS_LIST,
  TIMELINE_ACTIONS,
  CONTACT_STATUSES,
  CONTACT_TYPES,
};
