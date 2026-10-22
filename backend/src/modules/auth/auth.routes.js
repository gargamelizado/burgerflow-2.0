const express = require('express');

const authController = require('./auth.controller');
const asyncHandler = require('../../utils/asyncHandler');
const { authenticateToken } = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validate.middleware');
const schemas = require('./auth.schemas');
const { loginRateLimit } = require('../../middlewares/auth-rate-limit.middleware');

const router = express.Router();

router.post(
  '/login',
  loginRateLimit,
  validate(schemas.login),
  asyncHandler(authController.login)
);
router.get('/verify', authenticateToken, asyncHandler(authController.verify));
router.patch(
  '/alterar-senha',
  authenticateToken,
  validate(schemas.changePassword),
  asyncHandler(authController.alterarSenha)
);

module.exports = router;
