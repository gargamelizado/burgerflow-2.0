/**
 * @file kitchen.controller.js
 * @description Controller HTTP do modulo de cozinha/KDS.
 * @author BurgerFlow
 */

import kitchenService from './kitchen.service.js';

class KitchenController {
  /**
   * Lista pedidos ativos da cozinha por estacao.
   * @param {Object} req - Requisicao HTTP.
   * @param {Object} res - Resposta HTTP.
   * @returns {Promise<Object>}
   */
  async listOrders(req, res) {
    try {
      const orders = await kitchenService.listOrders();
      return res.json(orders);
    } catch (error) {
      return res.status(error.statusCode || 500).json({ message: error.message || 'Erro ao carregar pedidos da cozinha.' });
    }
  }

  /**
   * Atualiza status de um pedido da cozinha.
   * @param {Object} req - Requisicao HTTP.
   * @param {Object} res - Resposta HTTP.
   * @returns {Promise<Object>}
   */
  async updateStatus(req, res) {
    try {
      const result = await kitchenService.updateStatus({
        kitchenOrderId: req.params.id,
        status: String(req.body.status || 'recebido'),
        reason: String(req.body.motivo || req.body.reason || '').trim(),
        returnSection: req.body.estacao || req.body.estacao_alvo || req.body.section || req.body.secao,
        userId: req.user.id
      });

      return res.json(result);
    } catch (error) {
      return res.status(error.statusCode || 500).json({ message: error.message || 'Erro ao atualizar pedido.' });
    }
  }
}

export default new KitchenController();
