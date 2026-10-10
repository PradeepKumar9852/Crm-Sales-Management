const express = require('express');
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { authLimiter } = require('../middlewares/rateLimiter.middleware');
const {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  updatePasswordSchema,
} = require('../validators/auth.validator');

const router = express.Router();

// Public routes
router.post('/register', validate(registerSchema), authController.register);
router.post('/login', authLimiter, validate(loginSchema), authController.login);

// Protected routes
router.use(authenticate);
router.get('/me', authController.getMe);
router.put('/update-profile', validate(updateProfileSchema), authController.updateProfile);
router.put('/update-password', validate(updatePasswordSchema), authController.updatePassword);
router.post('/logout', authController.logout);

module.exports = router;
