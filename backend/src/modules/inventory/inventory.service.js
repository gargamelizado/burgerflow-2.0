const inventoryRepository = require('./inventory.repository');

const movimentar = async (data) => {
  const produtoId = Number(data.produto_id);
  const quantidade = Number(data.quantidade);
  const tipo = data.tipo;
  const motivo = data.motivo || '';

  if (!produtoId) {
    const error = new Error('Produto é obrigatório.');
    error.statusCode = 400;
    throw error;
  }

  if (!['entrada', 'saida'].includes(tipo)) {
    const error = new Error('Tipo de movimentação inválido.');
    error.statusCode = 400;
    throw error;
  }

  if (!quantidade || quantidade <= 0) {
    const error = new Error('Quantidade deve ser maior que zero.');
    error.statusCode = 400;
    throw error;
  }

  const produto = await inventoryRepository.findProductById(produtoId);

  if (!produto) {
    const error = new Error('Produto não encontrado.');
    error.statusCode = 404;
    throw error;
  }

  const quantidadeAnterior = Number(produto.quantidade_estoque || 0);

  let quantidadeNova = quantidadeAnterior;

  if (tipo === 'entrada') {
    quantidadeNova = quantidadeAnterior + quantidade;
  }

  if (tipo === 'saida') {
    quantidadeNova = quantidadeAnterior - quantidade;
  }

  await inventoryRepository.updateProductStock(produtoId, quantidadeNova);

  await inventoryRepository.createMovement({
    produto_id: produtoId,
    tipo,
    quantidade,
    quantidade_anterior: quantidadeAnterior,
    quantidade_nova: quantidadeNova,
    motivo,
  });

  return {
    message: 'Movimentação registrada com sucesso.',
    produto_id: produtoId,
    quantidade_anterior: quantidadeAnterior,
    quantidade_nova: quantidadeNova,
  };
};

const historico = async () => {
  return inventoryRepository.listMovements();
};

module.exports = {
  movimentar,
  historico,
};