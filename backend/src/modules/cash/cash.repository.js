const db = require('../../config/db');

const executor = (connection) => connection || db;

const findOpen = async (connection) => {
  const [rows] = await executor(connection).query(`
    SELECT
      c.id,
      c.usuario_id,
      u.nome AS usuario_nome,
      c.valor_inicial,
      c.valor_final,
      c.valor_esperado,
      c.diferenca,
      c.status,
      c.observacao,
      c.aberto_em,
      c.fechado_em
    FROM caixas c
    LEFT JOIN usuarios u ON u.id = c.usuario_id
    WHERE c.status = 'aberto'
    ORDER BY c.id DESC
    LIMIT 1
  `);

  return rows[0];
};

const findById = async (id, connection) => {
  const [rows] = await executor(connection).query(
    `
    SELECT
      c.id,
      c.usuario_id,
      u.nome AS usuario_nome,
      c.valor_inicial,
      c.valor_final,
      c.valor_esperado,
      c.diferenca,
      c.status,
      c.observacao,
      c.aberto_em,
      c.fechado_em
    FROM caixas c
    LEFT JOIN usuarios u ON u.id = c.usuario_id
    WHERE c.id = ?
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
      valor_esperado,
      status,
      observacao
    ) VALUES (?, ?, ?, 'aberto', ?)
    `,
    [usuario_id, valor_inicial, valor_inicial, observacao]
  );

  return findById(result.insertId, connection);
};

const close = async ({ id, valor_final, valor_esperado, diferenca, observacao }, connection) => {
  const [result] = await executor(connection).query(
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
      AND status = 'aberto'
    `,
    [valor_final, valor_esperado, diferenca, observacao, id]
  );

  if (!result.affectedRows) {
    return null;
  }

  return findById(id, connection);
};

const createMovement = async (
  {
    caixa_id,
    pedido_id = null,
    tipo,
    valor,
    forma_pagamento = null,
    status_pagamento = null,
    motivo,
  },
  connection
) => {
  const [result] = await executor(connection).query(
    `
    INSERT INTO caixa_movimentos (
      caixa_id,
      pedido_id,
      tipo,
      valor,
      forma_pagamento,
      status_pagamento,
      motivo
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [caixa_id, pedido_id, tipo, valor, forma_pagamento, status_pagamento, motivo]
  );

  return result;
};

const listMovementsByCash = async (caixa_id, connection) => {
  const [rows] = await executor(connection).query(
    `
    SELECT
      cm.id,
      cm.caixa_id,
      cm.pedido_id,
      cm.tipo,
      cm.valor,
      cm.forma_pagamento,
      cm.status_pagamento,
      cm.motivo,
      cm.criado_em,
      c.usuario_id,
      u.nome AS usuario_nome
    FROM caixa_movimentos cm
    JOIN caixas c ON c.id = cm.caixa_id
    LEFT JOIN usuarios u ON u.id = c.usuario_id
    WHERE cm.caixa_id = ?
    ORDER BY cm.id DESC
    `,
    [caixa_id]
  );

  return rows;
};

const summarizeByCash = async (caixa_id, connection) => {
  const [rows] = await executor(connection).query(
    `
    SELECT
      COALESCE(SUM(CASE WHEN tipo = 'venda' THEN valor ELSE 0 END), 0) AS total_vendas,
      COALESCE(SUM(CASE WHEN tipo = 'suprimento' THEN valor ELSE 0 END), 0) AS total_suprimentos,
      COALESCE(SUM(CASE WHEN tipo = 'sangria' THEN valor ELSE 0 END), 0) AS total_sangrias,
      COALESCE(SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END), 0) AS total_despesas
    FROM caixa_movimentos
    WHERE caixa_id = ?
    `,
    [caixa_id]
  );

  return rows[0] || {
    total_vendas: 0,
    total_suprimentos: 0,
    total_sangrias: 0,
    total_despesas: 0,
  };
};

module.exports = {
  findOpen,
  findById,
  open,
  close,
  createMovement,
  listMovementsByCash,
  summarizeByCash,
};
