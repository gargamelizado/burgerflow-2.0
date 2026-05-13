/**
 * @file product.routes.js
 * @description Rotas HTTP do modulo de produtos.
 * @author BurgerFlow
 */

import express from 'express';
import productController from './product.controller.js';
import { authenticateToken, requirePermission } from '../../middlewares/auth.middleware.js';

const router = express.Router();
const manageProducts = requirePermission('gerenciar_produtos', 'Acesso negado. Apenas administrador, gerente ou estoquista podem alterar estoque.');

router.get('/', authenticateToken, (req, res) => productController.list(req, res));
router.post('/', authenticateToken, manageProducts, (req, res) => productController.create(req, res));
router.put('/:id', authenticateToken, manageProducts, (req, res) => productController.update(req, res));
router.delete('/:id', authenticateToken, manageProducts, (req, res) => productController.delete(req, res));

export default router;
