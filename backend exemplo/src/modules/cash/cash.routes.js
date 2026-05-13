/**
 * @file cash.routes.js
 * @description Rotas HTTP do modulo de caixa.
 * @author BurgerFlow
 */

import express from 'express';
import cashController from './cash.controller.js';
import { authenticateToken, requirePermission } from '../../middlewares/auth.middleware.js';

const router = express.Router();
const manageCash = requirePermission('gerenciar_caixa', 'Acesso negado para operar caixa.');
const viewReports = requirePermission('ver_relatorios', 'Acesso negado.');

router.get('/aberto', authenticateToken, (req, res) => cashController.getOpen(req, res));
router.post('/abrir', authenticateToken, manageCash, (req, res) => cashController.open(req, res));
router.post('/movimento', authenticateToken, manageCash, (req, res) => cashController.createMovement(req, res));
router.post('/fechar', authenticateToken, manageCash, (req, res) => cashController.close(req, res));
router.get('/:id/relatorio', authenticateToken, viewReports, (req, res) => cashController.getReport(req, res));

export default router;
