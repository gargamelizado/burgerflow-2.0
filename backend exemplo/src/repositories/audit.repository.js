/**
 * @file audit.repository.js
 * @description Repository de auditoria e historico de status de pedidos.
 * @author BurgerFlow
 */

/**
 * Registra uma acao nas tabelas de auditoria operacional.
 * @param {Object} connection - Conexao MySQL ativa.
 * @param {number|null} userId - Usuario responsavel pela acao.
 * @param {string} action - Nome tecnico da acao.
 * @param {string|null} entity - Entidade afetada.
 * @param {number|null} entityId - Identificador da entidade afetada.
 * @param {Object|null} data - Dados adicionais serializados como JSON.
 * @returns {Promise<void>}
 */
export async function audit(connection, userId, action, entity, entityId, data = null) {
  await connection.query(
    'INSERT INTO auditoria (usuario_id, acao, entidade, entidade_id, dados) VALUES (?, ?, ?, ?, ?)',
    [userId || null, action, entity || null, entityId || null, data ? JSON.stringify(data) : null]
  ).catch(() => null);

  await connection.query(
    'INSERT INTO operator_logs (operador_id, acao, referencia_id, descricao) VALUES (?, ?, ?, ?)',
    [userId || null, action, entityId || null, data ? JSON.stringify({ entidade: entity, dados: data }) : entity || null]
  ).catch(() => null);
}

/**
 * Registra transicao de status de pedido para rastrear devolucao, recuperacao e entrega.
 * @param {Object} connection - Conexao MySQL ativa.
 * @param {Object} data - Dados da transicao.
 * @param {number} data.orderId - Pedido/venda afetado.
 * @param {string|null} data.fromStatus - Status anterior.
 * @param {string} data.toStatus - Novo status.
 * @param {number|null} data.userId - Usuario responsavel.
 * @param {string|null} data.reason - Motivo operacional.
 * @returns {Promise<void>}
 */
export async function registerOrderStatusHistory(connection, { orderId, fromStatus, toStatus, userId, reason }) {
  await connection.query(
    'INSERT INTO order_status_history (order_id, old_status, new_status, user_id, reason) VALUES (?, ?, ?, ?, ?)',
    [orderId, fromStatus || null, toStatus, userId || null, reason || null]
  ).catch(() => null);
}
