const express = require('express');

const cashController = require('./cash.controller');
const asyncHandler = require('../../utils/asyncHandler');
const { authenticateToken } = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validate.middleware');
const { authorizeRoles } = require('../../middlewares/rbac.middleware');
const schemas = require('./cash.schemas');

const router = express.Router();
const cashStaff = authorizeRoles(
  'ADMIN',
  'GERENTE',
  'OPERADOR_CAIXA',
  'ATENDENTE'
);
const management = authorizeRoles('ADMIN', 'GERENTE');

router.post('/caixas/abrir', authenticateToken, cashStaff, validate(schemas.open), asyncHandler(cashController.openCashByNumber));
router.post('/caixas/:id/fechar', authenticateToken, cashStaff, validate(schemas.closeById), asyncHandler(cashController.closeCashById));
router.get('/caixas/abertos', authenticateToken, cashStaff, validate(schemas.empty), asyncHandler(cashController.listOpenCashes));
router.get('/caixas/:id/vendas', authenticateToken, cashStaff, validate(schemas.getById), asyncHandler(cashController.listSalesByCash));
router.get('/caixas/:id', authenticateToken, cashStaff, validate(schemas.getById), asyncHandler(cashController.getCashById));
router.post('/teste/abrir-caixas', authenticateToken, management, validate(schemas.testOpen), asyncHandler(cashController.testOpenCashes));
router.post('/teste/vender-em-caixas', authenticateToken, management, validate(schemas.testSell), asyncHandler(cashController.testSellInCashes));

router.get('/aberto', authenticateToken, cashStaff, validate(schemas.empty), asyncHandler(cashController.getOpen));
router.post('/abrir', authenticateToken, cashStaff, validate(schemas.open), asyncHandler(cashController.open));
router.post('/fechar', authenticateToken, cashStaff, validate(schemas.close), asyncHandler(cashController.close));
router.post('/movimento', authenticateToken, cashStaff, validate(schemas.movement), asyncHandler(cashController.createMovement));
router.get('/movimentos', authenticateToken, cashStaff, validate(schemas.listMovements), asyncHandler(cashController.listMovements));
module.exports = router;
