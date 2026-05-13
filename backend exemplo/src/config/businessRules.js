/**
 * @file businessRules.js
 * @description Configuracoes de perfis de negocio, papeis e permissoes do backend.
 * @author BurgerFlow
 */

// Perfis de negocio suportados pela base multiuso do sistema.
export const businessProfiles = {
  // Perfil generico de comercio.
  comercio: {
    label: 'Comercio',
    roles: ['admin', 'gerente', 'vendedor', 'estoquista'],
    features: ['produtos', 'categorias', 'pdv', 'relatorios', 'caixa']
  },
  // Perfil de varejo com recursos de inventario/promocoes.
  varejo: {
    label: 'Varejo',
    roles: ['admin', 'gerente', 'estoquista', 'vendedor'],
    features: ['produtos', 'categorias', 'pdv', 'relatorios', 'caixa', 'inventario', 'promocoes']
  },
  // Perfil de lanchonete com preparo e comandas.
  lanchonete: {
    label: 'Lanchonete',
    roles: ['admin', 'gerente', 'vendedor', 'estoquista', 'cozinha', 'entregador'],
    features: ['produtos', 'combos', 'ingredientes', 'pdv', 'comandas', 'preparo']
  },
  // Perfil principal do BurgerFlow: fast-food com KDS e autoatendimento.
  fast_food: {
    label: 'Fast-food',
    roles: ['admin', 'gerente', 'vendedor', 'estoquista', 'cozinha', 'entregador'],
    features: ['produtos', 'combos', 'receitas', 'pdv_rapido', 'kds', 'autoatendimento']
  },
  // Perfil supermercadista mantido por compatibilidade do ERP original.
  retail: {
    label: 'Supermercado / Varejo',
    roles: ['admin', 'gerente', 'vendedor', 'estoquista'],
    features: ['codigo_barras', 'balanca', 'lotes', 'validade', 'promocoes', 'reposicao', 'compras']
  },
  // Perfil farmacia/drogaria mantido por compatibilidade do ERP original.
  pharmacy: {
    label: 'Farmacia / Drogaria',
    roles: ['admin', 'gerente', 'vendedor', 'estoquista', 'farmaceutico'],
    features: ['medicamentos', 'receitas_medicas', 'controle_sanitario', 'fifo_validade', 'lotes', 'auditoria']
  }
};

// Mapa de permissoes por nivel de acesso.
export const permissions = {
  // Admin possui wildcard para todas as permissoes.
  admin: ['*'],
  // Gerente opera loja, caixa, cozinha, delivery e relatorios.
  gerente: ['ver_dashboard', 'gerenciar_produtos', 'realizar_venda', 'gerenciar_vendas', 'gerenciar_caixa', 'gerenciar_cozinha', 'gerenciar_delivery', 'ver_relatorios', 'aplicar_desconto'],
  // Estoquista acessa produtos e estoque.
  estoquista: ['ver_dashboard', 'gerenciar_produtos', 'gerenciar_estoque'],
  // Vendedor executa venda/PDV.
  vendedor: ['realizar_venda'],
  // Cozinha acessa KDS.
  cozinha: ['gerenciar_cozinha'],
  // Entregador acessa fluxo de delivery.
  entregador: ['gerenciar_delivery'],
  // Farmaceutico existe para o perfil farmacia.
  farmaceutico: ['ver_dashboard', 'gerenciar_produtos', 'realizar_venda', 'gerenciar_vendas', 'gerenciar_estoque', 'gerenciar_receitas', 'ver_relatorios']
};

// Rotulos amigaveis para exibir cargos na interface.
export const roleLabels = {
  admin: 'Administrador',
  gerente: 'Gerente',
  estoquista: 'Estoquista',
  vendedor: 'Vendedor',
  cozinha: 'Cozinha',
  entregador: 'Entregador',
  farmaceutico: 'Farmaceutico'
};

// Lista de niveis aceitos em cadastro/atualizacao de usuarios.
export const allowedAccessLevels = Object.keys(permissions);

// Normaliza aliases de negocio para os perfis internos.
export function normalizeBusinessType(value) {
  // Converte entrada para string sem espacos e troca hifen por underscore.
  const normalized = String(value || '').trim().replace('-', '_');
  // Aliases de varejo/supermercado.
  if (normalized === 'varejo' || normalized === 'supermercado' || normalized === 'marketflow') return 'retail';
  // Aliases de farmacia.
  if (normalized === 'farmacia' || normalized === 'drogaria' || normalized === 'pharmacyflow') return 'pharmacy';
  // Aliases de lanchonete/BurgerFlow.
  if (normalized === 'lanchonete' || normalized === 'burgerflow') return 'fast_food';
  // Retorna perfil conhecido ou comercio como fallback seguro.
  return businessProfiles[normalized] ? normalized : 'comercio';
}

// Verifica se um usuario possui uma permissao especifica.
export function hasPermission(user, permission) {
  // Busca permissoes do cargo do usuario.
  const userPermissions = permissions[user?.nivel_acesso] || [];
  // Admin passa pelo wildcard; demais cargos precisam da permissao explicita.
  return userPermissions.includes('*') || userPermissions.includes(permission);
}
