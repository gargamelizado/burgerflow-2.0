const bcrypt = require('bcrypt');

const userRepository = require('./user.repository');

const niveisPermitidos = ['admin', 'gerente', 'vendedor', 'estoquista', 'cozinha'];

const normalizeBoolean = (value, defaultValue = true) => {
  if (value === undefined || value === null) {
    return defaultValue;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  const normalized = String(value).trim().toLowerCase();
  return ['1', 'true', 'sim', 'yes', 'ativo'].includes(normalized);
};

const validateNivel = (nivel_acesso) => {
  if (!niveisPermitidos.includes(nivel_acesso)) {
    const error = new Error('Nível de acesso inválido.');
    error.statusCode = 400;
    throw error;
  }
};

const list = async () => {
  return userRepository.list();
};

const create = async ({ actorUserId, nome, email, senha, nivel_acesso, ativo }) => {
  const nomeNormalizado = String(nome || '').trim();
  const emailNormalizado = String(email || '').trim().toLowerCase();
  const senhaNormalizada = String(senha || '');
  const nivelNormalizado = String(nivel_acesso || '').trim().toLowerCase();

  if (!nomeNormalizado) {
    const error = new Error('Nome é obrigatório.');
    error.statusCode = 400;
    throw error;
  }

  if (!emailNormalizado) {
    const error = new Error('Email é obrigatório.');
    error.statusCode = 400;
    throw error;
  }

  if (senhaNormalizada.length < 6) {
    const error = new Error('Senha deve ter no mínimo 6 caracteres.');
    error.statusCode = 400;
    throw error;
  }

  validateNivel(nivelNormalizado);

  const userByEmail = await userRepository.findByEmail(emailNormalizado);

  if (userByEmail) {
    const error = new Error('Email já cadastrado.');
    error.statusCode = 409;
    throw error;
  }

  const senha_hash = await bcrypt.hash(senhaNormalizada, 10);
  const created = await userRepository.create({
    nome: nomeNormalizado,
    email: emailNormalizado,
    senha_hash,
    nivel_acesso: nivelNormalizado,
    ativo: normalizeBoolean(ativo, true),
  });

  await userRepository.logAudit({
    usuario_id: actorUserId,
    acao: 'usuario_criado',
    entidade: 'usuarios',
    entidade_id: created.id,
    detalhes: {
      nome: created.nome,
      email: created.email,
      nivel_acesso: created.nivel_acesso,
      ativo: created.ativo,
    },
  });

  return {
    message: 'Usuário criado com sucesso.',
    usuario: created,
  };
};

const update = async (id, { actorUserId, nome, email, nivel_acesso, ativo }) => {
  const userId = Number(id);

  if (!Number.isInteger(userId) || userId <= 0) {
    const error = new Error('ID de usuário inválido.');
    error.statusCode = 400;
    throw error;
  }

  const existing = await userRepository.findById(userId);

  if (!existing) {
    const error = new Error('Usuário não encontrado.');
    error.statusCode = 404;
    throw error;
  }

  const nomeNormalizado = String(nome || '').trim();
  const emailNormalizado = String(email || '').trim().toLowerCase();
  const nivelNormalizado = String(nivel_acesso || '').trim().toLowerCase();

  if (!nomeNormalizado) {
    const error = new Error('Nome é obrigatório.');
    error.statusCode = 400;
    throw error;
  }

  if (!emailNormalizado) {
    const error = new Error('Email é obrigatório.');
    error.statusCode = 400;
    throw error;
  }

  validateNivel(nivelNormalizado);

  const userByEmail = await userRepository.findByEmail(emailNormalizado);
  if (userByEmail && userByEmail.id !== userId) {
    const error = new Error('Email já cadastrado.');
    error.statusCode = 409;
    throw error;
  }

  const updated = await userRepository.update(userId, {
    nome: nomeNormalizado,
    email: emailNormalizado,
    nivel_acesso: nivelNormalizado,
    ativo: normalizeBoolean(ativo, true),
  });

  await userRepository.logAudit({
    usuario_id: actorUserId,
    acao: 'usuario_atualizado',
    entidade: 'usuarios',
    entidade_id: updated.id,
    detalhes: {
      nome: updated.nome,
      email: updated.email,
      nivel_acesso: updated.nivel_acesso,
      ativo: updated.ativo,
    },
  });

  return {
    message: 'Usuário atualizado com sucesso.',
    usuario: updated,
  };
};

const setPassword = async (id, { actorUserId, actorUserLevel, senha }) => {
  const userId = Number(id);

  if (!Number.isInteger(userId) || userId <= 0) {
    const error = new Error('ID de usuário inválido.');
    error.statusCode = 400;
    throw error;
  }

  const senhaNormalizada = String(senha || '');
  if (senhaNormalizada.length < 6) {
    const error = new Error('Senha deve ter no mínimo 6 caracteres.');
    error.statusCode = 400;
    throw error;
  }

  if (actorUserLevel !== 'admin' && Number(actorUserId) !== userId) {
    const error = new Error('Gerente pode alterar apenas a própria senha.');
    error.statusCode = 403;
    throw error;
  }

  const existing = await userRepository.findById(userId);
  if (!existing) {
    const error = new Error('Usuário não encontrado.');
    error.statusCode = 404;
    throw error;
  }

  const senha_hash = await bcrypt.hash(senhaNormalizada, 10);
  await userRepository.updatePassword(userId, senha_hash);

  await userRepository.logAudit({
    usuario_id: actorUserId,
    acao: 'usuario_senha_alterada',
    entidade: 'usuarios',
    entidade_id: userId,
    detalhes: {
      alterado_por: actorUserId,
      nivel: actorUserLevel,
    },
  });

  return {
    message: 'Senha atualizada com sucesso.',
  };
};

const deactivate = async (id, { actorUserId }) => {
  const userId = Number(id);

  if (!Number.isInteger(userId) || userId <= 0) {
    const error = new Error('ID de usuário inválido.');
    error.statusCode = 400;
    throw error;
  }

  if (Number(actorUserId) === userId) {
    const error = new Error('Você não pode desativar o próprio usuário.');
    error.statusCode = 400;
    throw error;
  }

  const existing = await userRepository.findById(userId);
  if (!existing) {
    const error = new Error('Usuário não encontrado.');
    error.statusCode = 404;
    throw error;
  }

  await userRepository.deactivate(userId);

  await userRepository.logAudit({
    usuario_id: actorUserId,
    acao: 'usuario_desativado',
    entidade: 'usuarios',
    entidade_id: userId,
    detalhes: {
      email: existing.email,
      nome: existing.nome,
    },
  });

  return {
    message: 'Usuário desativado com sucesso.',
  };
};

module.exports = {
  list,
  create,
  update,
  setPassword,
  deactivate,
};
