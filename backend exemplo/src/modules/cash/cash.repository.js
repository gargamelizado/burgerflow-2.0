/**
 * @file cash.repository.js
 * @description Repository do modulo de caixa. Centraliza consultas SQL de abertura, movimentos, fechamento e relatorios.
 * @author BurgerFlow
 */

import db from '../../config/db.js';

class CashRepository {
  /**
   * Abre uma conexao com o banco para operacoes transacionais de caixa.
   * @returns {Promise<Object>}
   */
  getConnection() {
    return db.getConnection();
  }

  /**
   * Busca uma configuracao operacional do sistema.
   * @param {Object} connection - Conexao MySQL.
   * @param {string} key - Chave da configuracao.
   * @param {string|null} fallback - Valor usado quando a chave nao existe.
   * @returns {Promise<string|null>}
   */
  async getSetting(connection, key, fallback = null) {
    const [rows] = await connection.query('SELECT valor FROM configuracoes WHERE chave = ? LIMIT 1', [key]);
    return rows.length > 0 ? rows[0].valor : fallback;
  }

  /**
   * Busca o caixa aberto do usuario informado.
   * @param {Object} connection - Conexao MySQL.
   * @param {number|null} userId - ID do operador.
   * @returns {Promise<Object|null>}
   */
  async findOpen(connection, userId = null) {
    const params = [];
    let sql = "SELECT * FROM caixas WHERE status = 'aberto'";

    if (userId) {
      sql += ' AND usuario_abertura_id = ?';
      params.push(userId);
    }

    sql += ' ORDER BY aberto_em DESC LIMIT 1';

    const [rows] = await connection.query(sql, params);
    return rows[0] || null;
  }

  /**
   * Cria registro de abertura de caixa.
   * @param {Object} connection - Conexao MySQL.
   * @param {Object} data - Dados de abertura.
   * @returns {Promise<number>}
   */
  async open(connection, data) {
    const [result] = await connection.query(
      'INSERT INTO caixas (usuario_abertura_id, valor_abertura, valor_esperado) VALUES (?, ?, ?)',
      [data.userId, data.openingAmount, data.openingAmount]
    );

    return result.insertId;
  }

  /**
   * Busca o registro principal do caixa.
   * @param {Object} connection - Conexao MySQL.
   * @param {number|string} cashId - ID do caixa.
   * @returns {Promise<Object|null>}
   */
  async findById(connection, cashId) {
    const [[cash]] = await connection.query('SELECT * FROM caixas WHERE id = ?', [cashId]);
    return cash || null;
  }

  /**
   * Resume vendas pagas associadas ao caixa.
   * @param {Object} connection - Conexao MySQL.
   * @param {number|string} cashId - ID do caixa.
   * @returns {Promise<Object>}
   */
  async sumPayments(connection, cashId) {
    const [[sales]] = await connection.query(
      `
        SELECT
          COALESCE(SUM(CASE WHEN p.metodo IN ('cash','dinheiro') AND p.status IN ('approved','aprovado') THEN p.valor ELSE 0 END), 0) AS vendas_dinheiro,
          COALESCE(SUM(CASE WHEN p.metodo = 'pix' AND p.status IN ('approved','aprovado') THEN p.valor ELSE 0 END), 0) AS vendas_pix,
          COALESCE(SUM(CASE WHEN p.metodo IN ('card_credit','cartao','credito') AND p.status IN ('approved','aprovado') THEN p.valor ELSE 0 END), 0) AS vendas_credito,
          COALESCE(SUM(CASE WHEN p.metodo IN ('card_debit','debito') AND p.status IN ('approved','aprovado') THEN p.valor ELSE 0 END), 0) AS vendas_debito,
          COALESCE(SUM(CASE WHEN p.metodo = 'voucher' AND p.status IN ('approved','aprovado') THEN p.valor ELSE 0 END), 0) AS vendas_voucher,
          COALESCE(SUM(CASE WHEN p.metodo IN ('cash','dinheiro') AND p.status IN ('approved','aprovado') THEN p.troco ELSE 0 END), 0) AS troco
        FROM pagamentos p
        JOIN vendas v ON v.id = p.venda_id
        WHERE p.caixa_id = ? AND v.status <> 'cancelada'
      `,
      [cashId]
    );

    return sales;
  }

  /**
   * Resume movimentos manuais do caixa.
   * @param {Object} connection - Conexao MySQL.
   * @param {number|string} cashId - ID do caixa.
   * @returns {Promise<Object>}
   */
  async sumMovements(connection, cashId) {
    const [[moves]] = await connection.query(
      `
        SELECT
          COALESCE(SUM(CASE WHEN tipo = 'suprimento' THEN valor ELSE 0 END), 0) AS suprimentos,
          COALESCE(SUM(CASE WHEN tipo = 'sangria' THEN valor ELSE 0 END), 0) AS sangrias,
          COALESCE(SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END), 0) AS despesas
        FROM caixa_movimentos
        WHERE caixa_id = ?
      `,
      [cashId]
    );

    return moves;
  }

  /**
   * Busca a ultima sangria para regra de alerta de caixa parado.
   * @param {Object} connection - Conexao MySQL.
   * @param {number|string} cashId - ID do caixa.
   * @returns {Promise<Object|null>}
   */
  async findLastWithdrawal(connection, cashId) {
    const [[lastWithdrawal]] = await connection.query(
      "SELECT created_at FROM caixa_movimentos WHERE caixa_id = ? AND tipo = 'sangria' ORDER BY created_at DESC LIMIT 1",
      [cashId]
    );

    return lastWithdrawal || null;
  }

  /**
   * Registra sangria, suprimento ou despesa.
   * @param {Object} connection - Conexao MySQL.
   * @param {Object} data - Dados do movimento.
   * @returns {Promise<number>}
   */
  async createMovement(connection, data) {
    const [result] = await connection.query(
      'INSERT INTO caixa_movimentos (caixa_id, usuario_id, tipo, valor, observacao) VALUES (?, ?, ?, ?, ?)',
      [data.cashId, data.userId, data.type, data.amount, data.note || null]
    );

    return result.insertId;
  }

  /**
   * Atualiza o valor esperado em dinheiro depois de um movimento manual.
   * @param {Object} connection - Conexao MySQL.
   * @param {number|string} cashId - ID do caixa.
   * @param {number} delta - Valor positivo ou negativo.
   * @returns {Promise<void>}
   */
  async updateExpectedAmount(connection, cashId, delta) {
    await connection.query('UPDATE caixas SET valor_esperado = valor_esperado + ? WHERE id = ?', [delta, cashId]);
  }

  /**
   * Fecha caixa aberto do operador.
   * @param {Object} connection - Conexao MySQL.
   * @param {Object} data - Dados de fechamento.
   * @returns {Promise<void>}
   */
  async close(connection, data) {
    await connection.query(
      `
        UPDATE caixas
        SET status='fechado', usuario_fechamento_id=?, valor_declarado=?, diferenca=?, justificativa_diferenca=?, observacao=?, fechado_em=CURRENT_TIMESTAMP
        WHERE id=? AND status='aberto'
      `,
      [
        data.userId,
        data.declaredAmount,
        data.difference,
        data.differenceJustification || null,
        data.note || null,
        data.cashId
      ]
    );
  }

  /**
   * Lista vendas registradas no caixa para relatorio.
   * @param {Object} connection - Conexao MySQL.
   * @param {number|string} cashId - ID do caixa.
   * @returns {Promise<Array>}
   */
  async listSales(connection, cashId) {
    const [sales] = await connection.query(
      `
        SELECT v.id, v.numero_pedido, v.total, v.status, v.created_at, GROUP_CONCAT(p.metodo SEPARATOR ', ') AS formas_pagamento
        FROM vendas v
        LEFT JOIN pagamentos p ON p.venda_id = v.id
        WHERE v.caixa_id = ?
        GROUP BY v.id
        ORDER BY v.created_at ASC
      `,
      [cashId]
    );

    return sales;
  }

  /**
   * Lista movimentos do caixa para relatorio.
   * @param {Object} connection - Conexao MySQL.
   * @param {number|string} cashId - ID do caixa.
   * @returns {Promise<Array>}
   */
  async listMovements(connection, cashId) {
    const [movements] = await connection.query(
      'SELECT * FROM caixa_movimentos WHERE caixa_id = ? ORDER BY created_at ASC',
      [cashId]
    );

    return movements;
  }
}

export default new CashRepository();
