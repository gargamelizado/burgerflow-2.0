/**
 * @file nodeRed.controller.js
<<<<<<< HEAD
 * @description Controller HTTP para integracao com Node-RED.
 */

import nodeRedConfig from '../../config/nodeRed.js';
import nodeRedService from './nodeRed.service.js';

class NodeRedController {
  status(_req, res) {
    return res.json({
      enabled: nodeRedService.isEnabled(),
      baseUrl: nodeRedConfig.baseUrl,
      hasSecret: Boolean(nodeRedConfig.secret),
      message: nodeRedService.isEnabled()
        ? 'Integração Node-RED ativa.'
        : 'Integração Node-RED desativada.',
    });
  }

  async test(_req, res) {
    const result = await nodeRedService.testConnection();

    if (result.success) {
      return res.json({
        ok: true,
        message: 'Conexão com Node-RED testada com sucesso.',
        result,
      });
    }

    return res.status(200).json({
      ok: false,
      message: result.warning || 'Falha ao testar conexão com Node-RED.',
      result,
    });
  }
}

const nodeRedController = new NodeRedController();
export default nodeRedController;
=======
 * @description Controller HTTP da integracao basica com Node-RED.
 * @author BurgerFlow
 */

import nodeRedService from './nodeRed.service.js';

class NodeRedController {
  /**
   * Retorna status atual da configuracao e conectividade basica com Node-RED.
   * @param {Object} req - Requisicao HTTP.
   * @param {Object} res - Resposta HTTP.
   * @returns {Promise<Object>}
   */
  async getStatus(req, res) {
    try {
      const status = await nodeRedService.getStatus();
      return res.json(status);
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        message: error.message || 'Erro ao consultar status do Node-RED.'
      });
    }
  }

  /**
   * Dispara uma chamada de teste para o fluxo HTTP do Node-RED.
   * @param {Object} req - Requisicao HTTP.
   * @param {Object} res - Resposta HTTP.
   * @returns {Promise<Object>}
   */
  async sendTest(req, res) {
    try {
      const result = await nodeRedService.sendTest(req.body, {
        userId: req.user?.id,
        userName: req.user?.nome || req.user?.email || null
      });
      return res.json(result);
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        message: error.message || 'Erro ao testar integração com Node-RED.'
      });
    }
  }
}

export default new NodeRedController();
>>>>>>> 65c17b1 (ok)
