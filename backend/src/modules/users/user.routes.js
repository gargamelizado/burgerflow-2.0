const express = require('express');

const userController = require('./user.controller');
const asyncHandler = require('../../utils/asyncHandler');
const {
  authenticateToken,
  requireAccess,
} = require('../../middlewares/auth.middleware');

const router = express.Router();

router.get(
  '/',
  authenticateToken,
  requireAccess(['admin', 'gerente']),
  asyncHandler(userController.list)
);
router.post(
  '/',
  authenticateToken,
  requireAccess(['admin']),
  asyncHandler(userController.create)
);
router.put(
  '/:id',
  authenticateToken,
  requireAccess(['admin']),
  asyncHandler(userController.update)
);
router.patch(
  '/:id/senha',
  authenticateToken,
  requireAccess(['admin', 'gerente']),
  asyncHandler(userController.setPassword)
);
router.delete(
  '/:id',
  authenticateToken,
  requireAccess(['admin']),
  asyncHandler(userController.deactivate)
);

module.exports = router;
