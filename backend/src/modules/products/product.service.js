const db = require('../../config/db');
const productRepository = require('./product.repository');
const {
  toNumber,
  validarTipoItem,
  validarCategoria,
  converterParaBase,
  calcularEstoqueBase,
} = require('../../utils/itemRules');

const ensureRequired = (value, message) => {
  if (value === undefined || value === null || value === '') {
    const error = new Error(message);
    error.statusCode = 400;
    throw error;
  }
};

const normalizeBoolean = (value, fallback) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  return Boolean(value);
};

const normalizeStockPolicy = (value) => {
  const policy = String(value || 'STRICT').trim().toUpperCase();
  const validPolicies = ['STRICT', 'MANAGER_OVERRIDE', 'NO_CONTROL'];
  return validPolicies.includes(policy) ? policy : 'STRICT';
};

const normalizeBaseItem = (data, forcedType) => {
  ensureRequired(data.nome, 'Nome é obrigatório.');

  const tipo = validarTipoItem(forcedType || data.tipo);
  const categoriaPadrao = tipo === 'INGREDIENTE' ? 'ingrediente' : '';
  const categoria = validarCategoria(data.categoria || categoriaPadrao);

  if (tipo === 'INGREDIENTE') {
    return {
      nome: String(data.nome).trim(),
      tipo,
      categoria,
      preco_venda: null,
      ativo: normalizeBoolean(data.ativo, true),
      aparece_cardapio: false,
      politica_estoque: normalizeStockPolicy(data.politica_estoque),
    };
  }

  const promoPayload = data.promocao || data;
  const precoVenda =
    tipo === 'PROMOCAO'
      ? toNumber(promoPayload.preco_promocional || data.preco_venda)
      : toNumber(data.preco_venda);

  if (precoVenda <= 0) {
    const error = new Error('Preço de venda deve ser maior que zero.');
    error.statusCode = 400;
    throw error;
  }

  return {
    nome: String(data.nome).trim(),
    tipo,
    categoria,
    preco_venda: precoVenda,
    ativo: normalizeBoolean(data.ativo, true),
    aparece_cardapio: normalizeBoolean(data.aparece_cardapio, true),
    politica_estoque: normalizeStockPolicy(data.politica_estoque),
  };
};

const getStockPayload = (data) => {
  return data.estoque || data;
};

const normalizeStock = (itemId, data) => {
  const payload = getStockPayload(data);
  const calculado = calcularEstoqueBase(payload);

  return {
    ingrediente_id: itemId,
    tipo_entrada: payload.tipo_entrada,
    quantidade_entrada: toNumber(payload.quantidade_entrada),
    pacotes_por_caixa:
      payload.tipo_entrada === 'cx' ? toNumber(payload.pacotes_por_caixa) : null,
    quantidade_por_pacote:
      payload.tipo_entrada === 'cx' || payload.tipo_entrada === 'pacote'
        ? toNumber(payload.quantidade_por_pacote)
        : null,
    unidade_medida: payload.unidade_medida,
    quantidade_total_base: calculado.quantidade_total_base,
    unidade_base: calculado.unidade_base,
  };
};

const normalizeProductIngredients = async (ingredientes = [], connection) => {
  if (!Array.isArray(ingredientes) || ingredientes.length === 0) {
    const error = new Error('Produto precisa ter pelo menos 1 ingrediente.');
    error.statusCode = 400;
    throw error;
  }

  const grouped = new Map();

  for (const ingrediente of ingredientes) {
    const ingredienteId = Number(ingrediente.ingrediente_id);
    const ingredienteItem = await productRepository.findBaseById(
      ingredienteId,
      connection
    );

    if (!ingredienteItem || ingredienteItem.tipo !== 'INGREDIENTE') {
      const error = new Error('Produto só pode usar itens do tipo INGREDIENTE.');
      error.statusCode = 400;
      throw error;
    }

    const estoque = await productRepository.findStockByIngredientId(
      ingredienteId,
      connection
    );

    if (!estoque) {
      const error = new Error(
        `Ingrediente ${ingredienteItem.nome} não possui estoque cadastrado.`
      );
      error.statusCode = 400;
      throw error;
    }

    const convertido = converterParaBase(
      ingrediente.quantidade_usada,
      ingrediente.unidade_usada
    );

    if (convertido.unidade_base !== estoque.unidade_base) {
      const error = new Error(
        `Unidade incompatível para ${ingredienteItem.nome}. Use ${estoque.unidade_base}.`
      );
      error.statusCode = 400;
      throw error;
    }

    const current = grouped.get(ingredienteId);

    if (current) {
      current.quantidade_usada_base += convertido.quantidade_base;
      current.quantidade_usada = current.quantidade_usada_base;
      current.unidade_usada = current.unidade_base;
      continue;
    }

    grouped.set(ingredienteId, {
      ingrediente_id: ingredienteId,
      quantidade_usada: toNumber(ingrediente.quantidade_usada),
      unidade_usada: ingrediente.unidade_usada,
      quantidade_usada_base: convertido.quantidade_base,
      unidade_base: convertido.unidade_base,
    });
  }

  return Array.from(grouped.values());
};

const normalizeComboItems = async (produtos = [], connection) => {
  if (!Array.isArray(produtos) || produtos.length === 0) {
    const error = new Error('Combo precisa ter pelo menos 1 produto.');
    error.statusCode = 400;
    throw error;
  }

  const grouped = new Map();

  for (const produto of produtos) {
    const produtoId = Number(produto.produto_id);
    const item = await productRepository.findBaseById(produtoId, connection);

    if (!item || item.tipo !== 'PRODUTO') {
      const error = new Error('Combo só pode conter itens do tipo PRODUTO.');
      error.statusCode = 400;
      throw error;
    }

    const quantidade = toNumber(produto.quantidade);

    if (quantidade <= 0) {
      const error = new Error('Quantidade do produto no combo deve ser maior que zero.');
      error.statusCode = 400;
      throw error;
    }

    const current = grouped.get(produtoId);

    if (current) {
      current.quantidade += quantidade;
      continue;
    }

    grouped.set(produtoId, {
      produto_id: produtoId,
      quantidade,
    });
  }

  return Array.from(grouped.values());
};

const normalizePromotion = async (itemId, data, connection) => {
  const promocao = data.promocao || data;
  const itemOriginalId = Number(promocao.item_original_id);
  const itemOriginal = await productRepository.findBaseById(
    itemOriginalId,
    connection
  );

  if (!itemOriginal || !['PRODUTO', 'COMBO'].includes(itemOriginal.tipo)) {
    const error = new Error('Promoção deve apontar para um PRODUTO ou COMBO.');
    error.statusCode = 400;
    throw error;
  }

  const precoPromocional = toNumber(
    promocao.preco_promocional || data.preco_promocional || data.preco_venda
  );

  if (precoPromocional <= 0) {
    const error = new Error('Preço promocional deve ser maior que zero.');
    error.statusCode = 400;
    throw error;
  }

  return {
    promocao_id: itemId,
    item_original_id: itemOriginalId,
    preco_promocional: precoPromocional,
    data_inicio: promocao.data_inicio || null,
    data_fim: promocao.data_fim || null,
    ativo: normalizeBoolean(promocao.ativo, true),
  };
};

const enrichItem = async (item, connection) => {
  if (!item) {
    return null;
  }

  const enriched = {
    ...item,
    preco: Number(item.preco || item.preco_venda || 0),
  };

  if (item.tipo === 'PRODUTO') {
    enriched.ingredientes = await productRepository.listProductIngredients(
      item.id,
      connection
    );
  }

  if (item.tipo === 'COMBO') {
    enriched.combo_itens = await productRepository.listComboItems(
      item.id,
      connection
    );
  }

  if (item.tipo === 'PROMOCAO') {
    enriched.promocao = await productRepository.findPromotionByItemId(
      item.id,
      connection
    );
  }

  return enriched;
};

const list = async (filters = {}) => {
  return productRepository.list(filters);
};

const listCardapio = async (filters = {}) => {
  const categoria = String(filters.categoria || '').trim().toLowerCase();
  const tipo = filters.tipo ? validarTipoItem(filters.tipo) : undefined;

  if (tipo === 'INGREDIENTE') {
    return [];
  }

  return productRepository.list({
    ativo: true,
    aparece_cardapio: true,
    excluir_ingredientes: true,
    categoria,
    tipo,
  });
};

const findDetails = async (id) => {
  const item = await productRepository.findById(id);

  if (!item) {
    const error = new Error('Item não encontrado.');
    error.statusCode = 404;
    throw error;
  }

  return enrichItem(item);
};

const saveComposition = async (id, tipo, data, connection) => {
  await productRepository.deleteComposition(id, connection);

  if (tipo === 'INGREDIENTE') {
    const stock = normalizeStock(id, data);
    await productRepository.upsertStock(stock, connection);
  }

  if (tipo === 'PRODUTO') {
    const ingredientes = await normalizeProductIngredients(
      data.ingredientes,
      connection
    );
    await productRepository.replaceProductIngredients(
      id,
      ingredientes,
      connection
    );
  }

  if (tipo === 'COMBO') {
    const comboItens = await normalizeComboItems(data.combo_itens, connection);
    await productRepository.replaceComboItems(id, comboItens, connection);
  }

  if (tipo === 'PROMOCAO') {
    const promocao = await normalizePromotion(id, data, connection);
    await productRepository.upsertPromotion(promocao, connection);
  }
};

const create = async (data, forcedType) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const item = normalizeBaseItem(data, forcedType);
    const itemId = await productRepository.createItem(item, connection);

    await saveComposition(itemId, item.tipo, data, connection);

    await connection.commit();

    return findDetails(itemId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const update = async (id, data, forcedType) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const current = await productRepository.findBaseById(id, connection);

    if (!current) {
      const error = new Error('Item não encontrado.');
      error.statusCode = 404;
      throw error;
    }

    const item = normalizeBaseItem(
      {
        ...data,
        tipo: forcedType || data.tipo || current.tipo,
      },
      forcedType
    );

    await productRepository.updateItem(id, item, connection);
    await saveComposition(id, item.tipo, data, connection);

    await connection.commit();

    return findDetails(id);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const remove = async (id) => {
  const item = await productRepository.findBaseById(id);

  if (!item) {
    const error = new Error('Item não encontrado.');
    error.statusCode = 404;
    throw error;
  }

  await productRepository.deactivate(id);

  return {
    message: 'Item desativado com sucesso.',
  };
};

module.exports = {
  list,
  listCardapio,
  findDetails,
  create,
  update,
  remove,
};
