const express = require('express');

const productController = require('./product.controller');
const asyncHandler = require('../../utils/asyncHandler');
const { authenticateToken } = require('../../middlewares/auth.middleware');

const router = express.Router();

router.get('/', authenticateToken, asyncHandler(productController.listCardapio));

module.exports = router;
