/**
 * @file recoverOrder.repository.js
 * @description Repository do Recuperador de Pedido com acesso ao banco.
 * @author BurgerFlow
 */

import db from '../../config/db.js';

class RecoverOrderRepository {
  /**
   * Abre uma conexao para operacoes do service.
   * @returns {Promise<Object>}
   */
  getConnection() {
    return db.getConnection();
  }

  /**
   * Lista pedidos liberados pela expedição que podem voltar para preparo.
   * @param {Object} connection - Conexao MySQL ativa.
   * @param {number} limit - Quantidade maxima de pedidos retornados.
   * @returns {Promise<Array>}
   */
  async findReleasedOrders(connection, limit = 30) {
    const [rows] = await connection.query(
      `
        SELECT
          v.id,
          v.numero_pedido,
          v.canal,
          v.status AS venda_status,
          v.total,
          v.created_at,
          v.delivered_at,
          MAX(pc.status) AS cozinha_status,
          MAX(CASE WHEN pc.estacao = 'expedicao' AND pc.status = 'entregue' THEN 1 ELSE 0 END) AS liberado_expedicao,
          EXISTS (
            SELECT 1
            FROM order_status_history osh
            WHERE osh.order_id = v.id
              AND osh.new_status IN ('em_preparo','preparing','retornado_para_preparo','returned_to_preparation')
              AND osh.old_status IN ('entregue','delivered','liberado','released')
          ) AS recuperado
        FROM vendas v
        LEFT JOIN pedidos_cozinha pc ON pc.venda_id = v.id
        WHERE v.status IN ('delivered','entregue','released','liberado')
           OR v.delivered_at IS NOT NULL
           OR EXISTS (
             SELECT 1
             FROM pedidos_cozinha pc_expedicao
             WHERE pc_expedicao.venda_id = v.id
               AND pc_expedicao.estacao = 'expedicao'
               AND pc_expedicao.status = 'entregue'
           )
        GROUP BY v.id
        ORDER BY COALESCE(v.delivered_at, v.created_at) DESC
        LIMIT ?
      `,
      [Number(limit)]
    );

    return rows;
  }

  /**
   * Busca um pedido por ID ou numero de pedido para recuperacao.
   * @param {Object} connection - Conexao MySQL ativa.
   * @param {string|number} number - ID ou numero do pedido.
   * @returns {Promise<Object|undefined>}
   */
  async findRecoverableOrderByNumber(connection, number) {
    const [rows] = await connection.query(
      `
        SELECT
          v.id,
          v.numero_pedido,
          v.canal,
          v.status AS venda_status,
          v.total,
          v.created_at,
          v.delivered_at,
          MAX(pc.status) AS cozinha_status,
          MAX(CASE WHEN pc.estacao = 'expedicao' AND pc.status = 'entregue' THEN 1 ELSE 0 END) AS liberado_expedicao,
          EXISTS (
            SELECT 1
            FROM order_status_history osh
            WHERE osh.order_id = v.id
              AND osh.new_status IN ('em_preparo','preparing','retornado_para_preparo','returned_to_preparation')
              AND osh.old_status IN ('pronto','ready','entregue','delivered')
          ) AS recuperado
        FROM vendas v
        LEFT JOIN pedidos_cozinha pc ON pc.venda_id = v.id
        WHERE v.id = ? OR v.numero_pedido = ?
        GROUP BY v.id
        LIMIT 1
      `,
      [number, number]
    );

    return rows[0];
  }

  /**
   * Busca um pedido por ID para validar e recuperar.
   * @param {Object} connection - Conexao MySQL ativa.
   * @param {number|string} id - ID da venda.
   * @returns {Promise<Object|undefined>}
   */
  async findOrderById(connection, id) {
    const [[order]] = await connection.query(
      `
        SELECT
          v.id,
          v.status AS venda_status,
          v.delivered_at,
          MAX(pc.status) AS cozinha_status,
          MAX(CASE WHEN pc.estacao = 'expedicao' AND pc.status = 'entregue' THEN 1 ELSE 0 END) AS liberado_expedicao
        FROM vendas v
        LEFT JOIN pedidos_cozinha pc ON pc.venda_id = v.id
        WHERE v.id = ?
        GROUP BY v.id
      `,
      [id]
    );

    return order;
  }

  /**
   * Lista itens comerciais de uma venda.
   * @param {Object} connection - Conexao MySQL ativa.
   * @param {number} saleId - ID da venda.
   * @returns {Promise<Array>}
   */
  async findSaleItems(connection, saleId) {
    const [items] = await connection.query(
      `
        SELECT id, produto_id, produto_nome AS nome, categoria, quantidade, preco_unitario, subtotal
        FROM itens_venda
        WHERE venda_id = ?
        ORDER BY id ASC
      `,
      [saleId]
    );

    return items;
  }

  /**
   * Lista itens com dados de produto para re-roteamento na cozinha.
   * @param {Object} connection - Conexao MySQL ativa.
   * @param {number} saleId - ID da venda.
   * @returns {Promise<Array>}
   */
  async findSaleItemsForRouting(connection, saleId) {
    const [items] = await connection.query(
      `
        SELECT
          iv.id,
          iv.venda_id,
          iv.produto_id,
          iv.produto_nome,
          iv.categoria,
          p.nome,
          p.tipo,
          p.preparation_station,
          p.estacao_cozinha
        FROM itens_venda iv
        LEFT JOIN produtos p ON p.id = iv.produto_id
        WHERE iv.venda_id = ?
      `,
      [saleId]
    );

    return items;
  }

  /**
   * Marca a venda principal como em preparo novamente.
   * @param {Object} connection - Conexao MySQL ativa.
   * @param {number} saleId - ID da venda.
   * @returns {Promise<void>}
   */
  async markSalePreparing(connection, saleId) {
    await connection.query(
      `
        UPDATE vendas
        SET status = 'preparing',
            delivered_at = NULL
        WHERE id = ?
      `,
      [saleId]
    );
  }

  /**
   * Arquiva pedidos de cozinha existentes antes de recriar a fila recuperada.
   * @param {Object} connection - Conexao MySQL ativa.
   * @param {number} saleId - ID da venda.
   * @returns {Promise<void>}
   */
  async archiveKitchenOrders(connection, saleId) {
    await connection.query(
      `
        UPDATE pedidos_cozinha
        SET status = 'movido_expedicao',
            saiu_para_entrega_em = NULL,
            entregue_em = NULL
        WHERE venda_id = ?
      `,
      [saleId]
    );
  }

  /**
   * Reposiciona itens no KDS para a estacao de preparo.
   * @param {Object} connection - Conexao MySQL ativa.
   * @param {number} saleId - ID da venda.
   * @param {string} station - Estacao destino.
   * @param {number[]} saleItemIds - IDs dos itens de venda.
   * @returns {Promise<void>}
   */
  async moveItemsToStation(connection, saleId, station, saleItemIds) {
    await connection.query(
      `
        UPDATE kitchen_order_items
        SET station = ?, status = 'received', started_at = NULL, finished_at = NULL
        WHERE order_id = ?
          AND order_item_id IN (${saleItemIds.map(() => '?').join(', ')})
      `,
      [station, saleId, ...saleItemIds]
    );
  }

  /**
   * Cria uma nova fila de cozinha para a estacao recuperada.
   * @param {Object} connection - Conexao MySQL ativa.
   * @param {number} saleId - ID da venda.
   * @param {string} station - Estacao destino.
   * @returns {Promise<void>}
   */
  async createKitchenOrder(connection, saleId, station) {
    await connection.query(
      'INSERT INTO pedidos_cozinha (venda_id, estacao, status) VALUES (?, ?, ?)',
      [saleId, station, 'em_preparo']
    );
  }
}

export default new RecoverOrderRepository();
