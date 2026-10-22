const { AppError } = require('./error.middleware');

const roleAliases = {
  ADMIN: 'admin',
  GERENTE: 'gerente',
  OPERADOR_CAIXA: 'vendedor',
  ATENDENTE: 'vendedor',
  COZINHA: 'cozinha',
  ESTOQUISTA: 'estoquista',
};

const normalizeRole = (role) => {
  const normalized = String(role || '').trim();
  return roleAliases[normalized.toUpperCase()] || normalized.toLowerCase();
};

const authorizeRoles = (...allowedRoles) => (req, res, next) => {
  const userRole = normalizeRole(req.user?.nivel_acesso || req.user?.role);

  if (!userRole) {
    return next(new AppError('Utilizador não autenticado', 401, 'UNAUTHORIZED'));
  }

  if (!allowedRoles.map(normalizeRole).includes(userRole)) {
    return next(
      new AppError(
        'Acesso negado: perfil sem permissão para esta operação',
        403,
        'FORBIDDEN'
      )
    );
  }

  return next();
};

const authorizeOrderStatus = (req, res, next) => {
  if (req.body?.status === 'cancelado') {
    return authorizeRoles('ADMIN', 'GERENTE')(req, res, next);
  }

  return authorizeRoles(
    'ADMIN',
    'GERENTE',
    'OPERADOR_CAIXA',
    'ATENDENTE',
    'COZINHA'
  )(req, res, next);
};

module.exports = {
  authorizeRoles,
  authorizeOrderStatus,
};
