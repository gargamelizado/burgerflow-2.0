const db = require('../../config/db');

const getProductsSold = async ({ data_inicio, data_fim }) => {
  const [rows] = await db.query(
    `
    SELECT
      pi.item_id,
      pi.item_nome AS nome,
      pi.item_tipo AS tipo,
      SUM(pi.quantidade) AS quantidade_vendida,
      SUM(pi.subtotal) AS total_vendido
    FROM pedido_itens pi
    JOIN pedidos p ON p.id = pi.pedido_id
    WHERE DATE(p.criado_em) BETWEEN ? AND ?
      AND p.status <> 'cancelado'
    GROUP BY pi.item_id, pi.item_nome, pi.item_tipo
    ORDER BY total_vendido DESC, quantidade_vendida DESC
    `,
    [data_inicio, data_fim]
  );

  return rows;
};

module.exports = {
  getProductsSold,
};
