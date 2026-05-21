const express = require('express');

const productController = require('./product.controller');
const asyncHandler = require('../../utils/asyncHandler');
const { authenticateToken } = require('../../middlewares/auth.middleware');

const createItemTypeRoutes = (tipo) => {
  const router = express.Router();

  router.get('/', authenticateToken, asyncHandler(productController.listByType(tipo)));
  router.post('/', authenticateToken, asyncHandler(productController.create(tipo)));
  router.get('/:id', authenticateToken, asyncHandler(productController.getById));
  router.put('/:id', authenticateToken, asyncHandler(productController.update(tipo)));
  router.delete('/:id', authenticateToken, asyncHandler(productController.remove));

  return router;
};

module.exports = createItemTypeRoutes;
