const express = require('express');

const authController = require('./auth.controller');
const asyncHandler = require('../../utils/asyncHandler');
const { authenticateToken } = require('../../middlewares/auth.middleware');

const router = express.Router();

router.post('/login', asyncHandler(authController.login));
router.get('/verify', authenticateToken, asyncHandler(authController.verify));
router.patch(
  '/alterar-senha',
  authenticateToken,
  asyncHandler(authController.alterarSenha)
);

module.exports = router;
