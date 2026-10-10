const express = require('express');

const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const leadRoutes = require('./lead.routes');
const customerRoutes = require('./customer.routes');
const contactRoutes = require('./contact.routes');
const dealRoutes = require('./deal.routes');
const activityRoutes = require('./activity.routes');
const timelineRoutes = require('./timeline.routes');
const dashboardRoutes = require('./dashboard.routes');

const router = express.Router();

// Root v1 index route
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to CRM Sales Management API v1',
    endpoints: {
      health: '/api/v1/health',
      auth: '/api/v1/auth',
      users: '/api/v1/users',
      leads: '/api/v1/leads',
      customers: '/api/v1/customers',
      deals: '/api/v1/deals',
      activities: '/api/v1/activities',
      timeline: '/api/v1/timeline/:entityType/:entityId',
      dashboard: '/api/v1/dashboard',
      analytics: '/api/v1/analytics',
      teamPerformance: '/api/v1/analytics/team-performance',
      swaggerDocs: '/api/v1/docs',
    },
  });
});

// Mount all v1 sub-routers
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/leads', leadRoutes);
router.use('/customers', customerRoutes);
router.use('/contacts', contactRoutes); // Backwards compatibility alias for customers
router.use('/deals', dealRoutes);
router.use('/activities', activityRoutes);
router.use('/timeline', timelineRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/analytics', dashboardRoutes);

module.exports = router;
