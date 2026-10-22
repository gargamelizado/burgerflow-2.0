const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { AppError } = require('./error.middleware');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return next(new AppError('Token não informado.', 401, 'UNAUTHORIZED'));
  }

  const [type, token] = authHeader.split(' ');

  if (type !== 'Bearer' || !token) {
    return next(new AppError('Token inválido.', 401, 'UNAUTHORIZED'));
  }

  try {
    const decoded = jwt.verify(token, env.jwt.secret);

    req.user = decoded;

    return next();
  } catch (error) {
    return next(new AppError('Token inválido ou expirado.', 401, 'UNAUTHORIZED'));
  }
};

const requireAccess = (allowedLevels = []) => {
  const levels = Array.isArray(allowedLevels) ? allowedLevels : [];

  return (req, res, next) => {
    const userLevel = req.user?.nivel_acesso;

    if (!userLevel || !levels.includes(userLevel)) {
      return next(
        new AppError('Acesso restrito para este perfil.', 403, 'FORBIDDEN')
      );
    }

    return next();
  };
};

module.exports = {
  authenticateToken,
  requireAccess,
};
