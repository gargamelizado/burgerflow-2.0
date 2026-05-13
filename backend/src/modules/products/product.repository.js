const db = require('../../config/db');

const list = async () => {
  const [rows] = await db.query(`
    SELECT
      id,
      nome,
      categoria,
      tipo,
      preco,
      custo,
      quantidade_estoque,
      unidade,
      ativo
    FROM produtos
    ORDER BY id DESC
  `);

  return rows;
};

const create = async (produto) => {
  const [result] = await db.query(
    `
    INSERT INTO produtos (
      nome,
      categoria,
      tipo,
      preco,
      custo,
      quantidade_estoque,
      unidade,
      ativo
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      produto.nome,
      produto.categoria,
      produto.tipo,
      produto.preco,
      produto.custo,
      produto.quantidade_estoque,
      produto.unidade,
      produto.ativo,
    ]
  );

  const [rows] = await db.query(
    `
    SELECT
      id,
      nome,
      categoria,
      tipo,
      preco,
      custo,
      quantidade_estoque,
      unidade,
      ativo
    FROM produtos
    WHERE id = ?
    `,
    [result.insertId]
  );

  return rows[0];
};

const update = async (id, produto) => {
  await db.query(
    `
    UPDATE produtos
    SET
      nome = ?,
      categoria = ?,
      tipo = ?,
      preco = ?,
      custo = ?,
      quantidade_estoque = ?,
      unidade = ?,
      ativo = ?
    WHERE id = ?
    `,
    [
      produto.nome,
      produto.categoria,
      produto.tipo,
      produto.preco,
      produto.custo,
      produto.quantidade_estoque,
      produto.unidade,
      produto.ativo,
      id,
    ]
  );

  const [rows] = await db.query(
    `
    SELECT
      id,
      nome,
      categoria,
      tipo,
      preco,
      custo,
      quantidade_estoque,
      unidade,
      ativo
    FROM produtos
    WHERE id = ?
    `,
    [id]
  );

  return rows[0];
};

const remove = async (id) => {
  const [result] = await db.query(
    `
    DELETE FROM produtos
    WHERE id = ?
    `,
    [id]
  );

  return result;
};

module.exports = {
  list,
  create,
  update,
  remove,
};