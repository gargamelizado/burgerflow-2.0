/**
 * @file recoverOrder.controller.js
 * @description Controller HTTP da seção Recuperador de Pedido.
 * @author BurgerFlow
 */

import recoverOrderService from './recoverOrder.service.js';

class RecoverOrderController {
  /**
   * Lista pedidos liberados pela expedicao para recuperacao sem digitar numero.
   * @param {Object} req - Requisicao HTTP.
   * @param {Object} res - Resposta HTTP.
   * @returns {Promise<Object>}
   */
  async listReleased(req, res) {
    try {
      const orders = await recoverOrderService.listReleased();
      return res.json(orders);
    } catch (error) {
      return res.status(error.statusCode || 500).json({ message: error.message || 'Erro ao listar pedidos liberados.' });
    }
  }

  /**
   * Busca pedido liberado pela expedicao por numero.
   * @param {Object} req - Requisicao HTTP.
   * @param {Object} res - Resposta HTTP.
   * @returns {Promise<Object>}
   */
  async findByNumber(req, res) {
    try {
      const order = await recoverOrderService.findByNumber(String(req.params.numero || '').trim());
      return res.json(order);
    } catch (error) {
      return res.status(error.statusCode || 500).json({ message: error.message || 'Erro ao buscar pedido.' });
    }
  }

  /**
   * Recupera pedido e reenvia para a cozinha.
   * @param {Object} req - Requisicao HTTP.
   * @param {Object} res - Resposta HTTP.
   * @returns {Promise<Object>}
   */
  async recover(req, res) {
    try {
      const result = await recoverOrderService.recover({
        orderId: req.params.id,
        reason: String(req.body.motivo || req.body.reason || '').trim(),
        userId: req.user.id
      });

      return res.json(result);
    } catch (error) {
      return res.status(error.statusCode || 500).json({ message: error.message || 'Erro ao recuperar pedido.' });
    }
  }
}

export default new RecoverOrderController();
