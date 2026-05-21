const express = require('express');

const productController = require('./product.controller');
const asyncHandler = require('../../utils/asyncHandler');
const { authenticateToken } = require('../../middlewares/auth.middleware');

const router = express.Router();

router.get('/cardapio', authenticateToken, asyncHandler(productController.listCardapio));
router.get('/:id', authenticateToken, asyncHandler(productController.getById));
router.get('/', authenticateToken, asyncHandler(productController.list));
router.post('/', authenticateToken, asyncHandler(productController.create()));
router.put('/:id', authenticateToken, asyncHandler(productController.update()));
router.delete('/:id', authenticateToken, asyncHandler(productController.remove));

module.exports = router;
