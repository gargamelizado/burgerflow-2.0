const express = require('express');

const orderController = require('./order.controller');
const asyncHandler = require('../../utils/asyncHandler');
const {
  authenticateToken,
  requireAccess,
} = require('../../middlewares/auth.middleware');

const router = express.Router();

router.get('/', authenticateToken, asyncHandler(orderController.list));
router.post('/', authenticateToken, asyncHandler(orderController.create));
router.patch('/:id/status', authenticateToken, asyncHandler(orderController.updateStatus));
router.patch(
  '/:id/status/gerencial',
  authenticateToken,
  requireAccess(['admin', 'gerente']),
  asyncHandler(orderController.correctStatus)
);

module.exports = router;
