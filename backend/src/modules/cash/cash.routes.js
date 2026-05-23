const express = require('express');

const cashController = require('./cash.controller');
const asyncHandler = require('../../utils/asyncHandler');
const { authenticateToken } = require('../../middlewares/auth.middleware');

const router = express.Router();

router.post('/caixas/abrir', authenticateToken, asyncHandler(cashController.openCashByNumber));
router.post('/caixas/:id/fechar', authenticateToken, asyncHandler(cashController.closeCashById));
router.get('/caixas/abertos', authenticateToken, asyncHandler(cashController.listOpenCashes));
router.get('/caixas/:id/vendas', authenticateToken, asyncHandler(cashController.listSalesByCash));
router.get('/caixas/:id', authenticateToken, asyncHandler(cashController.getCashById));
router.post('/teste/abrir-caixas', authenticateToken, asyncHandler(cashController.testOpenCashes));
router.post('/teste/vender-em-caixas', authenticateToken, asyncHandler(cashController.testSellInCashes));

router.get('/aberto', authenticateToken, asyncHandler(cashController.getOpen));
router.post('/abrir', authenticateToken, asyncHandler(cashController.open));
router.post('/fechar', authenticateToken, asyncHandler(cashController.close));
router.post('/movimento', authenticateToken, asyncHandler(cashController.createMovement));
router.get('/movimentos', authenticateToken, asyncHandler(cashController.listMovements));
module.exports = router;
