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

module.exports = {
  findByEmail,
};