const db = require('../config/db');

const logAudit = async ({
  usuario_id = null,
  acao,
  entidade = null,
  entidade_id = null,
  detalhes = null,
  ip_address = null,
}) => {
  await db.query(
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
      usuario_id || null,
      acao,
      entidade || null,
      entidade_id || null,
      detalhes ? JSON.stringify(detalhes) : null,
      ip_address,
    ]
  );
};

module.exports = {
  logAudit,
};
