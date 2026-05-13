/**
 * @file auth.service.js
 * @description Service de autenticacao e gestao de usuarios.
 * @author BurgerFlow
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import authRepository from './auth.repository.js';
import { env } from '../../config/env.js';
import { allowedAccessLevels } from '../../config/businessRules.js';

class AuthService {
  /**
   * Realiza login validando credenciais e emitindo token JWT.
   * @param {Object} credentials - Credenciais de login.
   * @param {string} credentials.email - Email informado.
   * @param {string} credentials.senha - Senha informada.
   * @returns {Promise<Object>}
   */
  async login({ email, senha }) {
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!normalizedEmail || !senha) {
      const error = new Error('Email e senha são obrigatórios.');
      error.statusCode = 400;
      throw error;
    }

    const user = await authRepository.findActiveByEmail(normalizedEmail);
    const validPassword = user ? await bcrypt.compare(senha, user.senha) : false;

    if (!user || !validPassword) {
      const error = new Error('Credenciais inválidas.');
      error.statusCode = 401;
      throw error;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, nome: user.nome, nivel_acesso: user.nivel_acesso },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    return {
      token,
      user: { id: user.id, nome: user.nome, email: user.email, nivel_acesso: user.nivel_acesso }
    };
  }

  /**
   * Lista usuarios ativos para administradores.
   * @returns {Promise<Array>}
   */
  async listUsers() {
    return authRepository.findActiveUsers();
  }

  /**
   * Cria usuario validando campos obrigatorios e nivel permitido.
   * @param {Object} data - Dados recebidos da API.
   * @returns {Promise<Object>}
   */
  async createUser(data) {
    const normalizedName = data.nome?.trim();
    const normalizedEmail = data.email?.trim().toLowerCase();
    const accessLevel = allowedAccessLevels.includes(data.nivel_acesso) ? data.nivel_acesso : 'vendedor';

    if (!normalizedName || !normalizedEmail || !data.senha) {
      const error = new Error('Nome, email e senha são obrigatórios.');
      error.statusCode = 400;
      throw error;
    }

    const hashedPassword = await bcrypt.hash(data.senha, 10);
    const id = await authRepository.createUser({
      nome: normalizedName,
      email: normalizedEmail,
      senha: hashedPassword,
      nivel_acesso: accessLevel
    });

    return { id, nome: normalizedName, email: normalizedEmail, nivel_acesso: accessLevel };
  }

  /**
   * Atualiza usuario ativo e indica quando o usuario editou a si mesmo.
   * @param {number|string} id - ID do usuario alterado.
   * @param {Object} data - Dados recebidos da API.
   * @param {number|string} currentUserId - Usuario autenticado.
   * @returns {Promise<Object>}
   */
  async updateUser(id, data, currentUserId) {
    const normalizedName = data.nome?.trim();
    const normalizedEmail = data.email?.trim().toLowerCase();
    const accessLevel = allowedAccessLevels.includes(data.nivel_acesso) ? data.nivel_acesso : null;

    if (!normalizedName || !normalizedEmail || !accessLevel) {
      const error = new Error('Nome, email e nível de acesso são obrigatórios.');
      error.statusCode = 400;
      throw error;
    }

    if (data.senha && data.senha.length < 6) {
      const error = new Error('A senha deve ter pelo menos 6 caracteres.');
      error.statusCode = 400;
      throw error;
    }

    const hashedPassword = data.senha ? await bcrypt.hash(data.senha, 10) : null;
    const affectedRows = await authRepository.updateUser(id, {
      nome: normalizedName,
      email: normalizedEmail,
      nivel_acesso: accessLevel,
      senha: hashedPassword
    });

    if (affectedRows === 0) {
      const error = new Error('Usuário não encontrado.');
      error.statusCode = 404;
      throw error;
    }

    return {
      id: Number(id),
      nome: normalizedName,
      email: normalizedEmail,
      nivel_acesso: accessLevel,
      reauthRequired: Number(id) === Number(currentUserId)
    };
  }

  /**
   * Desativa usuario, impedindo autoexclusao.
   * @param {number|string} id - Usuario alvo.
   * @param {number|string} currentUserId - Usuario autenticado.
   * @returns {Promise<Object>}
   */
  async deleteUser(id, currentUserId) {
    if (Number(id) === Number(currentUserId)) {
      const error = new Error('Não é permitido excluir o próprio usuário.');
      error.statusCode = 400;
      throw error;
    }

    const affectedRows = await authRepository.deactivateUser(id);
    if (affectedRows === 0) {
      const error = new Error('Usuário não encontrado.');
      error.statusCode = 404;
      throw error;
    }

    return { message: 'Usuário excluído com sucesso.' };
  }
}

export default new AuthService();
