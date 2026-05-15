const db = require('../../config/db');

const list = async () => {
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
    ORDER BY id DESC
  `);

  return rows;
};

const getNextNumber = async () => {
  const [rows] = await db.query(`
    SELECT COALESCE(MAX(numero), 0) + 1 AS proximo_numero
    FROM pedidos
  `);

  return rows[0].proximo_numero;
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

const create = async (pedido) => {
  const [result] = await db.query(
    `
    INSERT INTO pedidos (
      numero,
      cliente_nome,
      tipo,
      status,
      total,
      observacao
    ) VALUES (?, ?, ?, 'novo', ?, ?)
    `,
    [
      pedido.numero,
      pedido.cliente_nome,
      pedido.tipo,
      pedido.total,
      pedido.observacao,
    ]
  );

  return findById(result.insertId);
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
  list,
  getNextNumber,
  findById,
  create,
  updateStatus,
};
