/**
 * @file auth.controller.js
 * @description Controller de autenticacao e usuarios.
 * @author BurgerFlow
 */

import authService from './auth.service.js';

function handleError(res, error, fallback) {
  const status = error.statusCode || (error.code === 'ER_DUP_ENTRY' ? 409 : 500);
  const message = error.code === 'ER_DUP_ENTRY' ? 'Email já cadastrado.' : error.message || fallback;
  return res.status(status).json({ message });
}

class AuthController {
  /**
   * Autentica usuario e retorna token JWT.
   */
  async login(req, res) {
    try {
      const result = await authService.login(req.body);
      return res.json(result);
    } catch (error) {
      return handleError(res, error, 'Erro ao fazer login.');
    }
  }

  /**
   * Retorna usuario autenticado.
   */
  async verify(req, res) {
    return res.json({ user: req.user });
  }

  /**
   * Lista usuarios ativos.
   */
  async listUsers(req, res) {
    try {
      const users = await authService.listUsers();
      return res.json(users);
    } catch (error) {
      return handleError(res, error, 'Erro ao listar usuários.');
    }
  }

  /**
   * Cria usuario.
   */
  async createUser(req, res) {
    try {
      const user = await authService.createUser(req.body);
      return res.json(user);
    } catch (error) {
      return handleError(res, error, 'Erro ao cadastrar usuário.');
    }
  }

  /**
   * Atualiza usuario.
   */
  async updateUser(req, res) {
    try {
      const user = await authService.updateUser(req.params.id, req.body, req.user.id);
      return res.json(user);
    } catch (error) {
      return handleError(res, error, 'Erro ao atualizar usuário.');
    }
  }

  /**
   * Desativa usuario.
   */
  async deleteUser(req, res) {
    try {
      const result = await authService.deleteUser(req.params.id, req.user.id);
      return res.json(result);
    } catch (error) {
      return handleError(res, error, 'Erro ao excluir usuário.');
    }
  }
}

export default new AuthController();
