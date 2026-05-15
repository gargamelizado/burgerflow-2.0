
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
      atualizado_em
    FROM pedidos
    WHERE status NOT IN ('entregue', 'cancelado')
    ORDER BY criado_em ASC
  `);

  return rows;
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
      atualizado_em
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

