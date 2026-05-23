const db = require('../../config/db');

const sanitizeUser = (row) => {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    nome: row.nome,
    email: row.email,
    nivel_acesso: row.nivel_acesso,
    ativo: Boolean(row.ativo),
    criado_em: row.criado_em,
    atualizado_em: row.atualizado_em,
  };
};

const list = async () => {
  const [rows] = await db.query(
    `
    SELECT
      id,
      nome,
      email,
      nivel_acesso,
      ativo,
      criado_em,
      atualizado_em
    FROM usuarios
    ORDER BY id DESC
    `
  );

  return rows.map(sanitizeUser);
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
      ativo,
      criado_em,
      atualizado_em
    FROM usuarios
    WHERE id = ?
    LIMIT 1
    `,
    [id]
  );

  return rows[0] || null;
};

const findByEmail = async (email) => {
  const [rows] = await db.query(
    `
    SELECT
      id,
      nome,
      email,
      senha_hash,
      nivel_acesso,
      ativo,
      criado_em,
      atualizado_em
    FROM usuarios
    WHERE email = ?
    LIMIT 1
    `,
    [email]
  );

  return rows[0] || null;
};

const create = async ({ nome, email, senha_hash, nivel_acesso, ativo }) => {
  const [result] = await db.query(
    `
    INSERT INTO usuarios (
      nome,
      email,
      senha_hash,
      nivel_acesso,
      ativo
    ) VALUES (?, ?, ?, ?, ?)
    `,
    [nome, email, senha_hash, nivel_acesso, ativo]
  );

  const created = await findById(result.insertId);
  return sanitizeUser(created);
};

const update = async (id, { nome, email, nivel_acesso, ativo }) => {
  await db.query(
    `
    UPDATE usuarios
    SET
      nome = ?,
      email = ?,
      nivel_acesso = ?,
      ativo = ?
    WHERE id = ?
    `,
    [nome, email, nivel_acesso, ativo, id]
  );

  const updated = await findById(id);
  return sanitizeUser(updated);
};

const deactivate = async (id) => {
  await db.query(
    `
    UPDATE usuarios
    SET ativo = FALSE
    WHERE id = ?
    `,
    [id]
  );
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

const logAudit = async ({ usuario_id, acao, entidade, entidade_id, detalhes }) => {
  await db.query(
    `
    INSERT INTO auditoria (
      usuario_id,
      acao,
      entidade,
      entidade_id,
      detalhes
    ) VALUES (?, ?, ?, ?, ?)
    `,
    [
      usuario_id || null,
      acao,
      entidade || null,
      entidade_id || null,
      detalhes ? JSON.stringify(detalhes) : null,
    ]
  );
};

module.exports = {
  list,
  findById,
  findByEmail,
  create,
  update,
  deactivate,
  updatePassword,
  logAudit,
};
