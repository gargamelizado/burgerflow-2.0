/**
 * @file kitchen.repository.js
 * @description Repository do modulo de cozinha/KDS com todas as queries SQL do fluxo operacional.
 * @author BurgerFlow
 */

import db from '../../config/db.js';

class KitchenRepository {
  /**
   * Abre uma conexao para operacoes transacionais do service.
   * @returns {Promise<Object>}
   */
  getConnection() {
    return db.getConnection();
  }

  /**
   * Lista pedidos ativos da cozinha e expedição.
   * @param {Object} connection - Conexao MySQL ativa.
   * @returns {Promise<Array>}
   */
  async findActiveOrders(connection) {
    const [rows] = await connection.query(`
      SELECT pc.*, v.numero_pedido, v.created_at AS venda_criada_em,
        (SELECT COUNT(*) FROM itens_venda iv_total WHERE iv_total.venda_id = v.id) AS total_itens_pedido,
        (
          SELECT COUNT(DISTINCT koi_exp.order_item_id)
          FROM kitchen_order_items koi_exp
          WHERE koi_exp.order_id = v.id
            AND koi_exp.station = 'expedicao'
        ) AS itens_na_expedicao,
        EXISTS (
          SELECT 1
          FROM order_status_history osh
          WHERE osh.order_id = v.id
            AND osh.new_status IN ('em_preparo','preparing','retornado_para_preparo','returned_to_preparation')
            AND osh.old_status IN ('pronto','ready','entregue','delivered')
        ) AS recuperado
      FROM pedidos_cozinha pc
      JOIN vendas v ON v.id = pc.venda_id
      WHERE pc.status NOT IN ('entregue', 'cancelado', 'movido_expedicao')
      ORDER BY pc.created_at ASC
    `);

    return rows;
  }

  /**
   * Busca itens de vendas para compor os cards por estacao.
   * @param {Object} connection - Conexao MySQL ativa.
   * @param {number[]} saleIds - IDs das vendas.
   * @returns {Promise<Array>}
   */
  async findItemsBySaleIds(connection, saleIds) {
    if (saleIds.length === 0) return [];

    const placeholders = saleIds.map(() => '?').join(', ');
    const [items] = await connection.query(
      `
        SELECT
          iv.venda_id,
          iv.id,
          iv.produto_id,
          iv.produto_nome,
          iv.categoria,
          iv.quantidade,
          koi.station AS routed_station,
          p.nome,
          p.tipo,
          p.preparation_station,
          p.estacao_cozinha
        FROM itens_venda iv
        LEFT JOIN kitchen_order_items koi ON koi.order_id = iv.venda_id AND koi.order_item_id = iv.id
        LEFT JOIN produtos p ON p.id = iv.produto_id
        WHERE iv.venda_id IN (${placeholders})
        ORDER BY iv.id ASC
      `,
      saleIds
    );

    return items;
  }

  /**
   * Busca um pedido de cozinha por ID.
   * @param {Object} connection - Conexao MySQL ativa.
   * @param {number|string} orderId - ID do registro em pedidos_cozinha.
   * @returns {Promise<Object|undefined>}
   */
  async findKitchenOrderById(connection, orderId) {
    const [[order]] = await connection.query(
      'SELECT id, venda_id, estacao, status FROM pedidos_cozinha WHERE id = ?',
      [orderId]
    );

    return order;
  }

  /**
   * Busca itens que atualmente estao na expedição para uma venda.
   * @param {Object} connection - Conexao MySQL ativa.
   * @param {number} saleId - ID da venda.
   * @returns {Promise<Array>}
   */
  async findExpeditionItems(connection, saleId) {
    const [items] = await connection.query(
      `
        SELECT
          koi.id,
          koi.order_id,
          koi.order_item_id,
          koi.station,
          iv.produto_id,
          iv.produto_nome,
          iv.categoria,
          p.nome,
          p.tipo,
          p.preparation_station,
          p.estacao_cozinha
        FROM kitchen_order_items koi
        LEFT JOIN itens_venda iv ON iv.id = koi.order_item_id
        LEFT JOIN produtos p ON p.id = iv.produto_id
        WHERE koi.order_id = ? AND koi.station = 'expedicao'
      `,
      [saleId]
    );

    return items;
  }

  /**
   * Move itens de KDS para uma estacao de preparo.
   * @param {Object} connection - Conexao MySQL ativa.
   * @param {string} station - Estacao destino.
   * @param {number[]} itemIds - IDs dos itens em kitchen_order_items.
   * @returns {Promise<void>}
   */
  async moveKitchenItemsToStation(connection, station, itemIds) {
    await connection.query(
      `
        UPDATE kitchen_order_items
        SET station = ?, status = 'received', finished_at = NULL
        WHERE id IN (${itemIds.map(() => '?').join(', ')})
      `,
      [station, ...itemIds]
    );
  }

  /**
   * Busca uma ordem de cozinha existente para venda/estacao.
   * @param {Object} connection - Conexao MySQL ativa.
   * @param {number} saleId - ID da venda.
   * @param {string} station - Estacao.
   * @param {number|string} ignoredOrderId - Pedido de cozinha ignorado na busca.
   * @returns {Promise<Object|undefined>}
   */
  async findStationOrder(connection, saleId, station, ignoredOrderId) {
    const [[order]] = await connection.query(
      `
        SELECT id
        FROM pedidos_cozinha
        WHERE venda_id = ? AND estacao = ? AND id <> ?
        ORDER BY created_at ASC
        LIMIT 1
      `,
      [saleId, station, ignoredOrderId]
    );

    return order;
  }

  /**
   * Atualiza status e timestamps de um pedido de cozinha.
   * @param {Object} connection - Conexao MySQL ativa.
   * @param {number|string} kitchenOrderId - ID de pedidos_cozinha.
   * @param {string} status - Novo status.
   * @param {string} extraSql - Trecho SQL controlado pelo service.
   * @returns {Promise<void>}
   */
  async updateKitchenOrderStatus(connection, kitchenOrderId, status, extraSql = '') {
    await connection.query(`UPDATE pedidos_cozinha SET status = ? ${extraSql} WHERE id = ?`, [status, kitchenOrderId]);
  }

  /**
   * Cria um registro de pedido de cozinha para venda/estacao.
   * @param {Object} connection - Conexao MySQL ativa.
   * @param {number} saleId - ID da venda.
   * @param {string} station - Estacao destino.
   * @param {string} status - Status inicial.
   * @returns {Promise<number>}
   */
  async createKitchenOrder(connection, saleId, station, status) {
    const [result] = await connection.query(
      'INSERT INTO pedidos_cozinha (venda_id, estacao, status) VALUES (?, ?, ?)',
      [saleId, station, status]
    );

    return result.insertId;
  }

  /**
   * Conta itens que permanecem na expedição para uma venda.
   * @param {Object} connection - Conexao MySQL ativa.
   * @param {number} saleId - ID da venda.
   * @returns {Promise<number>}
   */
  async countExpeditionItems(connection, saleId) {
    const [[row]] = await connection.query(
      "SELECT COUNT(*) AS total FROM kitchen_order_items WHERE order_id = ? AND station = 'expedicao'",
      [saleId]
    );

    return Number(row.total);
  }

  /**
   * Conta os itens comerciais do pedido/venda.
   * @param {Object} connection - Conexao MySQL ativa.
   * @param {number} saleId - ID da venda.
   * @returns {Promise<number>}
   */
  async countSaleItems(connection, saleId) {
    const [[row]] = await connection.query(
      'SELECT COUNT(*) AS total FROM itens_venda WHERE venda_id = ?',
      [saleId]
    );

    return Number(row.total);
  }

  /**
   * Busca ordem ativa de expedição para uma venda.
   * @param {Object} connection - Conexao MySQL ativa.
   * @param {number} saleId - ID da venda.
   * @param {number|string} ignoredOrderId - Pedido atual ignorado.
   * @returns {Promise<Object|undefined>}
   */
  async findActiveExpeditionOrder(connection, saleId, ignoredOrderId) {
    const [[order]] = await connection.query(
      `
        SELECT id
        FROM pedidos_cozinha
        WHERE venda_id = ?
          AND estacao = 'expedicao'
          AND status NOT IN ('entregue', 'cancelado', 'movido_expedicao')
          AND id <> ?
        ORDER BY created_at ASC
        LIMIT 1
      `,
      [saleId, ignoredOrderId]
    );

    return order;
  }

  /**
   * Move todos os itens de uma estacao para a expedição.
   * @param {Object} connection - Conexao MySQL ativa.
   * @param {number} saleId - ID da venda.
   * @param {string} station - Estacao origem.
   * @returns {Promise<void>}
   */
  async moveStationItemsToExpedition(connection, saleId, station) {
    await connection.query(
      `
        UPDATE kitchen_order_items
        SET station = 'expedicao', status = 'received', finished_at = COALESCE(finished_at, CURRENT_TIMESTAMP)
        WHERE order_id = ? AND station = ?
      `,
      [saleId, station]
    );
  }

  /**
   * Atualiza status da venda principal.
   * @param {Object} connection - Conexao MySQL ativa.
   * @param {number} saleId - ID da venda.
   * @param {string} status - Novo status da venda.
   * @param {string} extraSql - Campos temporais adicionais.
   * @returns {Promise<void>}
   */
  async updateSaleStatus(connection, saleId, status, extraSql = '') {
    await connection.query(`UPDATE vendas SET status = ? ${extraSql} WHERE id = ?`, [status, saleId]);
  }
}

export default new KitchenRepository();
