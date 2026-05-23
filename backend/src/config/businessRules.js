const MANAGEMENT_OVERRIDE_TTL_MINUTES = 15;

const permissionsByRole = {
  admin: ['*'],
  gerente: [
    'abrir_caixa',
    'fechar_caixa',
    'registrar_sangria',
    'registrar_suprimento',
    'ver_resumo_caixa',
    'gerenciar_caixa',
    'autorizar_acao_gerencial',
    'realizar_venda',
    'consultar_produtos',
    'ver_pdv',
    'cancelar_venda',
    'autorizar_desconto',
  ],
  vendedor: ['realizar_venda', 'consultar_produtos', 'ver_pdv'],
  estoquista: ['consultar_produtos', 'gerenciar_produtos', 'movimentar_estoque'],
  cozinha: ['ver_cozinha', 'atualizar_status_cozinha'],
};

const cashRules = {
  allowSellerOpenCashWithoutAuthorization:
    process.env.ALLOW_SELLER_OPEN_CASH === 'true',
  closeDifferenceLimitForCommonUser: Number(
    process.env.CASH_CLOSE_DIFF_LIMIT_COMMON || 0
  ),
};

const gerencialActions = [
  'abrir_caixa',
  'fechar_caixa',
  'registrar_sangria',
  'registrar_suprimento',
  'cancelar_venda',
  'autorizar_desconto',
];

const normalizeRole = (role) => String(role || '').trim().toLowerCase();

const hasPermission = (role, permission) => {
  const normalizedRole = normalizeRole(role);
  const rolePermissions = permissionsByRole[normalizedRole] || [];

  if (rolePermissions.includes('*')) {
    return true;
  }

  return rolePermissions.includes(permission);
};

const isManagementLevel = (role) =>
  ['admin', 'gerente'].includes(normalizeRole(role));

const canOpenCashDirectly = (role) => {
  const normalizedRole = normalizeRole(role);

  if (hasPermission(normalizedRole, 'abrir_caixa')) {
    return true;
  }

  if (
    normalizedRole === 'vendedor' &&
    cashRules.allowSellerOpenCashWithoutAuthorization
  ) {
    return true;
  }

  return false;
};

module.exports = {
  MANAGEMENT_OVERRIDE_TTL_MINUTES,
  permissionsByRole,
  cashRules,
  gerencialActions,
  hasPermission,
  isManagementLevel,
  canOpenCashDirectly,
};

