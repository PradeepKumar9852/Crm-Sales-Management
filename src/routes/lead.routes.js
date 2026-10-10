const express = require('express');
const leadController = require('../controllers/lead.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const {
  createLeadSchema,
  updateLeadSchema,
  assignLeadSchema,
  changeLeadStatusSchema,
  changeLeadPrioritySchema,
  convertLeadSchema,
} = require('../validators/lead.validator');

const router = express.Router();

// All lead routes require authentication
router.use(authenticate);

router.post('/', validate(createLeadSchema), leadController.createLead);
router.get('/', leadController.getLeads);
router.get('/:id', leadController.getLeadById);
router.put('/:id', validate(updateLeadSchema), leadController.updateLead);
router.delete('/:id', leadController.deleteLead);

// Action endpoints
router.patch('/:id/assign', validate(assignLeadSchema), leadController.assignLead);
router.patch('/:id/status', validate(changeLeadStatusSchema), leadController.changeLeadStatus);
router.patch('/:id/priority', validate(changeLeadPrioritySchema), leadController.changeLeadPriority);
router.post('/:id/convert', validate(convertLeadSchema), leadController.convertLead);

module.exports = router;
