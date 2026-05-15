const express = require('express');

const kitchenController = require('./kitchen.controller');
const asyncHandler = require('../../utils/asyncHandler');
const { authenticateToken } = require('../../middlewares/auth.middleware');

const router = express.Router();

router.get('/pedidos', authenticateToken, asyncHandler(kitchenController.listOrders));
router.patch('/pedidos/:id/status', authenticateToken, asyncHandler(kitchenController.updateStatus));

module.exports = router;

