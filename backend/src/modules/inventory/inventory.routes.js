const express = require('express');

const inventoryController = require('./inventory.controller');
const asyncHandler = require('../../utils/asyncHandler');
const { authenticateToken } = require('../../middlewares/auth.middleware');

const router = express.Router();

router.get('/', authenticateToken, asyncHandler(inventoryController.list));
router.post('/movimentar', authenticateToken, asyncHandler(inventoryController.movimentar));
router.get('/historico', authenticateToken, asyncHandler(inventoryController.historico));

module.exports = router;
