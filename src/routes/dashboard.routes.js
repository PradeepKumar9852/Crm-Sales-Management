const express = require('express');
const dashboardController = require('../controllers/dashboard.controller');
const { authenticate, authorizeRoles } = require('../middlewares/auth.middleware');
const { ROLES } = require('../constants/roles');

const router = express.Router();

router.use(authenticate);

// Overall CRM metrics and pipeline stage breakdown
router.get('/', dashboardController.getDashboardMetrics);
router.get('/summary', dashboardController.getDashboardMetrics);

// Granular Analytics APIs
router.get('/leads', dashboardController.getLeadAnalytics);
router.get('/deals', dashboardController.getDealAnalytics);
router.get('/pipeline', dashboardController.getPipelineBreakdown);
router.get('/activities', dashboardController.getActivityAnalytics);

// Manager & Admin team performance metrics
router.get(
  '/team-performance',
  authorizeRoles(ROLES.ADMIN, ROLES.SALES_MANAGER, 'manager'),
  dashboardController.getTeamPerformance
);

module.exports = router;

