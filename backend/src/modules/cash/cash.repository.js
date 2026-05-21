const db = require('../../config/db');

const executor = (connection) => connection || db;

const findOpen = async (connection) => {
  const [rows] = await executor(connection).query(`
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

const findById = async (id, connection) => {
  const [rows] = await executor(connection).query(
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

const open = async ({ usuario_id, valor_inicial, observacao }, connection) => {
  const [result] = await executor(connection).query(
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

  return findById(result.insertId, connection);
};

const close = async ({ id, valor_final, valor_esperado, diferenca, observacao }, connection) => {
  await executor(connection).query(
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

  return findById(id, connection);
};

const createMovement = async ({ caixa_id, tipo, valor, motivo }, connection) => {
  const [result] = await executor(connection).query(
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

const listMovementsByCash = async (caixa_id, connection) => {
  const [rows] = await executor(connection).query(
    `
    SELECT
      id,
      caixa_id,
      tipo,
      valor,
      forma_pagamento,
      status_pagamento,
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
