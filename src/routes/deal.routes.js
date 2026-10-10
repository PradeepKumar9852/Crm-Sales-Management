const express = require('express');
const dealController = require('../controllers/deal.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const {
  createDealSchema,
  updateDealSchema,
  updateDealStageSchema,
} = require('../validators/deal.validator');

const router = express.Router();

// All deal routes require authentication
router.use(authenticate);

// Pipeline summary stats
router.get('/pipeline/summary', dealController.getPipelineSummary);

// Deal CRUD
router.post('/', validate(createDealSchema), dealController.createDeal);
router.get('/', dealController.getDeals);
router.get('/:id', dealController.getDealById);
router.put('/:id', validate(updateDealSchema), dealController.updateDeal);
router.delete('/:id', dealController.deleteDeal);

// Stage transition endpoint
router.patch('/:id/stage', validate(updateDealStageSchema), dealController.updateDealStage);

module.exports = router;
