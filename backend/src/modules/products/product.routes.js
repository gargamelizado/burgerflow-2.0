const express = require('express');

const productController = require('./product.controller');
const asyncHandler = require('../../utils/asyncHandler');
const { authenticateToken } = require('../../middlewares/auth.middleware');

const router = express.Router();

router.get('/', authenticateToken, asyncHandler(productController.list));
router.post('/', authenticateToken, asyncHandler(productController.create));
router.put('/:id', authenticateToken, asyncHandler(productController.update));
router.delete('/:id', authenticateToken, asyncHandler(productController.remove));

module.exports = router;