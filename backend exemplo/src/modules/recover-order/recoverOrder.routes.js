/**
 * @file recoverOrder.routes.js
 * @description Rotas HTTP da seção Recuperador de Pedido.
 * @author BurgerFlow
 */

import express from 'express';
import recoverOrderController from './recoverOrder.controller.js';

const router = express.Router();

router.get('/', (req, res) => recoverOrderController.listReleased(req, res));
router.get('/:numero', (req, res) => recoverOrderController.findByNumber(req, res));
router.patch('/:id/recuperar', (req, res) => recoverOrderController.recover(req, res));

export default router;
