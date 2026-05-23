const db = require('../../config/db');
const orderRepository = require('./order.repository');
const productRepository = require('../products/product.repository');
const {
  resolverIngredientesDoItem,
  verificarEstoqueSuficiente,
  baixarEstoque,
  mergeIngredientes,
} = require('./orderStock.service');
const { toNumber } = require('../../utils/itemRules');

const statusPermitidos = ['novo', 'em_preparo', 'pronto', 'entregue', 'cancelado'];

const list = async () => {
  return orderRepository.list();
};

const getItemPrice = async (item, connection) => {
  if (item.tipo === 'PROMOCAO') {
    const promocao = await productRepository.findPromotionByItemId(
      item.id,
      connection
    );

    if (!promocao || !promocao.ativo) {
      const error = new Error(`Promoção ${item.nome} não está ativa.`);
      error.statusCode = 400;
      throw error;
    }

    return {
      preco: toNumber(promocao.preco_promocional),
      item_original_id: promocao.item_original_id,
      preco_original: toNumber(promocao.item_original_preco),
    };
  }

  return {
    preco: toNumber(item.preco_venda),
    item_original_id: null,
    preco_original: toNumber(item.preco_venda),
  };
};

const normalizeOrderItems = async (itens = [], connection) => {
  if (!Array.isArray(itens) || itens.length === 0) {
    const error = new Error('Pedido precisa ter pelo menos 1 item.');
    error.statusCode = 400;
    throw error;
  }

  const normalized = [];
  const ingredientes = [];

  for (const itemPedido of itens) {
    const itemId = Number(
      itemPedido.item_id || itemPedido.produto_id || itemPedido.id
    );
    const quantidade = toNumber(itemPedido.quantidade);

    if (!itemId || quantidade <= 0) {
      const error = new Error('Item do pedido e quantidade são obrigatórios.');
      error.statusCode = 400;
      throw error;
    }

    const item = await productRepository.findBaseById(itemId, connection);

    if (!item || !item.ativo) {
      const error = new Error('Item do pedido não encontrado ou inativo.');
      error.statusCode = 404;
      throw error;
    }

    if (item.tipo === 'INGREDIENTE') {
      const error = new Error('Ingrediente não pode ser item de pedido.');
      error.statusCode = 400;
      throw error;
    }

    const priceInfo = await getItemPrice(item, connection);
    const subtotal = priceInfo.preco * quantidade;
    const descontoUnitario = Math.max(
      priceInfo.preco_original - priceInfo.preco,
      0
    );
    const ingredientesDoItem = await resolverIngredientesDoItem(
      item.id,
      quantidade,
      connection
    );

    ingredientes.push(...ingredientesDoItem);

    normalized.push({
      item_id: item.id,
      item_nome: item.nome,
      item_tipo: item.tipo,
      item_original_id: priceInfo.item_original_id,
      quantidade,
      preco_unitario: priceInfo.preco,
      desconto: descontoUnitario * quantidade,
      subtotal,
    });
  }

  return {
    itens: normalized,
    ingredientes: mergeIngredientes(ingredientes),
  };
};

const create = async (data) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const caixaId = Number(data.caixa_id);
    if (!Number.isInteger(caixaId) || caixaId <= 0) {
      const error = new Error('caixa_id é obrigatório.');
      error.statusCode = 400;
      throw error;
    }

    const caixa = await orderRepository.findCashById(caixaId, connection);
    if (!caixa) {
      const error = new Error('Caixa não encontrado.');
      error.statusCode = 404;
      throw error;
    }

    if (String(caixa.status || '').toLowerCase() !== 'aberto') {
      const error = new Error('Caixa fechado. Não é possível vender.');
      error.statusCode = 409;
      throw error;
    }

    const normalized = await normalizeOrderItems(data.itens, connection);
    const estoqueMap = await verificarEstoqueSuficiente(
      normalized.ingredientes,
      connection
    );

    const numero = await orderRepository.getNextNumber(connection);
    const total = normalized.itens.reduce(
      (sum, item) => sum + toNumber(item.subtotal),
      0
    );
    const desconto = normalized.itens.reduce(
      (sum, item) => sum + toNumber(item.desconto),
      0
    );

    const pedidoId = await orderRepository.create(
      {
        numero,
        caixa_id: caixa.id,
        usuario_id: data.usuario_id || null,
        cliente_nome: data.cliente_nome || 'Cliente',
        tipo: data.tipo || 'balcao',
        total,
        desconto,
        forma_pagamento: data.forma_pagamento || 'dinheiro',
        status_pagamento: data.status_pagamento || 'pago',
        observacao: data.observacao || '',
      },
      connection
    );

    await orderRepository.createItems(pedidoId, normalized.itens, connection);
    await baixarEstoque(
      normalized.ingredientes,
      pedidoId,
      connection,
      estoqueMap
    );

    await orderRepository.createCashSaleMovement(
      {
        caixa_id: caixaId,
        pedido_id: pedidoId,
        usuario_id: data.usuario_id || null,
        valor: total,
        forma_pagamento: data.forma_pagamento || 'dinheiro',
        status_pagamento: data.status_pagamento || 'pago',
        motivo: `Venda pedido ${numero}`,
      },
      connection
    );
    await orderRepository.incrementCashTotalSales(caixaId, total, connection);

    await connection.commit();

    const pedido = await orderRepository.findById(pedidoId);

    return {
      message: 'Pedido registrado e estoque baixado com sucesso.',
      pedido,
      itens: normalized.itens,
      ingredientes_baixados: normalized.ingredientes,
      avisos_estoque: [],
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const updateStatus = async (id, status) => {
  if (!statusPermitidos.includes(status)) {
    const error = new Error('Status de pedido inválido.');
    error.statusCode = 400;
    throw error;
  }

  const pedido = await orderRepository.findById(id);

  if (!pedido) {
    const error = new Error('Pedido não encontrado.');
    error.statusCode = 404;
    throw error;
  }

  return orderRepository.updateStatus(id, status);
};

const correctStatus = async ({ id, status, actorUserId, actorUserLevel }) => {
  if (!['admin', 'gerente'].includes(actorUserLevel)) {
    const error = new Error('Acesso restrito para correção de status.');
    error.statusCode = 403;
    throw error;
  }

  if (!statusPermitidos.includes(status)) {
    const error = new Error('Status de pedido inválido.');
    error.statusCode = 400;
    throw error;
  }

  const pedido = await orderRepository.findById(id);

  if (!pedido) {
    const error = new Error('Pedido não encontrado.');
    error.statusCode = 404;
    throw error;
  }

  const statusAnterior = pedido.status;
  const updated = await orderRepository.updateStatus(id, status);

  await orderRepository.logAudit({
    usuario_id: actorUserId,
    acao: 'pedido_status_corrigido',
    entidade: 'pedidos',
    entidade_id: Number(id),
    detalhes: {
      status_anterior: statusAnterior,
      status_novo: status,
      corrigido_por: actorUserLevel,
    },
  });

  return {
    message: 'Status do pedido corrigido com sucesso.',
    pedido: updated,
  };
};

module.exports = {
  list,
  create,
  updateStatus,
  correctStatus,
};
