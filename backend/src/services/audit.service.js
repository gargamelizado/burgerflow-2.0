const db = require('../config/db');

const logAuditAction = async (
  { userId, action, resource, details = null, ipAddress = null },
  connection = db
) => {
  await connection.query(
    `
    INSERT INTO auditoria (
      usuario_id,
      acao,
      entidade,
      entidade_id,
      detalhes,
      ip_address
    ) VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      userId || null,
      action,
      resource,
      Number.isInteger(Number(details?.resourceId))
        ? Number(details.resourceId)
        : null,
      details ? JSON.stringify(details) : null,
      ipAddress,
    ]
  );
};

module.exports = {
  logAuditAction,
};
