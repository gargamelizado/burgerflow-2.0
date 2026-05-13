/**
 * @file recoverOrder.service.js
 * @description Service do Recuperador de Pedido com regras de reentrada no fluxo de cozinha.
 * @author BurgerFlow
 */

import recoverOrderRepository from './recoverOrder.repository.js';
import { audit, registerOrderStatusHistory } from '../../repositories/audit.repository.js';
import { broadcastKitchenEvent } from '../../realtime/kitchenHub.js';
import { resolveKitchenStation } from '../../utils/kitchenRouting.js';

const EXPEDITION_RELEASED_STATUSES = new Set(['delivered', 'entregue', 'released', 'liberado']);

class RecoverOrderService {
  /**
   * Lista pedidos liberados pela expedicao para aparecerem automaticamente no Recuperador.
   * @returns {Promise<Array>}
   */
  async listReleased() {
    const connection = await recoverOrderRepository.getConnection();
    try {
      const orders = await recoverOrderRepository.findReleasedOrders(connection);

      return Promise.all(orders.map(async (order) => ({
        ...order,
        itens: await recoverOrderRepository.findSaleItems(connection, order.id)
      })));
    } finally {
      connection.release();
    }
  }

  /**
   * Busca pedido liberado pela expedicao para recuperacao.
   * @param {string|number} number - ID ou numero do pedido.
   * @returns {Promise<Object>}
   */
  async findByNumber(number) {
    const connection = await recoverOrderRepository.getConnection();
    try {
      const order = await recoverOrderRepository.findRecoverableOrderByNumber(connection, number);

      if (!order) {
        const error = new Error('Pedido não encontrado.');
        error.statusCode = 404;
        throw error;
      }

      this.ensureRecoverable(order);
      const items = await recoverOrderRepository.findSaleItems(connection, order.id);
      return { ...order, itens: items };
    } finally {
      connection.release();
    }
  }

  /**
   * Recupera pedido liberado pela expedicao e o devolve para em preparo.
   * @param {Object} params - Dados da recuperacao.
   * @param {number|string} params.orderId - ID da venda.
   * @param {string} params.reason - Motivo obrigatorio.
   * @param {number} params.userId - Usuario responsavel.
   * @returns {Promise<Object>}
   */
  async recover({ orderId, reason, userId }) {
    if (!reason) {
      const error = new Error('Informe o motivo da recuperação.');
      error.statusCode = 400;
      throw error;
    }

    const connection = await recoverOrderRepository.getConnection();
    try {
      const order = await recoverOrderRepository.findOrderById(connection, orderId);

      if (!order) {
        const error = new Error('Pedido não encontrado.');
        error.statusCode = 404;
        throw error;
      }

      this.ensureRecoverable(order);
      const items = await recoverOrderRepository.findSaleItemsForRouting(connection, order.id);

      await connection.beginTransaction();
      try {
        await recoverOrderRepository.markSalePreparing(connection, order.id);
        await recoverOrderRepository.archiveKitchenOrders(connection, order.id);

        const itemsByStation = new Map();
        for (const item of items) {
          const station = resolveKitchenStation(item);
          const current = itemsByStation.get(station) || [];
          current.push(Number(item.id));
          itemsByStation.set(station, current);
        }

        for (const [station, saleItemIds] of itemsByStation.entries()) {
          await recoverOrderRepository.moveItemsToStation(connection, order.id, station, saleItemIds);
          await recoverOrderRepository.createKitchenOrder(connection, order.id, station);
        }

        await registerOrderStatusHistory(connection, {
          orderId: order.id,
          fromStatus: order.venda_status || order.cozinha_status,
          toStatus: 'em_preparo',
          userId,
          reason
        });
        await audit(connection, userId, 'cozinha.pedido_recuperado', 'vendas', Number(order.id), { motivo: reason });
        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      }

      broadcastKitchenEvent('kitchen_order_recovered', { order_id: Number(order.id), status: 'em_preparo' });
      return { id: Number(order.id), status: 'em_preparo', message: 'Pedido recuperado e enviado novamente para a cozinha.' };
    } finally {
      connection.release();
    }
  }

  /**
   * Garante que apenas pedidos liberados pela expedicao entrem no recuperador.
   * @param {Object} order - Pedido encontrado no banco.
   * @returns {void}
   */
  ensureRecoverable(order) {
    const saleStatus = String(order.venda_status || '').toLowerCase();
    const kitchenStatus = String(order.cozinha_status || '').toLowerCase();
    const releasedByExpedition = Number(order.liberado_expedicao || 0) > 0 || Boolean(order.delivered_at);

    if (!EXPEDITION_RELEASED_STATUSES.has(saleStatus) && !EXPEDITION_RELEASED_STATUSES.has(kitchenStatus) && !releasedByExpedition) {
      const error = new Error('Somente pedidos liberados pela expedição podem ser recuperados.');
      error.statusCode = 400;
      throw error;
    }
  }
}

export default new RecoverOrderService();
