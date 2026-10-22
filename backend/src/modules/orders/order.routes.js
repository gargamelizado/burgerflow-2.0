const express = require('express');

const orderController = require('./order.controller');
const asyncHandler = require('../../utils/asyncHandler');
const {
  authenticateToken,
} = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validate.middleware');
const {
  authorizeRoles,
  authorizeOrderStatus,
} = require('../../middlewares/rbac.middleware');
const schemas = require('./order.schemas');

const router = express.Router();

router.get('/', authenticateToken, validate(schemas.list), asyncHandler(orderController.list));
router.post(
  '/',
  authenticateToken,
  authorizeRoles('ADMIN', 'GERENTE', 'OPERADOR_CAIXA', 'ATENDENTE'),
  validate(schemas.create),
  asyncHandler(orderController.create)
);
router.patch(
  '/:id/status',
  authenticateToken,
  validate(schemas.status),
  authorizeOrderStatus,
  asyncHandler(orderController.updateStatus)
);
router.patch(
  '/:id/status/gerencial',
  authenticateToken,
  validate(schemas.status),
  authorizeRoles('ADMIN', 'GERENTE'),
  asyncHandler(orderController.correctStatus)
);

module.exports = router;
