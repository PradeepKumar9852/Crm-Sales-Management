const express = require('express');
const contactController = require('../controllers/contact.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const {
  createContactSchema,
  updateContactSchema,
} = require('../validators/contact.validator');

const router = express.Router();

router.use(authenticate);

// Contact CRUD
router.post('/', validate(createContactSchema), contactController.createContact);
router.get('/', contactController.getContacts);
router.get('/:id', contactController.getContactById);
router.put('/:id', validate(updateContactSchema), contactController.updateContact);
router.delete('/:id', contactController.deleteContact);

// Interaction history / timeline
router.get('/:id/timeline', contactController.getContactTimeline);

module.exports = router;
