const express = require('express');

const managementController = require('./management.controller');
const asyncHandler = require('../../utils/asyncHandler');
const { authenticateToken } = require('../../middlewares/auth.middleware');
const {
  managementRateLimit,
} = require('../../middlewares/auth-rate-limit.middleware');
const validate = require('../../middlewares/validate.middleware');
const schemas = require('./management.schemas');

const router = express.Router();

router.post(
  '/autorizar',
  authenticateToken,
  managementRateLimit,
  validate(schemas.authorize),
  asyncHandler(managementController.authorize)
);

module.exports = router;
