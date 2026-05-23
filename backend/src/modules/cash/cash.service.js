const cashRepository = require('./cash.repository');
const auditRepository = require('../../repositories/audit.repository');
const managementService = require('../management/management.service');
const {
  hasPermission,
  canOpenCashDirectly,
  isManagementLevel,
  cashRules,
} = require('../../config/businessRules');
const orderService = require('../orders/order.service');

const toMoney = (value) => Number(Number(value || 0).toFixed(2));
const formatMoneyPtBr = (value) =>
  Number(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const parseMoney = (value, fieldName) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    const error = new Error(`${fieldName} inválido.`);
    error.statusCode = 400;
    throw error;
  }

  return toMoney(parsed);
};

const assertAuthenticatedUser = (usuario_id, usuario_nivel_acesso) => {
  const userId = Number(usuario_id);
  const userLevel = String(usuario_nivel_acesso || '').trim().toLowerCase();

  if (!Number.isInteger(userId) || userId <= 0) {
    const error = new Error('Usuário autenticado é obrigatório.');
    error.statusCode = 401;
    throw error;
  }

  if (!userLevel) {
    const error = new Error('Nível de acesso do usuário é obrigatório.');
    error.statusCode = 401;
    throw error;
  }

  return { userId, userLevel };
};

const getDifferenceResult = (diferenca) => {
  if (diferenca === 0) {
    return {
      tipo: 'conferido',
      mensagem: 'Caixa conferido corretamente.',
    };
  }

  if (diferenca < 0) {
    return {
      tipo: 'faltou',
      mensagem: `Faltou R$ ${formatMoneyPtBr(Math.abs(diferenca))} no caixa.`,
    };
  }

  return {
    tipo: 'sobrou',
    mensagem: `Sobrou R$ ${formatMoneyPtBr(diferenca)} no caixa.`,
  };
};

const normalizeCashStatus = (status) =>
  String(status || '').trim().toUpperCase();

const assertManagerAuthorizationWhenRequired = async ({
  userId,
  userLevel,
  action,
  authorizationToken,
  reason,
  entidade = 'caixa',
  entidade_id = null,
  valor = null,
}) => {
  let hasDirectPermission = hasPermission(userLevel, action);

  if (action === 'abrir_caixa') {
    hasDirectPermission = canOpenCashDirectly(userLevel);
  }

  if (hasDirectPermission) {
    return {
      gerente_autorizador_id: null,
      autorizacao_usada: false,
    };
  }

  const managerAuthorization = await managementService.validateAuthorizationToken({
    token: authorizationToken,
    requesterUserId: userId,
    action,
  });

  await auditRepository.logAudit({
    usuario_id: userId,
    acao: 'caixa.autorizacao_gerencial',
    entidade,
    entidade_id,
    detalhes: {
      acao_autorizada: action,
      gerente_autorizador_id: managerAuthorization.managerUserId,
      motivo: reason || managerAuthorization.reason || null,
      valor: valor ?? null,
      origem: 'token_validado_na_acao',
    },
  });

  return {
    gerente_autorizador_id: managerAuthorization.managerUserId,
    autorizacao_usada: true,
  };
};

const calculateCashSummary = async (caixa) => {
  const totais = await cashRepository.summarizeByCash(caixa.id);
  const valorInicial = toMoney(caixa.valor_inicial);
  const totalVendas = toMoney(totais.total_vendas);
  const vendasDinheiro = toMoney(totais.vendas_dinheiro);
  const vendasPix = toMoney(totais.vendas_pix);
  const vendasCartaoCredito = toMoney(totais.vendas_cartao_credito);
  const vendasCartaoDebito = toMoney(totais.vendas_cartao_debito);
  const vendasVoucher = toMoney(totais.vendas_voucher);
  const totalSuprimentos = toMoney(totais.total_suprimentos);
  const totalSangrias = toMoney(totais.total_sangrias);
  const totalDespesas = toMoney(totais.total_despesas);
  const valorEsperado = toMoney(
    valorInicial + vendasDinheiro + totalSuprimentos - totalSangrias - totalDespesas
  );

  return {
    valor_inicial: valorInicial,
    total_vendas: totalVendas,
    vendas_dinheiro: vendasDinheiro,
    vendas_pix: vendasPix,
    vendas_cartao_credito: vendasCartaoCredito,
    vendas_cartao_debito: vendasCartaoDebito,
    vendas_voucher: vendasVoucher,
    total_suprimentos: totalSuprimentos,
    total_sangrias: totalSangrias,
    total_despesas: totalDespesas,
    valor_esperado: valorEsperado,
    status: normalizeCashStatus(caixa.status),
  };
};

const hydrateCash = async (caixa) => {
  const [movimentos, resumo] = await Promise.all([
    cashRepository.listMovementsByCash(caixa.id),
    calculateCashSummary(caixa),
  ]);

  return {
    ...caixa,
    status: normalizeCashStatus(caixa.status),
    resumo,
    movimentos,
  };
};

const getOpen = async () => {
  const caixasAbertos = await cashRepository.listOpen();

  if (!caixasAbertos.length) {
    return {
      aberto: false,
      caixa: null,
      caixas_abertos: [],
      resumo: null,
      movimentos: [],
    };
  }

  const caixaAtual = caixasAbertos[0];
  const hydrated = await hydrateCash(caixaAtual);

  return {
    aberto: true,
    caixa: hydrated,
    caixas_abertos: caixasAbertos.map((c) => ({
      ...c,
      status: normalizeCashStatus(c.status),
    })),
    resumo: hydrated.resumo,
    movimentos: hydrated.movimentos,
  };
};

const open = async ({
  usuario_id,
  usuario_nivel_acesso,
  numero,
  operador_id,
  valor_inicial,
  observacao,
  gerencial_token,
  motivo_autorizacao,
}) => {
  const { userId, userLevel } = assertAuthenticatedUser(
    usuario_id,
    usuario_nivel_acesso
  );
  let cashNumber = Number(numero);

  if (!Number.isInteger(cashNumber) || cashNumber <= 0) {
    cashNumber = await cashRepository.getNextNumber();
  }

  const caixaMesmoNumeroAberto = await cashRepository.findOpenByNumber(cashNumber);
  if (caixaMesmoNumeroAberto) {
    const error = new Error('Já existe caixa aberto com este número.');
    error.statusCode = 409;
    throw error;
  }

  const valorInicialNumber = parseMoney(valor_inicial ?? 0, 'Valor inicial');
  if (valorInicialNumber < 0) {
    const error = new Error('Valor inicial não pode ser negativo.');
    error.statusCode = 400;
    throw error;
  }

  const authorization = await assertManagerAuthorizationWhenRequired({
    userId,
    userLevel,
    action: 'abrir_caixa',
    authorizationToken: gerencial_token,
    reason: motivo_autorizacao || observacao || '',
    entidade: 'caixas',
    entidade_id: null,
    valor: valorInicialNumber,
  });

  const caixa = await cashRepository.open({
    numero: cashNumber,
    usuario_id: userId,
    operador_id: Number(operador_id) || userId,
    valor_inicial: valorInicialNumber,
    observacao: observacao || '',
  });

  await auditRepository.logAudit({
    usuario_id: userId,
    acao: 'caixa.aberto',
    entidade: 'caixas',
    entidade_id: caixa.id,
    detalhes: {
      numero: cashNumber,
      operador_id: Number(operador_id) || userId,
      valor_inicial: valorInicialNumber,
      observacao: observacao || null,
      gerente_autorizador_id: authorization.gerente_autorizador_id,
    },
  });

  const resumo = await calculateCashSummary(caixa);

  return {
    message: 'Caixa aberto com sucesso.',
    caixa: {
      ...caixa,
      status: normalizeCashStatus(caixa.status),
    },
    resumo,
  };
};

const closeById = async ({
  caixa_id,
  usuario_id,
  usuario_nivel_acesso,
  valor_final,
  observacao,
  gerencial_token,
  motivo_autorizacao,
}) => {
  const { userId, userLevel } = assertAuthenticatedUser(
    usuario_id,
    usuario_nivel_acesso
  );
  const cashId = Number(caixa_id);
  if (!Number.isInteger(cashId) || cashId <= 0) {
    const error = new Error('ID do caixa inválido.');
    error.statusCode = 400;
    throw error;
  }

  const caixa = await cashRepository.findById(cashId);
  if (!caixa) {
    const error = new Error('Caixa não encontrado.');
    error.statusCode = 404;
    throw error;
  }

  if (String(caixa.status || '').toLowerCase() !== 'aberto') {
    const error = new Error('Caixa já está fechado.');
    error.statusCode = 409;
    throw error;
  }

  const valorFinalNumber = parseMoney(valor_final, 'Valor final');
  if (valorFinalNumber < 0) {
    const error = new Error('Valor final não pode ser negativo.');
    error.statusCode = 400;
    throw error;
  }

  const resumo = await calculateCashSummary(caixa);
  const diferenca = toMoney(valorFinalNumber - resumo.valor_esperado);
  if (diferenca !== 0 && !String(observacao || '').trim()) {
    const error = new Error('Informe uma observação para fechamento com diferença.');
    error.statusCode = 400;
    throw error;
  }

  const requiresAuthorizationByDifference =
    !isManagementLevel(userLevel) &&
    cashRules.closeDifferenceLimitForCommonUser >= 0 &&
    Math.abs(diferenca) > cashRules.closeDifferenceLimitForCommonUser;

  let authorization = await assertManagerAuthorizationWhenRequired({
    userId,
    userLevel,
    action: 'fechar_caixa',
    authorizationToken: gerencial_token,
    reason: motivo_autorizacao || observacao || '',
    entidade: 'caixas',
    entidade_id: cashId,
    valor: valorFinalNumber,
  });

  if (requiresAuthorizationByDifference && !authorization.autorizacao_usada) {
    authorization = await assertManagerAuthorizationWhenRequired({
      userId,
      userLevel: 'vendedor',
      action: 'fechar_caixa',
      authorizationToken: gerencial_token,
      reason: motivo_autorizacao || observacao || '',
      entidade: 'caixas',
      entidade_id: cashId,
      valor: valorFinalNumber,
    });
  }

  const resultado = getDifferenceResult(diferenca);
  const fechado = await cashRepository.closeById({
    id: cashId,
    valor_final: valorFinalNumber,
    valor_esperado: resumo.valor_esperado,
    diferenca,
    observacao: observacao || '',
    usuario_fechamento_id: userId,
    gerente_autorizador_id: authorization.gerente_autorizador_id,
  });

  await auditRepository.logAudit({
    usuario_id: userId,
    acao: 'caixa.fechado',
    entidade: 'caixas',
    entidade_id: cashId,
    detalhes: {
      valor_esperado: resumo.valor_esperado,
      valor_final: valorFinalNumber,
      diferenca,
      observacao: observacao || null,
      gerente_autorizador_id: authorization.gerente_autorizador_id,
    },
  });

  if (diferenca !== 0) {
    await auditRepository.logAudit({
      usuario_id: userId,
      acao: 'caixa.fechamento_com_diferenca',
      entidade: 'caixas',
      entidade_id: cashId,
      detalhes: {
        valor_esperado: resumo.valor_esperado,
        valor_final: valorFinalNumber,
        diferenca,
        observacao: observacao || null,
        gerente_autorizador_id: authorization.gerente_autorizador_id,
      },
    });
  }

  return {
    message: resultado.mensagem,
    caixa: {
      ...fechado,
      status: normalizeCashStatus(fechado.status),
    },
    resumo: {
      ...resumo,
      valor_final: valorFinalNumber,
      diferenca,
    },
    resultado,
  };
};

const close = async (payload) => {
  const caixasAbertos = await cashRepository.listOpen();

  if (!caixasAbertos.length) {
    const error = new Error('Nenhum caixa aberto encontrado.');
    error.statusCode = 404;
    throw error;
  }

  return closeById({
    ...payload,
    caixa_id: caixasAbertos[0].id,
  });
};

const createMovement = async ({
  caixa_id,
  usuario_id,
  usuario_nivel_acesso,
  tipo,
  valor,
  motivo,
  gerencial_token,
  motivo_autorizacao,
}) => {
  const { userId, userLevel } = assertAuthenticatedUser(
    usuario_id,
    usuario_nivel_acesso
  );
  const cashId = Number(caixa_id);
  if (!Number.isInteger(cashId) || cashId <= 0) {
    const error = new Error('caixa_id é obrigatório para movimentação.');
    error.statusCode = 400;
    throw error;
  }

  const caixa = await cashRepository.findById(cashId);
  if (!caixa) {
    const error = new Error('Caixa não encontrado.');
    error.statusCode = 404;
    throw error;
  }
  if (String(caixa.status || '').toLowerCase() !== 'aberto') {
    const error = new Error('Caixa fechado.');
    error.statusCode = 409;
    throw error;
  }

  if (!['suprimento', 'sangria'].includes(tipo)) {
    const error = new Error('Tipo de movimentação inválido.');
    error.statusCode = 400;
    throw error;
  }

  const motivoNormalizado = String(motivo || '').trim();
  if (!motivoNormalizado) {
    const error = new Error('Motivo é obrigatório.');
    error.statusCode = 400;
    throw error;
  }

  const valorNumber = parseMoney(valor, 'Valor');
  if (valorNumber <= 0) {
    const error = new Error('Valor deve ser maior que zero.');
    error.statusCode = 400;
    throw error;
  }

  const action = tipo === 'sangria' ? 'registrar_sangria' : 'registrar_suprimento';
  const resumoAntes = await calculateCashSummary(caixa);
  if (tipo === 'sangria' && valorNumber > resumoAntes.valor_esperado) {
    const hasDirectManagerAccess = isManagementLevel(userLevel);
    if (!hasDirectManagerAccess && !gerencial_token) {
      const error = new Error(
        'Sangria maior que o valor disponível exige autorização gerencial.'
      );
      error.statusCode = 403;
      throw error;
    }
  }

  const authorization = await assertManagerAuthorizationWhenRequired({
    userId,
    userLevel,
    action,
    authorizationToken: gerencial_token,
    reason: motivo_autorizacao || motivoNormalizado,
    entidade: 'caixas',
    entidade_id: cashId,
    valor: valorNumber,
  });

  await cashRepository.createMovement({
    caixa_id: cashId,
    usuario_id: userId,
    gerente_autorizador_id: authorization.gerente_autorizador_id,
    tipo,
    valor: valorNumber,
    motivo: motivoNormalizado,
  });

  const [movimentos, resumo] = await Promise.all([
    cashRepository.listMovementsByCash(cashId),
    calculateCashSummary(caixa),
  ]);

  await auditRepository.logAudit({
    usuario_id: userId,
    acao: tipo === 'sangria' ? 'caixa.sangria' : 'caixa.suprimento',
    entidade: 'caixas',
    entidade_id: cashId,
    detalhes: {
      tipo,
      valor: valorNumber,
      motivo: motivoNormalizado,
      gerente_autorizador_id: authorization.gerente_autorizador_id,
    },
  });

  return {
    message:
      tipo === 'sangria'
        ? 'Sangria registrada com sucesso.'
        : 'Suprimento registrado com sucesso.',
    caixa_id: cashId,
    movimentos,
    resumo,
  };
};

const listMovements = async (caixa_id = null) => {
  const cashId = Number(caixa_id);
  if (Number.isInteger(cashId) && cashId > 0) {
    const caixa = await cashRepository.findById(cashId);
    if (!caixa) {
      const error = new Error('Caixa não encontrado.');
      error.statusCode = 404;
      throw error;
    }

    const [movimentos, resumo] = await Promise.all([
      cashRepository.listMovementsByCash(cashId),
      calculateCashSummary(caixa),
    ]);

    return {
      caixa: {
        ...caixa,
        status: normalizeCashStatus(caixa.status),
      },
      resumo,
      movimentos,
    };
  }

  const caixasAbertos = await cashRepository.listOpen();
  if (!caixasAbertos.length) {
    return {
      caixa: null,
      resumo: null,
      movimentos: [],
    };
  }

  const caixaAtual = caixasAbertos[0];
  const [movimentos, resumo] = await Promise.all([
    cashRepository.listMovementsByCash(caixaAtual.id),
    calculateCashSummary(caixaAtual),
  ]);

  return {
    caixa: {
      ...caixaAtual,
      status: normalizeCashStatus(caixaAtual.status),
    },
    resumo,
    movimentos,
  };
};

const listOpenCashes = async () => {
  const caixasAbertos = await cashRepository.listOpen();

  return caixasAbertos.map((caixa) => ({
    ...caixa,
    status: normalizeCashStatus(caixa.status),
  }));
};

const getById = async (id) => {
  const caixa = await cashRepository.findById(id);
  if (!caixa) {
    const error = new Error('Caixa não encontrado.');
    error.statusCode = 404;
    throw error;
  }

  const resumo = await calculateCashSummary(caixa);
  return {
    ...caixa,
    status: normalizeCashStatus(caixa.status),
    resumo,
  };
};

const listSalesByCash = async (caixaId) => {
  const caixa = await cashRepository.findById(caixaId);
  if (!caixa) {
    const error = new Error('Caixa não encontrado.');
    error.statusCode = 404;
    throw error;
  }

  const vendas = await cashRepository.listSalesByCash(caixaId);

  return {
    caixa: {
      ...caixa,
      status: normalizeCashStatus(caixa.status),
    },
    vendas,
  };
};

const openManyForTest = async ({
  quantidade,
  usuario_id,
  usuario_nivel_acesso,
}) => {
  const qty = Number(quantidade);
  if (!Number.isInteger(qty) || qty <= 0) {
    const error = new Error('Quantidade inválida para abrir caixas de teste.');
    error.statusCode = 400;
    throw error;
  }

  const opened = [];
  const existing = [];
  for (let numero = 1; numero <= qty; numero += 1) {
    const openedCash = await cashRepository.findOpenByNumber(numero);
    if (openedCash) {
      existing.push(openedCash);
      continue;
    }

    const result = await open({
      usuario_id,
      usuario_nivel_acesso,
      numero,
      operador_id: usuario_id,
      valor_inicial: 100,
      observacao: `Abertura automática de teste caixa ${numero}`,
      gerencial_token: null,
      motivo_autorizacao: 'Abertura automática de teste',
    });
    opened.push(result.caixa);
  }

  const caixasAbertos = await listOpenCashes();
  return {
    message: `Teste concluído. ${opened.length} caixa(s) aberto(s), ${existing.length} já estavam abertos.`,
    abertas: opened,
    ja_abertas: existing,
    caixas_abertos: caixasAbertos,
  };
};

const sellInCashesForTest = async ({
  vendas = [],
  usuario_id,
  usuario_nivel_acesso,
}) => {
  assertAuthenticatedUser(usuario_id, usuario_nivel_acesso);

  if (!Array.isArray(vendas) || vendas.length === 0) {
    const error = new Error('Informe vendas para simulação.');
    error.statusCode = 400;
    throw error;
  }

  const results = await Promise.all(
    vendas.map((venda, idx) =>
      orderService.create({
        caixa_id: venda.caixa_id,
        usuario_id,
        itens: [
          {
            item_id: venda.item_id || venda.produto_id,
            quantidade: venda.quantidade || 1,
          },
        ],
        cliente_nome: venda.cliente_nome || `Teste caixa ${venda.caixa_id}`,
        tipo: 'balcao',
        forma_pagamento: venda.forma_pagamento || 'dinheiro',
        status_pagamento: 'pago',
        observacao: venda.observacao || `Simulação ${idx + 1}`,
      })
    )
  );

  return {
    message: 'Vendas simuladas com sucesso.',
    resultados: results,
  };
};

module.exports = {
  getOpen,
  open,
  close,
  closeById,
  createMovement,
  listMovements,
  calculateCashSummary,
  listOpenCashes,
  getById,
  listSalesByCash,
  openManyForTest,
  sellInCashesForTest,
};
