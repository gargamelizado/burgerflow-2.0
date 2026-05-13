const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const env = require('../../config/env');
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

module.exports = {
  login,
};