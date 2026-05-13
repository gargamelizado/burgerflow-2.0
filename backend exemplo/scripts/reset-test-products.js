/**
 * @file reset-test-products.js
 * @description Limpa produtos/receitas/combos de desenvolvimento e recria a massa de testes fast-food.
 * @author BurgerFlow
 */

import db from '../src/config/db.js';
import { ensureDatabaseSchema } from '../src/bootstrap/ensureSchema.js';

/**
 * Limpa tabelas que dependem diretamente dos produtos.
 * Preserva vendas, caixa e usuarios; itens vendidos ficam com snapshot textual e produto_id nulo.
 * @param {import('mysql2/promise').PoolConnection} connection - Conexao MySQL ativa.
 * @returns {Promise<void>}
 */
async function clearProductCatalog(connection) {
  await connection.query('SET FOREIGN_KEY_CHECKS = 0');
  await connection.beginTransaction();

  try {
    await connection.query('DELETE FROM combo_itens');
    await connection.query('DELETE FROM receitas');
    await connection.query('DELETE FROM codigos_barras');
    await connection.query('DELETE FROM lotes_estoque');
    await connection.query('DELETE FROM detalhes_medicamento');
    await connection.query('DELETE FROM receitas_medicas');
    await connection.query('DELETE FROM compra_itens');
    await connection.query('DELETE FROM movimentacoes_estoque');
    await connection.query('DELETE FROM order_item_customizations');
    await connection.query('UPDATE itens_venda SET produto_id = NULL WHERE produto_id IS NOT NULL');
    await connection.query('DELETE FROM produtos');

    await connection.query('ALTER TABLE produtos AUTO_INCREMENT = 1');
    await connection.query('ALTER TABLE receitas AUTO_INCREMENT = 1');
    await connection.query('ALTER TABLE combo_itens AUTO_INCREMENT = 1');
    await connection.query('ALTER TABLE movimentacoes_estoque AUTO_INCREMENT = 1');
    await connection.query('ALTER TABLE order_item_customizations AUTO_INCREMENT = 1');

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
  }
}

/**
 * Executa reset completo do cardapio de testes usando os seeds oficiais do bootstrap.
 * @returns {Promise<void>}
 */
async function main() {
  await ensureDatabaseSchema();

  const connection = await db.getConnection();

  try {
    await clearProductCatalog(connection);
  } finally {
    connection.release();
  }

  await ensureDatabaseSchema();

  const [[products]] = await db.query('SELECT COUNT(*) AS total FROM produtos');
  const [[recipes]] = await db.query('SELECT COUNT(*) AS total FROM receitas');
  const [[comboItems]] = await db.query('SELECT COUNT(*) AS total FROM combo_itens');

  console.log(`Produtos de teste criados: ${products.total}`);
  console.log(`Itens de receita criados: ${recipes.total}`);
  console.log(`Itens de combo criados: ${comboItems.total}`);

  await db.end();
}

main().catch(async (error) => {
  console.error('Erro ao resetar produtos de teste:', error.message);
  await db.end();
  process.exit(1);
});
