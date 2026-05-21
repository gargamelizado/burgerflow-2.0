const db = require('../../config/db');

const executor = (connection) => connection || db;

const list = async (filters = {}, connection) => {
  const where = [];
  const params = [];

  if (filters.tipo) {
    where.push('i.tipo = ?');
    params.push(filters.tipo);
  }

  if (filters.ativo !== undefined) {
    where.push('i.ativo = ?');
    params.push(Boolean(filters.ativo));
  }

  if (filters.aparece_cardapio !== undefined) {
    where.push('i.aparece_cardapio = ?');
    params.push(Boolean(filters.aparece_cardapio));
  }

  if (filters.excluir_ingredientes) {
    where.push("i.tipo <> 'INGREDIENTE'");
  }

  if (filters.categoria && filters.categoria !== 'todos') {
    where.push('i.categoria = ?');
    params.push(filters.categoria);
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [rows] = await executor(connection).query(
    `
    SELECT
      i.id,
      i.nome,
      i.tipo,
      i.categoria,
      i.preco_venda,
      CASE
        WHEN i.tipo = 'PROMOCAO' THEN p.preco_promocional
        ELSE i.preco_venda
      END AS preco,
      i.ativo,
      i.aparece_cardapio,
      i.created_at,
      i.updated_at,
      e.tipo_entrada,
      e.quantidade_entrada,
      e.pacotes_por_caixa,
      e.quantidade_por_pacote,
      e.unidade_medida,
      e.quantidade_total_base,
      e.unidade_base,
      p.item_original_id,
      original.nome AS item_original_nome,
      p.preco_promocional,
      p.data_inicio,
      p.data_fim,
      p.ativo AS promocao_ativa
    FROM itens i
    LEFT JOIN estoque_ingredientes e ON e.ingrediente_id = i.id
    LEFT JOIN promocoes p ON p.promocao_id = i.id
    LEFT JOIN itens original ON original.id = p.item_original_id
    ${whereClause}
    ORDER BY i.id DESC
    `,
    params
  );

  return rows;
};

const findById = async (id, connection) => {
  const rows = await list({}, connection);
  return rows.find((item) => Number(item.id) === Number(id)) || null;
};

const findBaseById = async (id, connection) => {
  const [rows] = await executor(connection).query(
    `
    SELECT
      id,
      nome,
      tipo,
      categoria,
      preco_venda,
      ativo,
      aparece_cardapio
    FROM itens
    WHERE id = ?
    `,
    [id]
  );

  return rows[0] || null;
};

const createItem = async (item, connection) => {
  const [result] = await executor(connection).query(
    `
    INSERT INTO itens (
      nome,
      tipo,
      categoria,
      preco_venda,
      ativo,
      aparece_cardapio
    ) VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      item.nome,
      item.tipo,
      item.categoria,
      item.preco_venda,
      item.ativo,
      item.aparece_cardapio,
    ]
  );

  return result.insertId;
};

const updateItem = async (id, item, connection) => {
  await executor(connection).query(
    `
    UPDATE itens
    SET
      nome = ?,
      tipo = ?,
      categoria = ?,
      preco_venda = ?,
      ativo = ?,
      aparece_cardapio = ?
    WHERE id = ?
    `,
    [
      item.nome,
      item.tipo,
      item.categoria,
      item.preco_venda,
      item.ativo,
      item.aparece_cardapio,
      id,
    ]
  );
};

const deactivate = async (id, connection) => {
  const [result] = await executor(connection).query(
    `
    UPDATE itens
    SET ativo = FALSE
    WHERE id = ?
    `,
    [id]
  );

  return result;
};

const upsertStock = async (estoque, connection) => {
  await executor(connection).query(
    `
    INSERT INTO estoque_ingredientes (
      ingrediente_id,
      tipo_entrada,
      quantidade_entrada,
      pacotes_por_caixa,
      quantidade_por_pacote,
      unidade_medida,
      quantidade_total_base,
      unidade_base
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      tipo_entrada = VALUES(tipo_entrada),
      quantidade_entrada = VALUES(quantidade_entrada),
      pacotes_por_caixa = VALUES(pacotes_por_caixa),
      quantidade_por_pacote = VALUES(quantidade_por_pacote),
      unidade_medida = VALUES(unidade_medida),
      quantidade_total_base = VALUES(quantidade_total_base),
      unidade_base = VALUES(unidade_base)
    `,
    [
      estoque.ingrediente_id,
      estoque.tipo_entrada,
      estoque.quantidade_entrada,
      estoque.pacotes_por_caixa,
      estoque.quantidade_por_pacote,
      estoque.unidade_medida,
      estoque.quantidade_total_base,
      estoque.unidade_base,
    ]
  );
};

const findStockByIngredientId = async (ingredienteId, connection) => {
  const [rows] = await executor(connection).query(
    `
    SELECT
      e.id,
      e.ingrediente_id,
      i.nome AS ingrediente_nome,
      e.tipo_entrada,
      e.quantidade_entrada,
      e.pacotes_por_caixa,
      e.quantidade_por_pacote,
      e.unidade_medida,
      e.quantidade_total_base,
      e.unidade_base
    FROM estoque_ingredientes e
    INNER JOIN itens i ON i.id = e.ingrediente_id
    WHERE e.ingrediente_id = ?
    `,
    [ingredienteId]
  );

  return rows[0] || null;
};

const updateStockQuantity = async (
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

const createStockMovement = async (movimento, connection) => {
  await executor(connection).query(
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
};

const replaceProductIngredients = async (
  produtoId,
  ingredientes,
  connection
) => {
  await executor(connection).query(
    `
    DELETE FROM produto_ingredientes
    WHERE produto_id = ?
    `,
    [produtoId]
  );

  if (!ingredientes.length) {
    return;
  }

  const values = ingredientes.map((ingrediente) => [
    produtoId,
    ingrediente.ingrediente_id,
    ingrediente.quantidade_usada,
    ingrediente.unidade_usada,
    ingrediente.quantidade_usada_base,
    ingrediente.unidade_base,
  ]);

  await executor(connection).query(
    `
    INSERT INTO produto_ingredientes (
      produto_id,
      ingrediente_id,
      quantidade_usada,
      unidade_usada,
      quantidade_usada_base,
      unidade_base
    ) VALUES ?
    `,
    [values]
  );
};

const listProductIngredients = async (produtoId, connection) => {
  const [rows] = await executor(connection).query(
    `
    SELECT
      pi.id,
      pi.produto_id,
      pi.ingrediente_id,
      ingrediente.nome AS ingrediente_nome,
      pi.quantidade_usada,
      pi.unidade_usada,
      pi.quantidade_usada_base,
      pi.unidade_base
    FROM produto_ingredientes pi
    INNER JOIN itens ingrediente ON ingrediente.id = pi.ingrediente_id
    WHERE pi.produto_id = ?
    ORDER BY ingrediente.nome ASC
    `,
    [produtoId]
  );

  return rows;
};

const replaceComboItems = async (comboId, produtos, connection) => {
  await executor(connection).query(
    `
    DELETE FROM combo_itens
    WHERE combo_id = ?
    `,
    [comboId]
  );

  if (!produtos.length) {
    return;
  }

  const values = produtos.map((produto) => [
    comboId,
    produto.produto_id,
    produto.quantidade,
  ]);

  await executor(connection).query(
    `
    INSERT INTO combo_itens (
      combo_id,
      produto_id,
      quantidade
    ) VALUES ?
    `,
    [values]
  );
};

const listComboItems = async (comboId, connection) => {
  const [rows] = await executor(connection).query(
    `
    SELECT
      ci.id,
      ci.combo_id,
      ci.produto_id,
      produto.nome AS produto_nome,
      ci.quantidade
    FROM combo_itens ci
    INNER JOIN itens produto ON produto.id = ci.produto_id
    WHERE ci.combo_id = ?
    ORDER BY produto.nome ASC
    `,
    [comboId]
  );

  return rows;
};

const upsertPromotion = async (promocao, connection) => {
  await executor(connection).query(
    `
    INSERT INTO promocoes (
      promocao_id,
      item_original_id,
      preco_promocional,
      data_inicio,
      data_fim,
      ativo
    ) VALUES (?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      item_original_id = VALUES(item_original_id),
      preco_promocional = VALUES(preco_promocional),
      data_inicio = VALUES(data_inicio),
      data_fim = VALUES(data_fim),
      ativo = VALUES(ativo)
    `,
    [
      promocao.promocao_id,
      promocao.item_original_id,
      promocao.preco_promocional,
      promocao.data_inicio || null,
      promocao.data_fim || null,
      promocao.ativo,
    ]
  );
};

const findPromotionByItemId = async (promocaoId, connection) => {
  const [rows] = await executor(connection).query(
    `
    SELECT
      p.id,
      p.promocao_id,
      p.item_original_id,
      p.preco_promocional,
      p.data_inicio,
      p.data_fim,
      p.ativo,
      original.nome AS item_original_nome,
      original.tipo AS item_original_tipo,
      original.preco_venda AS item_original_preco
    FROM promocoes p
    INNER JOIN itens original ON original.id = p.item_original_id
    WHERE p.promocao_id = ?
    `,
    [promocaoId]
  );

  return rows[0] || null;
};

const deleteComposition = async (id, connection) => {
  await executor(connection).query('DELETE FROM produto_ingredientes WHERE produto_id = ?', [
    id,
  ]);
  await executor(connection).query('DELETE FROM combo_itens WHERE combo_id = ?', [
    id,
  ]);
  await executor(connection).query('DELETE FROM promocoes WHERE promocao_id = ?', [
    id,
  ]);
};

module.exports = {
  list,
  findById,
  findBaseById,
  createItem,
  updateItem,
  deactivate,
  upsertStock,
  findStockByIngredientId,
  updateStockQuantity,
  createStockMovement,
  replaceProductIngredients,
  listProductIngredients,
  replaceComboItems,
  listComboItems,
  upsertPromotion,
  findPromotionByItemId,
  deleteComposition,
};
