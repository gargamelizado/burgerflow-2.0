/**
 * @file auth.routes.js
 * @description Rotas HTTP de autenticacao e usuarios.
 * @author BurgerFlow
 */

import express from 'express';
import authController from './auth.controller.js';
import { authenticateToken, requireAdmin } from '../../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/login', (req, res) => authController.login(req, res));
router.get('/verify', authenticateToken, (req, res) => authController.verify(req, res));
router.get('/usuarios', authenticateToken, requireAdmin, (req, res) => authController.listUsers(req, res));
router.post('/register', authenticateToken, requireAdmin, (req, res) => authController.createUser(req, res));
router.put('/usuarios/:id', authenticateToken, requireAdmin, (req, res) => authController.updateUser(req, res));
router.delete('/usuarios/:id', authenticateToken, requireAdmin, (req, res) => authController.deleteUser(req, res));

export default router;
