const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const env = require('../../config/env');
const db = require('../../config/db');
const { logAuditAction } = require('../../services/audit.service');
const authRepository = require('./auth.repository');

const login = async ({ email, senha, password }) => {
  const userPassword = senha || password;

  if (!email || !userPassword) {
    const error = new Error('Email e senha são obrigatórios.');
    error.statusCode = 400;
    throw error;
  }

  const user = await authRepository.findByEmail(email);

  if (!user) {
    const error = new Error('Usuário ou senha inválidos.');
    error.statusCode = 401;
    throw error;
  }

  if (!user.ativo) {
    const error = new Error('Usuário inativo.');
    error.statusCode = 403;
    throw error;
  }

  const passwordMatches = await bcrypt.compare(userPassword, user.senha_hash);

  if (!passwordMatches) {
    const error = new Error('Usuário ou senha inválidos.');
    error.statusCode = 401;
    throw error;
  }

  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      nivel_acesso: user.nivel_acesso,
    },
    env.jwt.secret,
    {
      expiresIn: env.jwt.expiresIn,
    }
  );

  return {
    token,
    usuario: {
      id: user.id,
      nome: user.nome,
      email: user.email,
      nivel_acesso: user.nivel_acesso,
    },
  };
};

const alterarSenha = async ({
  usuario_id,
  senha_atual,
  nova_senha,
  ip_address = null,
}) => {
  const userId = Number(usuario_id);

  if (!Number.isInteger(userId) || userId <= 0) {
    const error = new Error('Usuário autenticado é obrigatório.');
    error.statusCode = 401;
    throw error;
  }

  if (!senha_atual || !nova_senha) {
    const error = new Error('Senha atual e nova senha são obrigatórias.');
    error.statusCode = 400;
    throw error;
  }

  if (String(nova_senha).length < 6) {
    const error = new Error('Nova senha deve ter no mínimo 6 caracteres.');
    error.statusCode = 400;
    throw error;
  }

  const user = await authRepository.findById(userId);

  if (!user || !user.ativo) {
    const error = new Error('Usuário não encontrado ou inativo.');
    error.statusCode = 404;
    throw error;
  }

  const senhaConfere = await bcrypt.compare(senha_atual, user.senha_hash);

  if (!senhaConfere) {
    const error = new Error('Senha atual inválida.');
    error.statusCode = 400;
    throw error;
  }

  const novoHash = await bcrypt.hash(nova_senha, 10);
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();
    await authRepository.updatePassword(userId, novoHash, connection);
    await logAuditAction(
      {
        userId,
        action: 'auth.password_changed',
        resource: 'usuarios',
        details: { resourceId: userId },
        ipAddress: ip_address,
      },
      connection
    );
    await connection.commit();
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.error('[AUTH_PASSWORD_ROLLBACK_ERROR]', rollbackError);
    }
    throw error;
  } finally {
    connection.release();
  }

  return {
    message: 'Senha alterada com sucesso.',
  };
};

module.exports = {
  login,
  alterarSenha,
};
