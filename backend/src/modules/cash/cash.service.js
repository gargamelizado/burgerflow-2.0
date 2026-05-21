const cashRepository = require('./cash.repository');

const getOpen = async () => {
  const caixa = await cashRepository.findOpen();

  return {
    aberto: Boolean(caixa),
    caixa: caixa || null,
  };
};

const open = async ({ usuario_id, valor_inicial, observacao }) => {
  const caixaAberto = await cashRepository.findOpen();

  if (caixaAberto) {
    const error = new Error('Já existe um caixa aberto.');
    error.statusCode = 409;
    throw error;
  }

  const valorInicialNumber = Number(valor_inicial || 0);

  if (valorInicialNumber < 0) {
    const error = new Error('Valor inicial não pode ser negativo.');
    error.statusCode = 400;
    throw error;
  }

  const caixa = await cashRepository.open({
    usuario_id,
    valor_inicial: valorInicialNumber,
    observacao: observacao || '',
  });

  return {
    message: 'Caixa aberto com sucesso.',
    caixa,
  };
};

const close = async ({ valor_final, observacao }) => {
  const caixaAberto = await cashRepository.findOpen();

  if (!caixaAberto) {
    const error = new Error('Nenhum caixa aberto encontrado.');
    error.statusCode = 404;
    throw error;
  }

  const valorFinalNumber = Number(valor_final || 0);

  if (valorFinalNumber < 0) {
    const error = new Error('Valor final não pode ser negativo.');
    error.statusCode = 400;
    throw error;
  }

  const movimentos = await cashRepository.listMovementsByCash(caixaAberto.id);

  const totalSuprimentos = movimentos
    .filter((movimento) => movimento.tipo === 'suprimento')
    .reduce((total, movimento) => total + Number(movimento.valor || 0), 0);

  const totalVendas = movimentos
    .filter((movimento) => movimento.tipo === 'venda')
    .reduce((total, movimento) => total + Number(movimento.valor || 0), 0);

  const totalSangrias = movimentos
    .filter((movimento) => movimento.tipo === 'sangria')
    .reduce((total, movimento) => total + Number(movimento.valor || 0), 0);

  const valorInicial = Number(caixaAberto.valor_inicial || 0);
  const valorEsperado = valorInicial + totalVendas + totalSuprimentos - totalSangrias;
  const diferenca = valorFinalNumber - valorEsperado;

  const caixa = await cashRepository.close({
    id: caixaAberto.id,
    valor_final: valorFinalNumber,
    valor_esperado: valorEsperado,
    diferenca,
    observacao: observacao || '',
  });

  return {
    message: 'Caixa fechado com sucesso.',
    caixa,
    resumo: {
      valor_inicial: valorInicial,
      total_vendas: totalVendas,
      total_suprimentos: totalSuprimentos,
      total_sangrias: totalSangrias,
      valor_esperado: valorEsperado,
      valor_final: valorFinalNumber,
      diferenca,
    },
  };
};

const createMovement = async ({ tipo, valor, motivo }) => {
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

  const valorNumber = Number(valor || 0);

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

  const movimentos = await cashRepository.listMovementsByCash(caixaAberto.id);

  return {
    message: 'Movimentação registrada com sucesso.',
    caixa_id: caixaAberto.id,
    movimentos,
  };
};

const listMovements = async () => {
  const caixaAberto = await cashRepository.findOpen();

  if (!caixaAberto) {
    return {
      caixa: null,
      movimentos: [],
    };
  }

  const movimentos = await cashRepository.listMovementsByCash(caixaAberto.id);

  return {
    caixa: caixaAberto,
    movimentos,
  };
};

module.exports = {
  getOpen,
  open,
  close,
  createMovement,
  listMovements,
};
