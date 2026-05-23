const db = require('../../config/db');

const findByEmail = async (email) => {
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
    WHERE email = ?
    LIMIT 1
    `,
    [email]
  );

  return rows[0];
};

const findById = async (id) => {
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
    WHERE id = ?
    LIMIT 1
    `,
    [id]
  );

  return rows[0];
};

const updatePassword = async (id, senha_hash) => {
  await db.query(
    `
    UPDATE usuarios
    SET senha_hash = ?
    WHERE id = ?
    `,
    [senha_hash, id]
  );
};

module.exports = {
  findByEmail,
  findById,
  updatePassword,
};
