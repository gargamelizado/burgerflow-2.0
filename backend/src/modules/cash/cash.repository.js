const db = require('../../config/db');

const executor = (connection) => connection || db;

const findOpen = async (connection) => {
  const [rows] = await executor(connection).query(`
    SELECT
      c.id,
      c.usuario_id,
      ua.nome AS usuario_nome,
      c.valor_inicial,
      c.valor_final,
      c.valor_esperado,
      c.diferenca,
      c.status,
      c.observacao,
      c.aberto_em,
      c.fechado_em,
      c.usuario_fechamento_id,
      uf.nome AS usuario_fechamento_nome,
      c.gerente_autorizador_id,
      ug.nome AS gerente_autorizador_nome
    FROM caixas c
    LEFT JOIN usuarios ua ON ua.id = c.usuario_id
    LEFT JOIN usuarios uf ON uf.id = c.usuario_fechamento_id
    LEFT JOIN usuarios ug ON ug.id = c.gerente_autorizador_id
    WHERE c.status = 'aberto'
    ORDER BY c.id DESC
    LIMIT 1
  `);

  return rows[0];
};

const listOpen = async (connection) => {
  const [rows] = await executor(connection).query(`
    SELECT
      c.id,
      c.numero,
      c.usuario_id,
      c.operador_id,
      COALESCE(uo.nome, ua.nome) AS operador_nome,
      c.valor_inicial,
      c.valor_total_vendas,
      c.valor_final,
      c.valor_esperado,
      c.diferenca,
      c.status,
      c.observacao,
      c.aberto_em,
      c.data_abertura,
      c.fechado_em,
      c.data_fechamento,
      c.usuario_fechamento_id,
      uf.nome AS usuario_fechamento_nome,
      c.gerente_autorizador_id,
      ug.nome AS gerente_autorizador_nome
    FROM caixas c
    LEFT JOIN usuarios ua ON ua.id = c.usuario_id
    LEFT JOIN usuarios uo ON uo.id = c.operador_id
    LEFT JOIN usuarios uf ON uf.id = c.usuario_fechamento_id
    LEFT JOIN usuarios ug ON ug.id = c.gerente_autorizador_id
    WHERE c.status = 'aberto'
    ORDER BY c.numero ASC, c.id ASC
  `);

  return rows;
};

const findById = async (id, connection) => {
  const [rows] = await executor(connection).query(
    `
    SELECT
      c.id,
      c.numero,
      c.usuario_id,
      c.operador_id,
      ua.nome AS usuario_nome,
      COALESCE(uo.nome, ua.nome) AS operador_nome,
      c.valor_inicial,
      c.valor_total_vendas,
      c.valor_final,
      c.valor_esperado,
      c.diferenca,
      c.status,
      c.observacao,
      c.aberto_em,
      c.data_abertura,
      c.fechado_em,
      c.data_fechamento,
      c.usuario_fechamento_id,
      uf.nome AS usuario_fechamento_nome,
      c.gerente_autorizador_id,
      ug.nome AS gerente_autorizador_nome
    FROM caixas c
    LEFT JOIN usuarios ua ON ua.id = c.usuario_id
    LEFT JOIN usuarios uo ON uo.id = c.operador_id
    LEFT JOIN usuarios uf ON uf.id = c.usuario_fechamento_id
    LEFT JOIN usuarios ug ON ug.id = c.gerente_autorizador_id
    WHERE c.id = ?
    `,
    [id]
  );

  return rows[0];
};

const getNextNumber = async (connection) => {
  const [rows] = await executor(connection).query(`
    SELECT COALESCE(MAX(numero), 0) + 1 AS next_number
    FROM caixas
  `);

  return Number(rows[0]?.next_number || 1);
};

const findOpenByNumber = async (numero, connection) => {
  const [rows] = await executor(connection).query(
    `
    SELECT
      id,
      numero,
      usuario_id,
      operador_id,
      status
    FROM caixas
    WHERE numero = ?
      AND status = 'aberto'
    ORDER BY id DESC
    LIMIT 1
    `,
    [numero]
  );

  return rows[0] || null;
};

const open = async (
  { numero = null, usuario_id, operador_id = null, valor_inicial, observacao },
  connection
) => {
  const [result] = await executor(connection).query(
    `
    INSERT INTO caixas (
      numero,
      usuario_id,
      operador_id,
      valor_inicial,
      valor_total_vendas,
      valor_esperado,
      status,
      observacao,
      data_abertura
    ) VALUES (?, ?, ?, ?, ?, ?, 'aberto', ?, CURRENT_TIMESTAMP)
    `,
    [
      numero,
      usuario_id,
      operador_id || usuario_id,
      valor_inicial,
      0,
      valor_inicial,
      observacao,
    ]
  );

  return findById(result.insertId, connection);
};

const close = async (
  {
    id,
    valor_final,
    valor_esperado,
    diferenca,
    observacao,
    usuario_fechamento_id,
    gerente_autorizador_id = null,
  },
  connection
) => {
  const [result] = await executor(connection).query(
    `
    UPDATE caixas
    SET
      valor_final = ?,
      valor_esperado = ?,
      diferenca = ?,
      status = 'fechado',
      observacao = ?,
      fechado_em = CURRENT_TIMESTAMP,
      usuario_fechamento_id = ?,
      gerente_autorizador_id = ?
    WHERE id = ?
      AND status = 'aberto'
    `,
    [
      valor_final,
      valor_esperado,
      diferenca,
      observacao,
      usuario_fechamento_id,
      gerente_autorizador_id,
      id,
    ]
  );

  if (!result.affectedRows) {
    return null;
  }

  return findById(id, connection);
};

const closeById = async (
  {
    id,
    valor_final,
    valor_esperado,
    diferenca,
    observacao,
    usuario_fechamento_id,
    gerente_autorizador_id = null,
  },
  connection
) => {
  const [result] = await executor(connection).query(
    `
    UPDATE caixas
    SET
      valor_final = ?,
      valor_esperado = ?,
      diferenca = ?,
      status = 'fechado',
      observacao = ?,
      fechado_em = CURRENT_TIMESTAMP,
      data_fechamento = CURRENT_TIMESTAMP,
      usuario_fechamento_id = ?,
      gerente_autorizador_id = ?,
      atualizado_em = CURRENT_TIMESTAMP
    WHERE id = ?
      AND status = 'aberto'
    `,
    [
      valor_final,
      valor_esperado,
      diferenca,
      observacao,
      usuario_fechamento_id,
      gerente_autorizador_id,
      id,
    ]
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
    usuario_id = null,
    tipo,
    valor,
    forma_pagamento = null,
    status_pagamento = null,
    motivo,
    gerente_autorizador_id = null,
  },
  connection
) => {
  const [result] = await executor(connection).query(
    `
    INSERT INTO caixa_movimentos (
      caixa_id,
      pedido_id,
      usuario_id,
      gerente_autorizador_id,
      tipo,
      valor,
      forma_pagamento,
      status_pagamento,
      motivo
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      caixa_id,
      pedido_id,
      usuario_id,
      gerente_autorizador_id,
      tipo,
      valor,
      forma_pagamento,
      status_pagamento,
      motivo,
    ]
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
      cm.usuario_id,
      cm.gerente_autorizador_id,
      cm.tipo,
      cm.valor,
      cm.forma_pagamento,
      cm.status_pagamento,
      cm.motivo,
      cm.criado_em,
      uu.nome AS usuario_nome,
      ug.nome AS gerente_autorizador_nome
    FROM caixa_movimentos cm
    LEFT JOIN usuarios uu ON uu.id = cm.usuario_id
    LEFT JOIN usuarios ug ON ug.id = cm.gerente_autorizador_id
    WHERE cm.caixa_id = ?
    ORDER BY cm.id DESC
    `,
    [caixa_id]
  );

  return rows;
};

const listSalesByCash = async (caixaId, connection) => {
  const [rows] = await executor(connection).query(
    `
    SELECT
      p.id,
      p.numero,
      p.caixa_id,
      p.cliente_nome,
      p.tipo,
      p.status,
      p.total AS valor_total,
      p.forma_pagamento,
      p.status_pagamento,
      p.criado_em
    FROM pedidos p
    WHERE p.caixa_id = ?
    ORDER BY p.id DESC
    `,
    [caixaId]
  );

  return rows;
};

const summarizeByCash = async (caixa_id, connection) => {
  const [rows] = await executor(connection).query(
    `
    SELECT
      COALESCE(SUM(CASE WHEN tipo = 'venda' THEN valor ELSE 0 END), 0) AS total_vendas,
      COALESCE(SUM(CASE WHEN tipo = 'venda' AND forma_pagamento = 'dinheiro' THEN valor ELSE 0 END), 0) AS vendas_dinheiro,
      COALESCE(SUM(CASE WHEN tipo = 'venda' AND forma_pagamento = 'pix' THEN valor ELSE 0 END), 0) AS vendas_pix,
      COALESCE(SUM(CASE WHEN tipo = 'venda' AND forma_pagamento = 'cartao_credito' THEN valor ELSE 0 END), 0) AS vendas_cartao_credito,
      COALESCE(SUM(CASE WHEN tipo = 'venda' AND forma_pagamento = 'cartao_debito' THEN valor ELSE 0 END), 0) AS vendas_cartao_debito,
      COALESCE(SUM(CASE WHEN tipo = 'venda' AND forma_pagamento = 'voucher' THEN valor ELSE 0 END), 0) AS vendas_voucher,
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
  listOpen,
  findById,
  getNextNumber,
  findOpenByNumber,
  open,
  close,
  closeById,
  createMovement,
  listMovementsByCash,
  listSalesByCash,
  summarizeByCash,
};
