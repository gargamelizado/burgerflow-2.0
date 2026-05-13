/**
 * @file nodeRed.routes.js
<<<<<<< HEAD
 * @description Rotas HTTP para integracao opcional com Node-RED.
=======
 * @description Rotas HTTP da integracao basica com Node-RED.
 * @author BurgerFlow
>>>>>>> 65c17b1 (ok)
 */

import express from 'express';
import nodeRedController from './nodeRed.controller.js';
import { authenticateToken, requirePermission } from '../../middlewares/auth.middleware.js';

const router = express.Router();
<<<<<<< HEAD
const manageIntegrations = requirePermission('gerenciar_configuracoes', 'Acesso negado para integrações.');

router.get('/status', authenticateToken, manageIntegrations, (req, res) => nodeRedController.status(req, res));
router.post('/test', authenticateToken, manageIntegrations, (req, res) => nodeRedController.test(req, res));
=======
const manageIntegrations = requirePermission('ver_relatorios', 'Acesso negado para consultar integrações.');

router.get('/status', authenticateToken, manageIntegrations, (req, res) => nodeRedController.getStatus(req, res));
router.post('/test', authenticateToken, manageIntegrations, (req, res) => nodeRedController.sendTest(req, res));
>>>>>>> 65c17b1 (ok)

export default router;
