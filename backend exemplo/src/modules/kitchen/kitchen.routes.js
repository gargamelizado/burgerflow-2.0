/**
 * @file kitchen.routes.js
 * @description Rotas HTTP do modulo de cozinha/KDS.
 * @author BurgerFlow
 */

import express from 'express';
import kitchenController from './kitchen.controller.js';

const router = express.Router();

router.get('/pedidos', (req, res) => kitchenController.listOrders(req, res));
router.patch('/pedidos/:id/status', (req, res) => kitchenController.updateStatus(req, res));

export default router;
