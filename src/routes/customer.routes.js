const express = require('express');
const customerController = require('../controllers/customer.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { createCustomerSchema, updateCustomerSchema } = require('../validators/customer.validator');

const router = express.Router();

router.use(authenticate);

// Customer CRUD
router.post('/', validate(createCustomerSchema), customerController.createCustomer);
router.get('/', customerController.getCustomers);
router.get('/:id', customerController.getCustomerById);
router.put('/:id', validate(updateCustomerSchema), customerController.updateCustomer);
router.delete('/:id', customerController.deleteCustomer);

module.exports = router;
