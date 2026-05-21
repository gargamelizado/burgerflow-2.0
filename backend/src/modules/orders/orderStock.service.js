const productRepository = require('../products/product.repository');
const { toNumber } = require('../../utils/itemRules');

const mergeIngredientes = (ingredientes) => {
  const grouped = new Map();

  for (const ingrediente of ingredientes) {
    const key = `${ingrediente.ingrediente_id}:${ingrediente.unidade_base}`;
    const current = grouped.get(key);

    if (current) {
      current.quantidade_necessaria_base += ingrediente.quantidade_necessaria_base;
      continue;
    }

    grouped.set(key, {
      ...ingrediente,
      quantidade_necessaria_base: ingrediente.quantidade_necessaria_base,
    });
  }

  return Array.from(grouped.values());
};

const resolverIngredientesDoItem = async (
  itemId,
  quantidadeVendida,
  connection
) => {
  const item = await productRepository.findBaseById(itemId, connection);

  if (!item) {
    const error = new Error('Item do pedido não encontrado.');
    error.statusCode = 404;
    throw error;
  }

  if (item.tipo === 'INGREDIENTE') {
    const error = new Error('Ingrediente não pode ser vendido diretamente.');
    error.statusCode = 400;
    throw error;
  }

  const quantidade = toNumber(quantidadeVendida);

  if (quantidade <= 0) {
    const error = new Error('Quantidade vendida deve ser maior que zero.');
    error.statusCode = 400;
    throw error;
  }

  if (item.tipo === 'PRODUTO') {
    const ingredientes = await productRepository.listProductIngredients(
      item.id,
      connection
    );

    if (!ingredientes.length) {
      const error = new Error(`Produto ${item.nome} não possui ingredientes.`);
      error.statusCode = 400;
      throw error;
    }

    return ingredientes.map((ingrediente) => ({
      ingrediente_id: ingrediente.ingrediente_id,
      ingrediente_nome: ingrediente.ingrediente_nome,
      quantidade_necessaria_base:
        toNumber(ingrediente.quantidade_usada_base) * quantidade,
      unidade_base: ingrediente.unidade_base,
    }));
  }

  if (item.tipo === 'COMBO') {
    const comboItens = await productRepository.listComboItems(item.id, connection);

    if (!comboItens.length) {
      const error = new Error(`Combo ${item.nome} não possui produtos.`);
      error.statusCode = 400;
      throw error;
    }

    const ingredientes = [];

    for (const comboItem of comboItens) {
      const ingredientesProduto = await resolverIngredientesDoItem(
        comboItem.produto_id,
        toNumber(comboItem.quantidade) * quantidade,
        connection
      );

      ingredientes.push(...ingredientesProduto);
    }

    return mergeIngredientes(ingredientes);
  }

  const promocao = await productRepository.findPromotionByItemId(
    item.id,
    connection
  );

  if (!promocao || !promocao.ativo) {
    const error = new Error(`Promoção ${item.nome} não está ativa.`);
    error.statusCode = 400;
    throw error;
  }

  return resolverIngredientesDoItem(
    promocao.item_original_id,
    quantidade,
    connection
  );
};

const verificarEstoqueNegativo = async (
  ingredientesNecessarios,
  connection
) => {
  const avisos = [];

  for (const ingrediente of ingredientesNecessarios) {
    const estoque = await productRepository.findStockByIngredientId(
      ingrediente.ingrediente_id,
      connection
    );

    if (!estoque) {
      const error = new Error(
        `Ingrediente ${ingrediente.ingrediente_nome} não possui estoque.`
      );
      error.statusCode = 400;
      throw error;
    }

    if (estoque.unidade_base !== ingrediente.unidade_base) {
      const error = new Error(
        `Unidade de estoque incompatível para ${estoque.ingrediente_nome}.`
      );
      error.statusCode = 400;
      throw error;
    }

    const disponivel = toNumber(estoque.quantidade_total_base);
    const quantidadeNecessaria = toNumber(
      ingrediente.quantidade_necessaria_base
    );
    const estoqueDepois = disponivel - quantidadeNecessaria;

    if (estoqueDepois < 0) {
      avisos.push({
        ingrediente_id: ingrediente.ingrediente_id,
        ingrediente: estoque.ingrediente_nome,
        estoqueAtual: disponivel,
        quantidadeNecessaria,
        estoqueDepois,
        unidade_base: estoque.unidade_base,
        message: `Atenção: ${estoque.ingrediente_nome} ficará com estoque negativo: ${estoqueDepois} ${estoque.unidade_base}`,
      });
    }
  }

  return {
    permiteVenda: true,
    avisos,
  };
};

const baixarEstoque = async (ingredientesNecessarios, pedidoId, connection) => {
  for (const ingrediente of ingredientesNecessarios) {
    const estoque = await productRepository.findStockByIngredientId(
      ingrediente.ingrediente_id,
      connection
    );
    const quantidadeAnterior = toNumber(estoque.quantidade_total_base);
    const quantidadeNova =
      quantidadeAnterior - toNumber(ingrediente.quantidade_necessaria_base);

    await productRepository.updateStockQuantity(
      ingrediente.ingrediente_id,
      quantidadeNova,
      connection
    );

    await productRepository.createStockMovement(
      {
        ingrediente_id: ingrediente.ingrediente_id,
        pedido_id: pedidoId,
        tipo: 'venda',
        quantidade: ingrediente.quantidade_necessaria_base,
        unidade_base: ingrediente.unidade_base,
        quantidade_anterior: quantidadeAnterior,
        quantidade_nova: quantidadeNova,
        motivo: 'Baixa automática por pedido',
      },
      connection
    );
  }
};

module.exports = {
  resolverIngredientesDoItem,
  verificarEstoqueNegativo,
  baixarEstoque,
  mergeIngredientes,
};
