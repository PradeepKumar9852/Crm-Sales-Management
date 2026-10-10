const express = require('express');
const timelineController = require('../controllers/timeline.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { entityParamsSchema } = require('../validators/common.validator');

const router = express.Router();

router.use(authenticate);

// Get audit timeline for an entity
router.get('/:entityType/:entityId', validate(entityParamsSchema, 'params'), timelineController.getTimeline);

module.exports = router;

