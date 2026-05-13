/**
 * @file auth.middleware.js
 * @description Middlewares compartilhados de autenticacao JWT e permissao por cargo.
 * @author BurgerFlow
 */

import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { hasPermission } from '../config/businessRules.js';

/**
 * Valida o token JWT enviado no header Authorization e injeta o usuario em `req.user`.
 * @param {Object} req - Requisicao HTTP.
 * @param {Object} res - Resposta HTTP.
 * @param {Function} next - Proximo middleware.
 * @returns {Object|void}
 */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Token não fornecido.' });
  }

  try {
    req.user = jwt.verify(token, env.JWT_SECRET);
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Token inválido.' });
  }
}

/**
 * Exige uma permissao do usuario autenticado antes de executar a rota.
 * @param {string} permission - Permissao exigida.
 * @param {string} message - Mensagem retornada quando o acesso e negado.
 * @returns {Function}
 */
export function requirePermission(permission, message = 'Acesso negado.') {
  return (req, res, next) => {
    if (!hasPermission(req.user, permission)) {
      return res.status(403).json({ message });
    }

    next();
  };
}

/**
 * Restringe uma rota para administradores.
 * @param {Object} req - Requisicao HTTP.
 * @param {Object} res - Resposta HTTP.
 * @param {Function} next - Proximo middleware.
 * @returns {Object|void}
 */
export function requireAdmin(req, res, next) {
  if (req.user?.nivel_acesso !== 'admin') {
    return res.status(403).json({ message: 'Acesso negado. Apenas administradores.' });
  }

  next();
}
