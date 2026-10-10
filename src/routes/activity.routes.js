const express = require('express');
const activityController = require('../controllers/activity.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const {
  createActivitySchema,
  updateActivitySchema,
  updateActivityStatusSchema,
} = require('../validators/activity.validator');

const router = express.Router();

router.use(authenticate);

router.post('/', validate(createActivitySchema), activityController.createActivity);
router.get('/', activityController.getActivities);
router.get('/:id', activityController.getActivityById);
router.put('/:id', validate(updateActivitySchema), activityController.updateActivity);
router.delete('/:id', activityController.deleteActivity);

// Status transition endpoint (complete/cancel)
router.patch(
  '/:id/status',
  validate(updateActivityStatusSchema),
  activityController.updateActivityStatus
);

module.exports = router;
