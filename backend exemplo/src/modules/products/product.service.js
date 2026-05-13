/**
 * @file product.service.js
 * @description Service de produtos com validacao de payload e orquestracao de estoque/cadastro.
 * @author BurgerFlow
 */

import productRepository from './product.repository.js';
import { audit } from '../../repositories/audit.repository.js';
import { resolveKitchenStation } from '../../utils/kitchenRouting.js';

class ProductService {
  /**
   * Lista produtos respeitando o perfil de negocio.
   * @param {Object} filters - Filtros da requisicao.
   * @param {string} businessType - Perfil de negocio ativo.
   * @returns {Promise<Array>}
   */
  async list(filters, businessType) {
    return productRepository.findMany({
      businessType,
      includeIngredients: filters.include_ingredients === 'true'
    });
  }

  /**
   * Cria produto e registra auditoria.
   * @param {Object} body - Payload da API.
   * @param {Object} context - Contexto com usuario e perfil.
   * @returns {Promise<Object>}
   */
  async create(body, { userId, businessType }) {
    const payload = this.parseProductPayload(body, businessType);
    const connection = await productRepository.getConnection();
    try {
      const id = await productRepository.create(connection, payload, businessType);
      await audit(connection, userId, 'produto.criado', 'produtos', id, payload);
      return { id, ...payload };
    } finally {
      connection.release();
    }
  }

  /**
   * Atualiza produto e registra auditoria.
   * @param {number|string} id - ID do produto.
   * @param {Object} body - Payload da API.
   * @param {Object} context - Contexto com usuario e perfil.
   * @returns {Promise<Object>}
   */
  async update(id, body, { userId, businessType }) {
    const payload = this.parseProductPayload(body, businessType);
    const connection = await productRepository.getConnection();
    try {
      await productRepository.update(connection, id, payload);
      await audit(connection, userId, 'produto.alterado', 'produtos', Number(id), payload);
      return { message: 'Atualizado com sucesso', produto: { id: Number(id), ...payload } };
    } finally {
      connection.release();
    }
  }

  /**
   * Remove produto preservando historico de vendas.
   * @param {number} productId - ID do produto.
   * @returns {Promise<Object>}
   */
  async delete(productId) {
    if (!Number.isInteger(productId) || productId <= 0) {
      const error = new Error('Produto inválido.');
      error.statusCode = 400;
      throw error;
    }

    const connection = await productRepository.getConnection();
    let transactionStarted = false;
    try {
      await connection.beginTransaction();
      transactionStarted = true;
      const product = await productRepository.findByIdForUpdate(connection, productId);

      if (!product) {
        const error = new Error('Produto não encontrado.');
        error.statusCode = 404;
        throw error;
      }

      await productRepository.detachSaleItems(connection, product);
      await productRepository.delete(connection, productId);
      await connection.commit();
      return { message: 'Produto deletado com sucesso' };
    } catch (error) {
      if (transactionStarted) {
        await connection.rollback().catch(() => null);
      }
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Valida e normaliza o payload de produto.
   * @param {Object} body - Corpo da requisicao.
   * @param {string} businessType - Perfil de negocio ativo.
   * @returns {Object}
   */
  parseProductPayload(body, businessType) {
    const nome = String(body.nome || '').trim();
    const descricao = String(body.descricao || '').trim() || null;
    const categoria = String(body.categoria || '').trim() || null;
    const codigoBarras = String(body.codigo_barras || '').trim();
    const typeAliases = {
      simple: 'simples',
      composed: 'composto',
      sandwich: 'composto',
      sanduiche: 'composto',
      sanduíche: 'composto',
      hamburger: 'composto',
      hamburguer: 'composto',
      hambúrguer: 'composto',
      drink: 'simples',
      dessert: 'simples',
      ingredient: 'ingrediente'
    };
    const rawType = String(body.tipo || body.type || 'simples');
    const normalizedType = typeAliases[rawType] || rawType;
    const tipo = ['simples', 'composto', 'combo', 'producao_interna', 'insumo', 'ingrediente'].includes(normalizedType)
      ? normalizedType
      : 'simples';
    const preco = Number(body.preco);
    const custo = Number(body.custo || 0);
    const extraPrice = Number(body.extra_price || body.preco_adicional || 0);
    const quantidade = Number(body.quantidade);
    const estoqueMinimo = Number(body.estoque_minimo || 0);
    const unidade = String(body.unidade || 'un').trim() || 'un';
    const ativo = body.ativo === undefined ? true : Boolean(body.ativo);
    const estacaoCozinha = resolveKitchenStation({ nome, categoria, tipo, estacao_cozinha: body.estacao_cozinha });

    const validations = [
      [!nome, 'Nome do produto é obrigatório.'],
      [!Number.isFinite(preco) || preco < 0, 'Preço inválido.'],
      [!Number.isFinite(custo) || custo < 0, 'Custo inválido.'],
      [!Number.isFinite(extraPrice) || extraPrice < 0, 'Preço adicional inválido.'],
      [!Number.isFinite(quantidade) || quantidade < 0, 'Estoque atual inválido.'],
      [!Number.isFinite(estoqueMinimo) || estoqueMinimo < 0, 'Estoque mínimo inválido.']
    ];

    const failed = validations.find(([invalid]) => invalid);
    if (failed) {
      const error = new Error(failed[1]);
      error.statusCode = 400;
      throw error;
    }

    return {
      nome,
      descricao,
      categoria,
      codigo_barras: businessType === 'fast_food' ? null : codigoBarras || null,
      tipo,
      preco,
      custo,
      extra_price: extraPrice,
      quantidade,
      estoque_minimo: estoqueMinimo,
      unidade,
      ativo,
      estacao_cozinha: estacaoCozinha
    };
  }
}

export default new ProductService();
