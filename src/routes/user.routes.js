const express = require('express');
const userController = require('../controllers/user.controller');
const { authenticate, authorizeRoles } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const {
  createUserSchema,
  updateUserSchema,
  toggleUserStatusSchema,
} = require('../validators/user.validator');
const { ROLES } = require('../constants/roles');

const router = express.Router();

router.use(authenticate);

// Sales Reps listing (available for all authenticated team members)
router.get('/sales-reps', userController.getSalesReps);

// Admin-only user creation
router.post(
  '/',
  authorizeRoles(ROLES.ADMIN),
  validate(createUserSchema),
  userController.createUser
);

// Admin & Manager routes for user list and details
router.get(
  '/',
  authorizeRoles(ROLES.ADMIN, ROLES.SALES_MANAGER, 'manager'),
  userController.getAllUsers
);

router.get(
  '/:id',
  authorizeRoles(ROLES.ADMIN, ROLES.SALES_MANAGER, 'manager'),
  userController.getUserById
);

// Admin-only updates, status toggle, and deletion
router.put('/:id', authorizeRoles(ROLES.ADMIN), validate(updateUserSchema), userController.updateUser);
router.patch(
  '/:id/status',
  authorizeRoles(ROLES.ADMIN),
  validate(toggleUserStatusSchema),
  userController.toggleUserStatus
);
router.delete('/:id', authorizeRoles(ROLES.ADMIN), userController.deleteUser);

module.exports = router;
