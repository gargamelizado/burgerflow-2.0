/**
 * @file cash.controller.js
 * @description Controller do caixa. Recebe requisicoes HTTP e delega regras para o service.
 * @author BurgerFlow
 */

import cashService from './cash.service.js';

class CashController {
  /**
   * Retorna caixa aberto do operador autenticado.
   * @param {Object} req - Requisicao HTTP.
   * @param {Object} res - Resposta HTTP.
   * @returns {Promise<Object>}
   */
  async getOpen(req, res) {
    try {
      const cash = await cashService.getOpen(req.user.id, req.businessType);
      return res.json(cash);
    } catch (error) {
      return res.status(error.statusCode || 500).json({ message: error.message || 'Erro ao buscar caixa aberto.' });
    }
  }

  /**
   * Abre um novo caixa para o operador autenticado.
   * @param {Object} req - Requisicao HTTP.
   * @param {Object} res - Resposta HTTP.
   * @returns {Promise<Object>}
   */
  async open(req, res) {
    try {
      const cash = await cashService.open(req.body, { userId: req.user.id });
      return res.status(201).json(cash);
    } catch (error) {
      return res.status(error.statusCode || 500).json({ message: error.message || 'Erro ao abrir caixa.' });
    }
  }

  /**
   * Registra movimento manual de caixa.
   * @param {Object} req - Requisicao HTTP.
   * @param {Object} res - Resposta HTTP.
   * @returns {Promise<Object>}
   */
  async createMovement(req, res) {
    try {
      const movement = await cashService.createMovement(req.body, {
        userId: req.user.id,
        businessType: req.businessType
      });
      return res.status(201).json(movement);
    } catch (error) {
      return res.status(error.statusCode || 500).json({ message: error.message || 'Erro ao registrar movimento.' });
    }
  }

  /**
   * Fecha caixa aberto do operador autenticado.
   * @param {Object} req - Requisicao HTTP.
   * @param {Object} res - Resposta HTTP.
   * @returns {Promise<Object>}
   */
  async close(req, res) {
    try {
      const cash = await cashService.close(req.body, { userId: req.user.id });
      return res.json(cash);
    } catch (error) {
      return res.status(error.statusCode || 500).json({ message: error.message || 'Erro ao fechar caixa.' });
    }
  }

  /**
   * Retorna relatorio detalhado de um caixa.
   * @param {Object} req - Requisicao HTTP.
   * @param {Object} res - Resposta HTTP.
   * @returns {Promise<Object>}
   */
  async getReport(req, res) {
    try {
      const report = await cashService.getReport(req.params.id);
      return res.json(report);
    } catch (error) {
      return res.status(error.statusCode || 500).json({ message: error.message || 'Erro ao gerar relatório de caixa.' });
    }
  }
}

export default new CashController();
