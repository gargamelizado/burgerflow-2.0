const db = require('../../config/db');

const executor = (connection) => connection || db;

const listIngredientsStock = async (connection) => {
  const [rows] = await executor(connection).query(`
    SELECT
      i.id,
      i.nome,
      i.categoria,
      i.ativo,
      e.tipo_entrada,
      e.quantidade_entrada,
      e.pacotes_por_caixa,
      e.quantidade_por_pacote,
      e.unidade_medida,
      e.quantidade_total_base,
      e.unidade_base
    FROM itens i
    LEFT JOIN estoque_ingredientes e ON e.ingrediente_id = i.id
    WHERE i.tipo = 'INGREDIENTE'
    ORDER BY i.nome ASC
  `);

  return rows;
};

const findIngredientStock = async (ingredienteId, connection) => {
  const [rows] = await executor(connection).query(
    `
    SELECT
      i.id,
      i.nome,
      i.tipo,
      e.quantidade_total_base,
      e.unidade_base
    FROM itens i
    INNER JOIN estoque_ingredientes e ON e.ingrediente_id = i.id
    WHERE i.id = ?
    `,
    [ingredienteId]
  );

  return rows[0] || null;
};

const updateIngredientStock = async (
  ingredienteId,
  quantidadeTotalBase,
  connection
) => {
  await executor(connection).query(
    `
    UPDATE estoque_ingredientes
    SET quantidade_total_base = ?
    WHERE ingrediente_id = ?
    `,
    [quantidadeTotalBase, ingredienteId]
  );
};

const createMovement = async (movimento, connection) => {
  const [result] = await executor(connection).query(
    `
    INSERT INTO movimentacoes_estoque (
      ingrediente_id,
      pedido_id,
      tipo,
      quantidade,
      unidade_base,
      quantidade_anterior,
      quantidade_nova,
      motivo
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      movimento.ingrediente_id,
      movimento.pedido_id || null,
      movimento.tipo,
      movimento.quantidade,
      movimento.unidade_base,
      movimento.quantidade_anterior,
      movimento.quantidade_nova,
      movimento.motivo || null,
    ]
  );

  return result;
};

const listMovements = async () => {
  const [rows] = await db.query(`
    SELECT
      me.id,
      me.ingrediente_id,
      i.nome AS ingrediente_nome,
      me.tipo,
      me.quantidade,
      me.unidade_base,
      me.quantidade_anterior,
      me.quantidade_nova,
      me.motivo,
      me.pedido_id,
      me.criado_em
    FROM movimentacoes_estoque me
    INNER JOIN itens i ON i.id = me.ingrediente_id
    ORDER BY me.id DESC
  `);

  return rows;
};

module.exports = {
  listIngredientsStock,
  findIngredientStock,
  updateIngredientStock,
  createMovement,
  listMovements,
};
