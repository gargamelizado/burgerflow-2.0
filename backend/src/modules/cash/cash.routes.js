const express = require('express');

const cashController = require('./cash.controller');
const asyncHandler = require('../../utils/asyncHandler');
const { authenticateToken } = require('../../middlewares/auth.middleware');

const router = express.Router();

router.get('/aberto', authenticateToken, asyncHandler(cashController.getOpen));
router.post('/abrir', authenticateToken, asyncHandler(cashController.open));
router.post('/fechar', authenticateToken, asyncHandler(cashController.close));
router.post('/movimento', authenticateToken, asyncHandler(cashController.createMovement));
router.get('/movimentos', authenticateToken, asyncHandler(cashController.listMovements));
module.exports = router;
