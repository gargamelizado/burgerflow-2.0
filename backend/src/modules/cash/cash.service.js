const cashRepository = require('./cash.repository');

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

const assertAuthenticatedUser = (usuario_id) => {
  const userId = Number(usuario_id);

  if (!Number.isInteger(userId) || userId <= 0) {
    const error = new Error('Usuário autenticado é obrigatório.');
    error.statusCode = 401;
    throw error;
  }

  return userId;
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
      mensagem: `Faltou R$ ${formatMoneyPtBr(Math.abs(diferenca))}.`,
    };
  }

  return {
    tipo: 'sobrou',
    mensagem: `Sobrou R$ ${formatMoneyPtBr(diferenca)}.`,
  };
};

const calculateCashSummary = async (caixa) => {
  const totais = await cashRepository.summarizeByCash(caixa.id);
  const valorInicial = toMoney(caixa.valor_inicial);
  const totalVendas = toMoney(totais.total_vendas);
  const totalSuprimentos = toMoney(totais.total_suprimentos);
  const totalSangrias = toMoney(totais.total_sangrias);
  const totalDespesas = toMoney(totais.total_despesas);
  const valorEsperado = toMoney(
    valorInicial + totalVendas + totalSuprimentos - totalSangrias - totalDespesas
  );

  return {
    valor_inicial: valorInicial,
    total_vendas: totalVendas,
    total_suprimentos: totalSuprimentos,
    total_sangrias: totalSangrias,
    total_despesas: totalDespesas,
    valor_esperado: valorEsperado,
  };
};

const getOpen = async () => {
  const caixa = await cashRepository.findOpen();

  if (!caixa) {
    return {
      aberto: false,
      caixa: null,
      resumo: null,
      movimentos: [],
    };
  }

  const [movimentos, resumo] = await Promise.all([
    cashRepository.listMovementsByCash(caixa.id),
    calculateCashSummary(caixa),
  ]);

  return {
    aberto: true,
    caixa,
    resumo,
    movimentos,
  };
};

const open = async ({ usuario_id, valor_inicial, observacao }) => {
  const usuarioId = assertAuthenticatedUser(usuario_id);
  const caixaAberto = await cashRepository.findOpen();

  if (caixaAberto) {
    const error = new Error('Já existe um caixa aberto.');
    error.statusCode = 409;
    throw error;
  }

  const valorInicialNumber = parseMoney(valor_inicial ?? 0, 'Valor inicial');

  if (valorInicialNumber < 0) {
    const error = new Error('Valor inicial não pode ser negativo.');
    error.statusCode = 400;
    throw error;
  }

  const caixa = await cashRepository.open({
    usuario_id: usuarioId,
    valor_inicial: valorInicialNumber,
    observacao: observacao || '',
  });

  const resumo = await calculateCashSummary(caixa);

  return {
    message: 'Caixa aberto com sucesso.',
    caixa,
    resumo,
  };
};

const close = async ({ usuario_id, valor_final, observacao }) => {
  assertAuthenticatedUser(usuario_id);
  const caixaAberto = await cashRepository.findOpen();

  if (!caixaAberto) {
    const error = new Error('Nenhum caixa aberto encontrado.');
    error.statusCode = 404;
    throw error;
  }

  const valorFinalNumber = parseMoney(valor_final, 'Valor final');

  if (valorFinalNumber < 0) {
    const error = new Error('Valor final não pode ser negativo.');
    error.statusCode = 400;
    throw error;
  }

  const resumo = await calculateCashSummary(caixaAberto);
  const diferenca = toMoney(valorFinalNumber - resumo.valor_esperado);
  const resultado = getDifferenceResult(diferenca);

  const caixa = await cashRepository.close({
    id: caixaAberto.id,
    valor_final: valorFinalNumber,
    valor_esperado: resumo.valor_esperado,
    diferenca,
    observacao: observacao || '',
  });

  if (!caixa) {
    const error = new Error('Não é possível fechar um caixa já fechado.');
    error.statusCode = 409;
    throw error;
  }

  return {
    message: 'Caixa fechado com sucesso.',
    caixa,
    resumo: {
      ...resumo,
      valor_final: valorFinalNumber,
      diferenca,
    },
    resultado,
  };
};

const createMovement = async ({ usuario_id, tipo, valor, motivo }) => {
  assertAuthenticatedUser(usuario_id);
  const caixaAberto = await cashRepository.findOpen();

  if (!caixaAberto) {
    const error = new Error('Nenhum caixa aberto encontrado.');
    error.statusCode = 404;
    throw error;
  }

  if (!['suprimento', 'sangria'].includes(tipo)) {
    const error = new Error('Tipo de movimentação inválido.');
    error.statusCode = 400;
    throw error;
  }

  const valorNumber = parseMoney(valor, 'Valor');

  if (valorNumber <= 0) {
    const error = new Error('Valor deve ser maior que zero.');
    error.statusCode = 400;
    throw error;
  }

  await cashRepository.createMovement({
    caixa_id: caixaAberto.id,
    tipo,
    valor: valorNumber,
    motivo: motivo || '',
  });

  const [movimentos, resumo] = await Promise.all([
    cashRepository.listMovementsByCash(caixaAberto.id),
    calculateCashSummary(caixaAberto),
  ]);

  return {
    message: 'Movimentação registrada com sucesso.',
    caixa_id: caixaAberto.id,
    movimentos,
    resumo,
  };
};

const listMovements = async () => {
  const caixaAberto = await cashRepository.findOpen();

  if (!caixaAberto) {
    return {
      caixa: null,
      resumo: null,
      movimentos: [],
    };
  }

  const [movimentos, resumo] = await Promise.all([
    cashRepository.listMovementsByCash(caixaAberto.id),
    calculateCashSummary(caixaAberto),
  ]);

  return {
    caixa: caixaAberto,
    resumo,
    movimentos,
  };
};

module.exports = {
  getOpen,
  open,
  close,
  createMovement,
  listMovements,
  calculateCashSummary,
};
