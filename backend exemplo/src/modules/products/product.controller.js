/**
 * @file product.controller.js
 * @description Controller HTTP de produtos.
 * @author BurgerFlow
 */

import productService from './product.service.js';

function handleError(res, error, fallback) {
  return res.status(error.statusCode || 500).json({ message: error.message || fallback });
}

class ProductController {
  /**
   * Lista produtos.
   */
  async list(req, res) {
    try {
      const products = await productService.list(req.query, req.businessType);
      return res.json(products);
    } catch (error) {
      return handleError(res, error, 'Erro ao listar produtos.');
    }
  }

  /**
   * Cria produto.
   */
  async create(req, res) {
    try {
      const product = await productService.create(req.body, { userId: req.user.id, businessType: req.businessType });
      return res.json(product);
    } catch (error) {
      return handleError(res, error, 'Erro ao criar produto.');
    }
  }

  /**
   * Atualiza produto.
   */
  async update(req, res) {
    try {
      const product = await productService.update(req.params.id, req.body, { userId: req.user.id, businessType: req.businessType });
      return res.json(product);
    } catch (error) {
      return handleError(res, error, 'Erro ao atualizar produto.');
    }
  }

  /**
   * Remove produto.
   */
  async delete(req, res) {
    try {
      const result = await productService.delete(Number(req.params.id));
      return res.json(result);
    } catch (error) {
      return handleError(res, error, 'Erro ao deletar produto.');
    }
  }
}

export default new ProductController();
