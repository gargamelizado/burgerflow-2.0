const express = require('express');

const managementController = require('./management.controller');
const asyncHandler = require('../../utils/asyncHandler');
const { authenticateToken } = require('../../middlewares/auth.middleware');

const router = express.Router();

router.post(
  '/autorizar',
  authenticateToken,
  asyncHandler(managementController.authorize)
);

module.exports = router;

