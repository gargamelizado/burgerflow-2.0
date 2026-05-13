/**
 * @file cash.service.js
 * @description Service do caixa. Contem regras de abertura, movimentacao, fechamento, alertas e relatorio.
 * @author BurgerFlow
 */

import cashRepository from './cash.repository.js';
import { audit } from '../../repositories/audit.repository.js';
import { broadcastKitchenEvent } from '../../realtime/kitchenHub.js';

class CashService {
  /**
   * Retorna o caixa aberto do operador com resumo e alertas.
   * @param {number} userId - ID do operador autenticado.
   * @param {string} businessType - Perfil do negocio.
   * @returns {Promise<Object|null>}
   */
  async getOpen(userId, businessType) {
    const connection = await cashRepository.getConnection();
    try {
      const cash = await cashRepository.findOpen(connection, userId);
      if (!cash) return null;

      const summary = await this.getSummary(connection, cash.id);
      const alertas = await this.getAlerts(connection, cash.id, businessType);

      return {
        ...cash,
        valor_esperado: summary.valor_esperado_total,
        resumo: summary,
        alertas
      };
    } finally {
      connection.release();
    }
  }

  /**
   * Abre caixa para o operador quando ele ainda nao possui caixa aberto.
   * @param {Object} body - Payload com valor_abertura.
   * @param {Object} context - Contexto do usuario autenticado.
   * @returns {Promise<Object>}
   */
  async open(body, { userId }) {
    const openingAmount = this.parseMoney(body.valor_abertura || 0, 'Valor de abertura inválido.');
    const connection = await cashRepository.getConnection();
    let transactionStarted = false;

    try {
      await connection.beginTransaction();
      transactionStarted = true;

      const existing = await cashRepository.findOpen(connection, userId);
      if (existing) {
        const error = new Error('Este operador já possui caixa aberto.');
        error.statusCode = 400;
        throw error;
      }

      const id = await cashRepository.open(connection, { userId, openingAmount });
      await audit(connection, userId, 'caixa.aberto', 'caixas', id, { valor_abertura: openingAmount });
      await connection.commit();

      return { id, status: 'aberto', valor_abertura: openingAmount, valor_esperado: openingAmount };
    } catch (error) {
      if (transactionStarted) await connection.rollback().catch(() => null);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Registra sangria, suprimento ou despesa e recalcula alertas operacionais.
   * @param {Object} body - Payload com tipo, valor e observacao.
   * @param {Object} context - Contexto do usuario autenticado.
   * @returns {Promise<Object>}
   */
  async createMovement(body, { userId, businessType }) {
    const type = String(body.tipo || 'suprimento').trim();
    const note = String(body.observacao || body.motivo || '').trim();
    const amount = this.parseMoney(body.valor || 0, 'Valor inválido.');

    this.validateMovement(type, note);

    const connection = await cashRepository.getConnection();
    let transactionStarted = false;

    try {
      await connection.beginTransaction();
      transactionStarted = true;

      const cash = await cashRepository.findOpen(connection, userId);
      if (!cash) {
        const error = new Error('Nenhum caixa aberto.');
        error.statusCode = 400;
        throw error;
      }

      const delta = ['sangria', 'despesa'].includes(type) ? -Math.abs(amount) : Math.abs(amount);
      const id = await cashRepository.createMovement(connection, {
        cashId: cash.id,
        userId,
        type,
        amount,
        note
      });

      await cashRepository.updateExpectedAmount(connection, cash.id, delta);
      await audit(connection, userId, `caixa.${type}`, 'caixa_movimentos', id, { valor: amount });

      const alertas = await this.getAlerts(connection, cash.id, businessType);
      broadcastKitchenEvent('cash.alert', { caixa_id: cash.id, alertas });

      await connection.commit();
      return { id, caixa_id: cash.id, tipo: type, valor: amount, alertas };
    } catch (error) {
      if (transactionStarted) await connection.rollback().catch(() => null);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Fecha caixa e exige justificativa quando existe diferenca no dinheiro declarado.
   * @param {Object} body - Payload de fechamento.
   * @param {Object} context - Contexto do usuario autenticado.
   * @returns {Promise<Object>}
   */
  async close(body, { userId }) {
    const declaredAmount = this.parseMoney(body.valor_declarado || 0, 'Valor declarado inválido.');
    const note = body.observacao || null;
    const differenceJustification = String(body.justificativa_diferenca || '').trim();
    const connection = await cashRepository.getConnection();
    let transactionStarted = false;

    try {
      await connection.beginTransaction();
      transactionStarted = true;

      const cash = await cashRepository.findOpen(connection, userId);
      if (!cash) {
        const error = new Error('Nenhum caixa aberto.');
        error.statusCode = 400;
        throw error;
      }

      const summary = await this.getSummary(connection, cash.id);
      const difference = Number((declaredAmount - Number(summary.valor_esperado_dinheiro)).toFixed(2));

      if (difference !== 0 && !differenceJustification) {
        const error = new Error('Diferença no fechamento exige justificativa.');
        error.statusCode = 400;
        throw error;
      }

      await cashRepository.close(connection, {
        cashId: cash.id,
        userId,
        declaredAmount,
        difference,
        differenceJustification,
        note
      });
      await audit(connection, userId, 'caixa.fechado', 'caixas', cash.id, {
        valor_declarado: declaredAmount,
        diferenca: difference
      });
      await connection.commit();

      return { id: cash.id, status: 'fechado', valor_declarado: declaredAmount, diferenca: difference, resumo: summary };
    } catch (error) {
      if (transactionStarted) await connection.rollback().catch(() => null);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Gera relatorio completo do caixa com vendas, movimentos e ticket medio.
   * @param {number|string} cashId - ID do caixa.
   * @returns {Promise<Object>}
   */
  async getReport(cashId) {
    const connection = await cashRepository.getConnection();
    try {
      const summary = await this.getSummary(connection, cashId);
      if (!summary) {
        const error = new Error('Caixa não encontrado.');
        error.statusCode = 404;
        throw error;
      }

      const vendas = await cashRepository.listSales(connection, cashId);
      const movimentos = await cashRepository.listMovements(connection, cashId);
      const validSales = vendas.filter((sale) => sale.status !== 'cancelada');
      const ticketMedio = validSales.length ? Number((summary.total_vendido / validSales.length).toFixed(2)) : 0;

      return {
        ...summary,
        quantidade_vendas: validSales.length,
        ticket_medio: ticketMedio,
        vendas,
        movimentos
      };
    } finally {
      connection.release();
    }
  }

  /**
   * Calcula totais consolidados do caixa.
   * @param {Object} connection - Conexao MySQL.
   * @param {number|string} cashId - ID do caixa.
   * @returns {Promise<Object|null>}
   */
  async getSummary(connection, cashId) {
    const cash = await cashRepository.findById(connection, cashId);
    if (!cash) return null;

    const sales = await cashRepository.sumPayments(connection, cashId);
    const moves = await cashRepository.sumMovements(connection, cashId);
    const cashBalance = Number((
      Number(cash.valor_abertura) +
      Number(sales.vendas_dinheiro) +
      Number(moves.suprimentos) -
      Number(moves.sangrias) -
      Number(moves.despesas)
    ).toFixed(2));
    const totalSold = Number((Number(sales.vendas_dinheiro) + Number(sales.vendas_pix) + Number(sales.vendas_credito) + Number(sales.vendas_debito) + Number(sales.vendas_voucher)).toFixed(2));
    const expectedTotal = Number((
      Number(cash.valor_abertura) +
      totalSold +
      Number(moves.suprimentos) -
      Number(moves.sangrias) -
      Number(moves.despesas)
    ).toFixed(2));

    return {
      caixa: cash,
      total_vendido: totalSold,
      cash_total: Number(sales.vendas_dinheiro),
      pix_total: Number(sales.vendas_pix),
      card_total: Number((Number(sales.vendas_credito) + Number(sales.vendas_debito)).toFixed(2)),
      voucher_total: Number(sales.vendas_voucher),
      total_sales: totalSold,
      total_dinheiro: Number(sales.vendas_dinheiro),
      total_pix: Number(sales.vendas_pix),
      total_cartao_credito: Number(sales.vendas_credito),
      total_cartao_debito: Number(sales.vendas_debito),
      total_voucher: Number(sales.vendas_voucher),
      total_sangrias: Number(moves.sangrias),
      total_suprimentos: Number(moves.suprimentos),
      total_despesas: Number(moves.despesas),
      total_troco: Number(sales.troco),
      valor_esperado_total: expectedTotal,
      valor_esperado_dinheiro: cashBalance,
      valor_esperado: expectedTotal,
      cash_balance: cashBalance
    };
  }

  /**
   * Gera alertas de caixa alto, bloqueio por limite e tempo sem sangria.
   * @param {Object} connection - Conexao MySQL.
   * @param {number|string} cashId - ID do caixa.
   * @param {string} businessType - Perfil do negocio.
   * @returns {Promise<Array>}
   */
  async getAlerts(connection, cashId, businessType) {
    const summary = await this.getSummary(connection, cashId);
    if (!summary) return [];

    const alertLimit = Number(await cashRepository.getSetting(connection, 'limite_alerta_dinheiro', businessType === 'fast_food' ? '300' : '500'));
    const blockLimit = Number(await cashRepository.getSetting(connection, 'limite_bloqueio_dinheiro', businessType === 'fast_food' ? '800' : '3000'));
    const alerts = [];

    if (summary.cash_balance >= blockLimit) {
      alerts.push({
        type: 'cash.blocked',
        severity: 'critical',
        message: 'Caixa atingiu o limite máximo. Realize sangria para continuar vendendo.'
      });
    } else if (summary.cash_balance > alertLimit) {
      alerts.push({
        type: 'cash.high_value',
        severity: 'warning',
        message: 'Caixa com valor alto. Recomenda-se realizar sangria.'
      });
    }

    const lastWithdrawal = await cashRepository.findLastWithdrawal(connection, cashId);
    const referenceDate = lastWithdrawal?.created_at || summary.caixa.aberto_em;

    if (referenceDate && Date.now() - new Date(referenceDate).getTime() > 4 * 60 * 60 * 1000) {
      alerts.push({
        type: 'cash.no_withdrawal',
        severity: 'info',
        message: 'Caixa sem sangria há muito tempo.'
      });
    }

    return alerts;
  }

  /**
   * Converte valores monetarios e bloqueia numeros invalidos.
   * @param {unknown} value - Valor recebido da API.
   * @param {string} message - Mensagem de erro.
   * @returns {number}
   */
  parseMoney(value, message) {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount < 0) {
      const error = new Error(message);
      error.statusCode = 400;
      throw error;
    }
    return amount;
  }

  /**
   * Valida regras especificas de movimento manual de caixa.
   * @param {string} type - Tipo do movimento.
   * @param {string} note - Motivo ou observacao.
   * @returns {void}
   */
  validateMovement(type, note) {
    if (!['sangria', 'suprimento', 'despesa'].includes(type)) {
      const error = new Error('Tipo de movimento inválido.');
      error.statusCode = 400;
      throw error;
    }

    if (['sangria', 'suprimento'].includes(type) && !note) {
      const error = new Error('Motivo obrigatório.');
      error.statusCode = 400;
      throw error;
    }

    if (type === 'despesa' && !note) {
      const error = new Error('Descrição da despesa é obrigatória.');
      error.statusCode = 400;
      throw error;
    }
  }
}

export default new CashService();
