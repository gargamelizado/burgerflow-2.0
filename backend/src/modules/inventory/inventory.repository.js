const db = require('../../config/db');

const findProductById = async (id) => {
  const [rows] = await db.query(
    `
    SELECT
      id,
      nome,
      quantidade_estoque
    FROM produtos
    WHERE id = ?
    `,
    [id]
  );

  return rows[0];
};

const updateProductStock = async (id, quantidadeNova) => {
  await db.query(
    `
    UPDATE produtos
    SET quantidade_estoque = ?
    WHERE id = ?
    `,
    [quantidadeNova, id]
  );
};

const createMovement = async (movimento) => {
  const [result] = await db.query(
    `
    INSERT INTO movimentacoes_estoque (
      produto_id,
      tipo,
      quantidade,
      quantidade_anterior,
      quantidade_nova,
      motivo
    ) VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      movimento.produto_id,
      movimento.tipo,
      movimento.quantidade,
      movimento.quantidade_anterior,
      movimento.quantidade_nova,
      movimento.motivo,
    ]
  );

  return result;
};

const listMovements = async () => {
  const [rows] = await db.query(`
    SELECT
      me.id,
      me.produto_id,
      p.nome AS produto_nome,
      me.tipo,
      me.quantidade,
      me.quantidade_anterior,
      me.quantidade_nova,
      me.motivo,
      me.criado_em
    FROM movimentacoes_estoque me
    INNER JOIN produtos p ON p.id = me.produto_id
    ORDER BY me.id DESC
  `);

  return rows;
};

module.exports = {
  findProductById,
  updateProductStock,
  createMovement,
  listMovements,
};