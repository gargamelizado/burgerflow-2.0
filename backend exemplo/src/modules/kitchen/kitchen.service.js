/**
 * @file kitchen.service.js
 * @description Service com regras de negocio do KDS, retorno de pedido e expedição.
 * @author BurgerFlow
 */

import kitchenRepository from './kitchen.repository.js';
import { audit, registerOrderStatusHistory } from '../../repositories/audit.repository.js';
import { broadcastKitchenEvent } from '../../realtime/kitchenHub.js';
import { normalizeKitchenStation, resolveKitchenStation, resolveReturnStations } from '../../utils/kitchenRouting.js';

const STATUS_DATA_SQL = {
  recebido: ', iniciado_em = NULL, pronto_em = NULL, saiu_para_entrega_em = NULL, entregue_em = NULL',
  em_preparo: ', iniciado_em = COALESCE(iniciado_em, CURRENT_TIMESTAMP)',
  pronto: ', pronto_em = COALESCE(pronto_em, CURRENT_TIMESTAMP)',
  saiu_para_entrega: ', saiu_para_entrega_em = COALESCE(saiu_para_entrega_em, CURRENT_TIMESTAMP)',
  entregue: ', entregue_em = COALESCE(entregue_em, CURRENT_TIMESTAMP)'
};

class KitchenService {
  /**
   * Lista pedidos ativos agrupando os itens por venda e estacao exibida.
   * @returns {Promise<Array>}
   */
  async listOrders() {
    const connection = await kitchenRepository.getConnection();
    try {
      const rows = await kitchenRepository.findActiveOrders(connection);

      if (rows.length === 0) {
        return [];
      }

      const saleIds = [...new Set(rows.map((row) => Number(row.venda_id)))];
      const items = await kitchenRepository.findItemsBySaleIds(connection, saleIds);
      const itemsBySaleAndStation = new Map();

      for (const item of items) {
        const estacaoOriginal = resolveKitchenStation(item);
        const estacao = normalizeKitchenStation(item.routed_station) || estacaoOriginal;
        const key = `${Number(item.venda_id)}:${estacao}`;
        const current = itemsBySaleAndStation.get(key) || [];
        current.push({
          id: Number(item.id),
          produto_id: item.produto_id === null ? null : Number(item.produto_id),
          nome: item.produto_nome || `Produto #${item.produto_id}`,
          quantidade: Number(item.quantidade),
          estacao,
          estacao_original: estacaoOriginal
        });
        itemsBySaleAndStation.set(key, current);
      }

      return rows.map((row) => ({
        ...row,
        itens: itemsBySaleAndStation.get(`${Number(row.venda_id)}:${row.estacao || 'expedicao'}`) || []
      }));
    } finally {
      connection.release();
    }
  }

  /**
   * Atualiza status de um pedido da cozinha respeitando regras de retorno e expedição.
   * @param {Object} params - Dados da alteração.
   * @param {number|string} params.kitchenOrderId - ID de pedidos_cozinha.
   * @param {string} params.status - Status ou ação solicitada.
   * @param {string} params.reason - Motivo para devolução/recuperação.
   * @param {string} params.returnSection - Secao destino quando voltar da expedição.
   * @param {number} params.userId - Usuario responsavel.
   * @returns {Promise<Object>}
   */
  async updateStatus({ kitchenOrderId, status, reason, returnSection, userId }) {
    const connection = await kitchenRepository.getConnection();
    try {
      const order = await kitchenRepository.findKitchenOrderById(connection, kitchenOrderId);

      if (!order) {
        const error = new Error('Pedido de cozinha não encontrado.');
        error.statusCode = 404;
        throw error;
      }

      if (status === 'retornar_preparo') {
        return this.returnFromExpedition({ connection, order, kitchenOrderId, returnSection, reason, userId });
      }

      if (status === 'voltar_etapa') {
        return this.returnOneStep({ connection, order, kitchenOrderId, reason, userId });
      }

      if ((status === 'pronto' || status === 'expedicao') && order.estacao !== 'expedicao') {
        return this.sendToExpedition({ connection, order, kitchenOrderId, userId });
      }

      if (status === 'entregue' && order.estacao === 'expedicao' && order.status !== 'pronto') {
        const error = new Error('Pedido ainda não está pronto. A cozinha precisa marcar o pedido como pronto antes da entrega.');
        error.statusCode = 400;
        throw error;
      }

      if (status === 'entregue' && order.estacao === 'expedicao') {
        const totalItems = await kitchenRepository.countSaleItems(connection, order.venda_id);
        const expeditionItems = await kitchenRepository.countExpeditionItems(connection, order.venda_id);

        if (totalItems === 0 || expeditionItems < totalItems) {
          const error = new Error('Confira todos os itens do pedido antes de entregar.');
          error.statusCode = 400;
          throw error;
        }
      }

      const extraSql = STATUS_DATA_SQL[status] || '';
      await kitchenRepository.updateKitchenOrderStatus(connection, kitchenOrderId, status, extraSql);

      if (status === 'entregue') {
        await kitchenRepository.updateSaleStatus(connection, order.venda_id, 'delivered', ', delivered_at = CURRENT_TIMESTAMP');
      }

      await registerOrderStatusHistory(connection, {
        orderId: order.venda_id,
        fromStatus: order.status,
        toStatus: status,
        userId,
        reason: reason || null
      });
      await audit(connection, userId, 'cozinha.status_alterado', 'pedidos_cozinha', Number(kitchenOrderId), { status });
      broadcastKitchenEvent('kitchen_order_updated', { id: Number(kitchenOrderId), status });

      return { id: Number(kitchenOrderId), status };
    } finally {
      connection.release();
    }
  }

  /**
   * Volta itens que ja estavam na expedição para a secao de preparo escolhida.
   * @param {Object} params - Dados e conexão da operação.
   * @returns {Promise<Object>}
   */
  async returnFromExpedition({ connection, order, kitchenOrderId, returnSection, reason, userId }) {
    const targetStations = resolveReturnStations(returnSection);

    if (!reason) {
      const error = new Error('Informe o motivo da devolução.');
      error.statusCode = 400;
      throw error;
    }

    if (targetStations.length === 0) {
      const error = new Error('Informe uma seção de preparo válida para voltar o pedido.');
      error.statusCode = 400;
      throw error;
    }

    if (order.estacao !== 'expedicao') {
      const error = new Error('Só é possível voltar pedidos que já estão na expedição.');
      error.statusCode = 400;
      throw error;
    }

    const items = await kitchenRepository.findExpeditionItems(connection, order.venda_id);
    const targetStationSet = new Set(targetStations);
    const itemsToReturn = items
      .map((item) => ({ ...item, estacao_original: resolveKitchenStation(item) }))
      .filter((item) => targetStationSet.has(item.estacao_original));

    if (itemsToReturn.length === 0) {
      const error = new Error('Não há itens desta seção na expedição para voltar.');
      error.statusCode = 400;
      throw error;
    }

    await connection.beginTransaction();
    try {
      const itemsByStation = new Map();
      for (const item of itemsToReturn) {
        const current = itemsByStation.get(item.estacao_original) || [];
        current.push(Number(item.id));
        itemsByStation.set(item.estacao_original, current);
      }

      for (const [station, itemIds] of itemsByStation.entries()) {
        await kitchenRepository.moveKitchenItemsToStation(connection, station, itemIds);
        const existingStationOrder = await kitchenRepository.findStationOrder(connection, order.venda_id, station, kitchenOrderId);

        if (existingStationOrder) {
          await kitchenRepository.updateKitchenOrderStatus(
            connection,
            existingStationOrder.id,
            'recebido',
            ', iniciado_em = NULL, pronto_em = NULL, saiu_para_entrega_em = NULL, entregue_em = NULL'
          );
        } else {
          await kitchenRepository.createKitchenOrder(connection, order.venda_id, station, 'recebido');
        }
      }

      const remainingExpeditionItems = await kitchenRepository.countExpeditionItems(connection, order.venda_id);
      if (remainingExpeditionItems === 0) {
        await kitchenRepository.updateKitchenOrderStatus(
          connection,
          kitchenOrderId,
          'movido_expedicao',
          ', saiu_para_entrega_em = NULL, entregue_em = NULL'
        );
      } else {
        await kitchenRepository.updateKitchenOrderStatus(
          connection,
          kitchenOrderId,
          'recebido',
          ', saiu_para_entrega_em = NULL, entregue_em = NULL'
        );
      }

      await connection.query("UPDATE vendas SET status = 'preparing' WHERE id = ? AND status <> 'cancelada'", [order.venda_id]);
      await registerOrderStatusHistory(connection, {
        orderId: order.venda_id,
        fromStatus: 'expedicao',
        toStatus: 'em_preparo',
        userId,
        reason
      });
      await audit(connection, userId, 'cozinha.pedido_retornado_preparo', 'pedidos_cozinha', Number(kitchenOrderId), {
        secoes: targetStations,
        itens: itemsToReturn.map((item) => Number(item.id)),
        motivo: reason
      });
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    }

    broadcastKitchenEvent('kitchen_order_returned', {
      id: Number(kitchenOrderId),
      venda_id: Number(order.venda_id),
      secoes: targetStations
    });

    return { id: Number(kitchenOrderId), status: 'recebido', secoes: targetStations };
  }

  /**
   * Volta apenas uma etapa no fluxo normal: pronto -> em_preparo ou em_preparo -> recebido.
   * @param {Object} params - Dados e conexão da operação.
   * @returns {Promise<Object>}
   */
  async returnOneStep({ connection, order, kitchenOrderId, reason, userId }) {
    if (!reason) {
      const error = new Error('Informe o motivo da devolução.');
      error.statusCode = 400;
      throw error;
    }

    const previousStatus = {
      pronto: 'em_preparo',
      em_preparo: 'recebido'
    }[order.status];

    if (!previousStatus) {
      const error = new Error('Este pedido não possui etapa anterior disponível para voltar.');
      error.statusCode = 400;
      throw error;
    }

    await kitchenRepository.updateKitchenOrderStatus(connection, kitchenOrderId, previousStatus, STATUS_DATA_SQL[previousStatus] || '');
    await registerOrderStatusHistory(connection, {
      orderId: order.venda_id,
      fromStatus: order.status,
      toStatus: previousStatus,
      userId,
      reason
    });
    await audit(connection, userId, 'cozinha.pedido_voltou_etapa', 'pedidos_cozinha', Number(kitchenOrderId), {
      status_anterior: order.status,
      status_novo: previousStatus,
      motivo: reason
    });
    broadcastKitchenEvent('kitchen_order_updated', { id: Number(kitchenOrderId), status: previousStatus });

    return { id: Number(kitchenOrderId), status: previousStatus };
  }

  /**
   * Envia uma estacao para expedição marcando a expedição como pronta para entrega.
   * @param {Object} params - Dados e conexão da operação.
   * @returns {Promise<Object>}
   */
  async sendToExpedition({ connection, order, kitchenOrderId, userId }) {
    const existingExpeditionOrder = await kitchenRepository.findActiveExpeditionOrder(connection, order.venda_id, kitchenOrderId);

    if (existingExpeditionOrder) {
      await kitchenRepository.updateKitchenOrderStatus(
        connection,
        kitchenOrderId,
        'movido_expedicao',
        ', pronto_em = COALESCE(pronto_em, CURRENT_TIMESTAMP), saiu_para_entrega_em = NULL, entregue_em = NULL'
      );
      await kitchenRepository.updateKitchenOrderStatus(
        connection,
        existingExpeditionOrder.id,
        'pronto',
        ', pronto_em = COALESCE(pronto_em, CURRENT_TIMESTAMP), saiu_para_entrega_em = NULL, entregue_em = NULL'
      );
    } else {
      await connection.query(
        `
          UPDATE pedidos_cozinha
          SET estacao = 'expedicao',
              status = 'pronto',
              pronto_em = COALESCE(pronto_em, CURRENT_TIMESTAMP),
              saiu_para_entrega_em = NULL,
              entregue_em = NULL
          WHERE id = ?
        `,
        [kitchenOrderId]
      );
    }

    await kitchenRepository.moveStationItemsToExpedition(connection, order.venda_id, order.estacao);
    await audit(connection, userId, 'cozinha.enviado_expedicao', 'pedidos_cozinha', Number(kitchenOrderId), {
      estacao_anterior: order.estacao,
      pedido_expedicao_id: existingExpeditionOrder?.id || Number(kitchenOrderId)
    });
    await registerOrderStatusHistory(connection, {
      orderId: order.venda_id,
      fromStatus: order.status,
      toStatus: 'pronto',
      userId,
      reason: null
    });
    await kitchenRepository.updateSaleStatus(connection, order.venda_id, 'ready', ', ready_at = COALESCE(ready_at, CURRENT_TIMESTAMP)');

    const expeditionOrderId = existingExpeditionOrder?.id || Number(kitchenOrderId);
    broadcastKitchenEvent('kitchen_order_updated', {
      id: expeditionOrderId,
      status: 'pronto',
      estacao: 'expedicao'
    });

    return { id: expeditionOrderId, status: 'pronto', estacao: 'expedicao' };
  }
}

export default new KitchenService();
