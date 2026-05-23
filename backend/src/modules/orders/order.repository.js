const db = require('../../config/db');

const executor = (connection) => connection || db;

const list = async () => {
  const [rows] = await db.query(`
    SELECT
      p.id,
      p.numero,
      p.caixa_id,
      p.usuario_id,
      p.cliente_nome,
      p.tipo,
      p.status,
      p.total,
      p.desconto,
      p.forma_pagamento,
      p.status_pagamento,
      p.observacao,
      p.criado_em,
      p.atualizado_em
    FROM pedidos p
    ORDER BY p.id DESC
  `);

  if (!rows.length) {
    return [];
  }

  const pedidoIds = rows.map((row) => row.id);
  const [itens] = await db.query(
    `
    SELECT
      id,
      pedido_id,
      item_id,
      item_nome,
      item_tipo,
      item_original_id,
      quantidade,
      preco_unitario,
      desconto,
      subtotal
    FROM pedido_itens
    WHERE pedido_id IN (?)
    ORDER BY id ASC
    `,
    [pedidoIds]
  );

  return rows.map((pedido) => ({
    ...pedido,
    itens: itens.filter((item) => item.pedido_id === pedido.id),
  }));
};

const getNextNumber = async (connection) => {
  const [rows] = await executor(connection).query(`
    SELECT COALESCE(MAX(numero), 0) + 1 AS proximo_numero
    FROM pedidos
  `);

  return rows[0].proximo_numero;
};

const findById = async (id, connection) => {
  const [rows] = await executor(connection).query(
    `
    SELECT
      id,
      numero,
      caixa_id,
      usuario_id,
      cliente_nome,
      tipo,
      status,
      total,
      desconto,
      forma_pagamento,
      status_pagamento,
      observacao,
      criado_em,
      atualizado_em
    FROM pedidos
    WHERE id = ?
    `,
    [id]
  );

  return rows[0] || null;
};

const create = async (pedido, connection) => {
  const [result] = await executor(connection).query(
    `
    INSERT INTO pedidos (
      numero,
      caixa_id,
      usuario_id,
      cliente_nome,
      tipo,
      status,
      total,
      desconto,
      forma_pagamento,
      status_pagamento,
      observacao
    ) VALUES (?, ?, ?, ?, ?, 'novo', ?, ?, ?, ?, ?)
    `,
    [
      pedido.numero,
      pedido.caixa_id || null,
      pedido.usuario_id || null,
      pedido.cliente_nome,
      pedido.tipo,
      pedido.total,
      pedido.desconto,
      pedido.forma_pagamento,
      pedido.status_pagamento,
      pedido.observacao,
    ]
  );

  return result.insertId;
};

const createItems = async (pedidoId, itens, connection) => {
  if (!itens.length) {
    return;
  }

  const values = itens.map((item) => [
    pedidoId,
    item.item_id,
    item.item_nome,
    item.item_tipo,
    item.item_original_id || null,
    item.quantidade,
    item.preco_unitario,
    item.desconto,
    item.subtotal,
  ]);

  await executor(connection).query(
    `
    INSERT INTO pedido_itens (
      pedido_id,
      item_id,
      item_nome,
      item_tipo,
      item_original_id,
      quantidade,
      preco_unitario,
      desconto,
      subtotal
    ) VALUES ?
    `,
    [values]
  );
};

const updateStatus = async (id, status) => {
  await db.query(
    `
    UPDATE pedidos
    SET status = ?
    WHERE id = ?
    `,
    [status, id]
  );

  return findById(id);
};

const findOpenCash = async (connection) => {
  const [rows] = await executor(connection).query(`
    SELECT
      id,
      valor_inicial,
      status
    FROM caixas
    WHERE status = 'aberto'
    ORDER BY id DESC
    LIMIT 1
  `);

  return rows[0] || null;
};

const findCashById = async (caixaId, connection) => {
  const [rows] = await executor(connection).query(
    `
    SELECT
      id,
      numero,
      usuario_id,
      operador_id,
      status,
      valor_inicial,
      valor_total_vendas
    FROM caixas
    WHERE id = ?
    LIMIT 1
    `,
    [caixaId]
  );

  return rows[0] || null;
};

const createCashSaleMovement = async (movimento, connection) => {
  await executor(connection).query(
    `
    INSERT INTO caixa_movimentos (
      caixa_id,
      pedido_id,
      usuario_id,
      tipo,
      valor,
      forma_pagamento,
      status_pagamento,
      motivo
    ) VALUES (?, ?, ?, 'venda', ?, ?, ?, ?)
    `,
    [
      movimento.caixa_id,
      movimento.pedido_id,
      movimento.usuario_id || null,
      movimento.valor,
      movimento.forma_pagamento,
      movimento.status_pagamento,
      movimento.motivo,
    ]
  );
};

const incrementCashTotalSales = async (caixaId, valor, connection) => {
  await executor(connection).query(
    `
    UPDATE caixas
    SET valor_total_vendas = COALESCE(valor_total_vendas, 0) + ?,
        atualizado_em = CURRENT_TIMESTAMP
    WHERE id = ?
    `,
    [valor, caixaId]
  );
};

const logAudit = async ({ usuario_id, acao, entidade, entidade_id, detalhes }) => {
  await db.query(
    `
    INSERT INTO auditoria (
      usuario_id,
      acao,
      entidade,
      entidade_id,
      detalhes
    ) VALUES (?, ?, ?, ?, ?)
    `,
    [
      usuario_id || null,
      acao,
      entidade || null,
      entidade_id || null,
      detalhes ? JSON.stringify(detalhes) : null,
    ]
  );
};

module.exports = {
  list,
  getNextNumber,
  findById,
  create,
  createItems,
  updateStatus,
  findOpenCash,
  findCashById,
  createCashSaleMovement,
  incrementCashTotalSales,
  logAudit,
};
