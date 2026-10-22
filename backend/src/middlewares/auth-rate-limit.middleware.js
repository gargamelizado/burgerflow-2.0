const { rateLimit } = require('express-rate-limit');
const { AppError } = require('./error.middleware');

const createAuthRateLimit = (limit) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res, next) =>
      next(
        new AppError(
          'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
          429,
          'RATE_LIMITED'
        )
      ),
  });

module.exports = {
  loginRateLimit: createAuthRateLimit(10),
  managementRateLimit: createAuthRateLimit(20),
};
