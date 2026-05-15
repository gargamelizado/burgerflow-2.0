const db = require('../../config/db');

const findOpen = async () => {
  const [rows] = await db.query(`
    SELECT
      id,
      usuario_id,
      valor_inicial,
      valor_final,
      valor_esperado,
      diferenca,
      status,
      observacao,
      aberto_em,
      fechado_em
    FROM caixas
    WHERE status = 'aberto'
    ORDER BY id DESC
    LIMIT 1
  `);

  return rows[0];
};

const findById = async (id) => {
  const [rows] = await db.query(
    `
    SELECT
      id,
      usuario_id,
      valor_inicial,
      valor_final,
      valor_esperado,
      diferenca,
      status,
      observacao,
      aberto_em,
      fechado_em
    FROM caixas
    WHERE id = ?
    `,
    [id]
  );

  return rows[0];
};

const open = async ({ usuario_id, valor_inicial, observacao }) => {
  const [result] = await db.query(
    `
    INSERT INTO caixas (
      usuario_id,
      valor_inicial,
      status,
      observacao
    ) VALUES (?, ?, 'aberto', ?)
    `,
    [usuario_id, valor_inicial, observacao]
  );

  return findById(result.insertId);
};

const close = async ({ id, valor_final, valor_esperado, diferenca, observacao }) => {
  await db.query(
    `
    UPDATE caixas
    SET
      valor_final = ?,
      valor_esperado = ?,
      diferenca = ?,
      status = 'fechado',
      observacao = ?,
      fechado_em = CURRENT_TIMESTAMP
    WHERE id = ?
    `,
    [valor_final, valor_esperado, diferenca, observacao, id]
  );

  return findById(id);
};

const createMovement = async ({ caixa_id, tipo, valor, motivo }) => {
  const [result] = await db.query(
    `
    INSERT INTO caixa_movimentos (
      caixa_id,
      tipo,
      valor,
      motivo
    ) VALUES (?, ?, ?, ?)
    `,
    [caixa_id, tipo, valor, motivo]
  );

  return result;
};

const listMovementsByCash = async (caixa_id) => {
  const [rows] = await db.query(
    `
    SELECT
      id,
      caixa_id,
      tipo,
      valor,
      motivo,
      criado_em
    FROM caixa_movimentos
    WHERE caixa_id = ?
    ORDER BY id DESC
    `,
    [caixa_id]
  );

  return rows;
};

module.exports = {
  findOpen,
  findById,
  open,
  close,
  createMovement,
  listMovementsByCash,
};