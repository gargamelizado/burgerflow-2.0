const jwt = require('jsonwebtoken');
const env = require('../config/env');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      message: 'Token não informado.',
    });
  }

  const [type, token] = authHeader.split(' ');

  if (type !== 'Bearer' || !token) {
    return res.status(401).json({
      message: 'Token inválido.',
    });
  }

  try {
    const decoded = jwt.verify(token, env.jwt.secret);

    req.user = decoded;

    return next();
  } catch (error) {
    return res.status(401).json({
      message: 'Token inválido ou expirado.',
    });
  }
};

const requireAccess = (allowedLevels = []) => {
  const levels = Array.isArray(allowedLevels) ? allowedLevels : [];

  return (req, res, next) => {
    const userLevel = req.user?.nivel_acesso;

    if (!userLevel || !levels.includes(userLevel)) {
      return res.status(403).json({
        message: 'Acesso restrito para este perfil.',
      });
    }

    return next();
  };
};

module.exports = {
  authenticateToken,
  requireAccess,
};
