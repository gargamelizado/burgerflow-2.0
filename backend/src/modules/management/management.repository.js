const db = require('../../config/db');

const findManagerByIdentifier = async (identifier) => {
  const normalizedIdentifier = String(identifier || '').trim();

  const [rows] = await db.query(
    `
    SELECT
      id,
      nome,
      email,
      senha_hash,
      nivel_acesso,
      ativo
    FROM usuarios
    WHERE (email = ? OR nome = ?)
      AND ativo = TRUE
      AND nivel_acesso IN ('admin', 'gerente')
    LIMIT 1
    `,
    [normalizedIdentifier.toLowerCase(), normalizedIdentifier]
  );

  return rows[0] || null;
};

const findManagerById = async (id) => {
  const [rows] = await db.query(
    `
    SELECT
      id,
      nome,
      email,
      nivel_acesso,
      ativo
    FROM usuarios
    WHERE id = ?
      AND ativo = TRUE
      AND nivel_acesso IN ('admin', 'gerente')
    LIMIT 1
    `,
    [id]
  );

  return rows[0] || null;
};

module.exports = {
  findManagerByIdentifier,
  findManagerById,
};

