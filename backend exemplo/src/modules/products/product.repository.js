/**
 * @file product.repository.js
 * @description Repository de produtos com acesso SQL.
 * @author BurgerFlow
 */

import db from '../../config/db.js';

class ProductRepository {
  /**
   * Lista produtos conforme perfil de negocio.
   * @param {Object} options - Opcoes de filtro.
   * @returns {Promise<Array>}
   */
  async findMany({ businessType, includeIngredients }) {
    const connection = await db.getConnection();
    try {
      const [rows] = await connection.query(
        businessType === 'fast_food'
          ? includeIngredients
            ? "SELECT * FROM produtos WHERE business_type = 'fast_food' AND (ativo = TRUE OR tipo = 'ingrediente') ORDER BY categoria ASC, nome ASC"
            : "SELECT * FROM produtos WHERE ativo = TRUE AND business_type = 'fast_food' ORDER BY categoria ASC, nome ASC"
          : 'SELECT * FROM produtos ORDER BY nome ASC'
      );
      return rows;
    } finally {
      connection.release();
    }
  }

  /**
   * Cria produto no banco.
   * @param {Object} connection - Conexao MySQL ativa.
   * @param {Object} product - Produto normalizado.
   * @param {string} businessType - Perfil de negocio.
   * @returns {Promise<number>}
   */
  async create(connection, product, businessType) {
    const [result] = await connection.query(
      `
        INSERT INTO produtos (
          nome, descricao, categoria, codigo_barras, tipo, preco, custo, extra_price, quantidade,
          estoque_minimo, unidade, ativo, estacao_cozinha, preparation_station, business_type
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        product.nome,
        product.descricao,
        product.categoria,
        product.codigo_barras,
        product.tipo,
        product.preco,
        product.custo,
        product.extra_price,
        product.quantidade,
        product.estoque_minimo,
        product.unidade,
        product.ativo,
        product.estacao_cozinha,
        product.estacao_cozinha,
        businessType
      ]
    );
    return result.insertId;
  }

  /**
   * Atualiza produto existente.
   * @param {Object} connection - Conexao MySQL ativa.
   * @param {number|string} id - ID do produto.
   * @param {Object} product - Produto normalizado.
   * @returns {Promise<void>}
   */
  async update(connection, id, product) {
    await connection.query(
      `
        UPDATE produtos
        SET nome=?, descricao=?, categoria=?, codigo_barras=?, tipo=?, preco=?, custo=?, extra_price=?, quantidade=?,
            estoque_minimo=?, unidade=?, ativo=?, estacao_cozinha=?, preparation_station=?
        WHERE id=?
      `,
      [
        product.nome,
        product.descricao,
        product.categoria,
        product.codigo_barras,
        product.tipo,
        product.preco,
        product.custo,
        product.extra_price,
        product.quantidade,
        product.estoque_minimo,
        product.unidade,
        product.ativo,
        product.estacao_cozinha,
        product.estacao_cozinha,
        id
      ]
    );
  }

  /**
   * Busca produto bloqueando linha para exclusao segura.
   * @param {Object} connection - Conexao MySQL ativa.
   * @param {number} id - ID do produto.
   * @returns {Promise<Object|undefined>}
   */
  async findByIdForUpdate(connection, id) {
    const [products] = await connection.query(
      'SELECT id, nome, categoria FROM produtos WHERE id = ? FOR UPDATE',
      [id]
    );
    return products[0];
  }

  /**
   * Preserva nome/categoria em itens vendidos antes de remover o produto.
   * @param {Object} connection - Conexao MySQL ativa.
   * @param {Object} product - Produto removido.
   * @returns {Promise<void>}
   */
  async detachSaleItems(connection, product) {
    await connection.query(
      `
        UPDATE itens_venda
        SET
          produto_nome = COALESCE(produto_nome, ?),
          categoria = COALESCE(categoria, ?),
          produto_id = NULL
        WHERE produto_id = ?
      `,
      [product.nome, product.categoria, product.id]
    );
  }

  /**
   * Remove produto definitivamente.
   * @param {Object} connection - Conexao MySQL ativa.
   * @param {number} id - ID do produto.
   * @returns {Promise<void>}
   */
  async delete(connection, id) {
    await connection.query('DELETE FROM produtos WHERE id = ?', [id]);
  }

  /**
   * Abre conexao para transacoes do service.
   * @returns {Promise<Object>}
   */
  getConnection() {
    return db.getConnection();
  }
}

export default new ProductRepository();
