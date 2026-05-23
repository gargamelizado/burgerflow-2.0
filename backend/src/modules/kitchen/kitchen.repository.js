
const db = require('../../config/db');

const listOrders = async () => {
  const [rows] = await db.query(`
    SELECT
      id,
      numero,
      cliente_nome,
      tipo,
      status,
      total,
      observacao,
      criado_em,
      atualizado_em,
      TIMESTAMPDIFF(MINUTE, criado_em, NOW()) AS tempo_minutos
    FROM pedidos
    WHERE status <> 'cancelado'
    ORDER BY criado_em ASC
  `);

  if (!rows.length) {
    return [];
  }

  const pedidoIds = rows.map((pedido) => pedido.id);
  const [itens] = await db.query(
    `
    SELECT
      pedido_id,
      item_nome,
      item_tipo,
      quantidade,
      preco_unitario,
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

const findById = async (id) => {
  const [rows] = await db.query(
    `
    SELECT
      id,
      numero,
      cliente_nome,
      tipo,
      status,
      total,
      observacao,
      criado_em,
      atualizado_em,
      TIMESTAMPDIFF(MINUTE, criado_em, NOW()) AS tempo_minutos
    FROM pedidos
    WHERE id = ?
    `,
    [id]
  );

  return rows[0];
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

module.exports = {
  listOrders,
  findById,
  updateStatus,
};
