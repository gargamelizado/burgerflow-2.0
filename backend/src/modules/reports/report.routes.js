const express = require('express');

const reportController = require('./report.controller');
const asyncHandler = require('../../utils/asyncHandler');
const {
  authenticateToken,
  requireAccess,
} = require('../../middlewares/auth.middleware');

const router = express.Router();

router.get(
  '/produtos-vendidos',
  authenticateToken,
  requireAccess(['admin', 'gerente']),
  asyncHandler(reportController.getProductsSold)
);

module.exports = router;
