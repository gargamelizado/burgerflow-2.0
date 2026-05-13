/**
 * @file ensureSchema.js
 * @description Bootstrap do banco MySQL. Cria/ajusta tabelas, views, colunas e seeds necessarios para o BurgerFlow iniciar.
 * @author BurgerFlow
 */

import db, { ensureDatabaseExists } from '../config/db.js';

const DEFAULT_ADMIN_PASSWORD_HASH = '$2a$10$pcR5e9L0ydjouwzrV5KVJuicBo05/KwjNnWFNTm1UcyfaOfXP4qo.';

/**
 * Verifica se uma tabela existe no database atual.
 * @param {Object} connection - Conexao MySQL ativa.
 * @param {string} tableName - Nome da tabela.
 * @returns {Promise<boolean>}
 */
async function tableExists(connection, tableName) {
  const [rows] = await connection.query(
    `
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
    `,
    [tableName]
  );

  return rows.length > 0;
}

/**
 * Verifica se uma coluna existe em uma tabela.
 * @param {Object} connection - Conexao MySQL ativa.
 * @param {string} tableName - Nome da tabela.
 * @param {string} columnName - Nome da coluna.
 * @returns {Promise<boolean>}
 */
async function columnExists(connection, tableName, columnName) {
  const [rows] = await connection.query(
    `
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
    `,
    [tableName, columnName]
  );

  return rows.length > 0;
}

/**
 * Cria tabela quando ela ainda nao existe.
 * @param {Object} connection - Conexao MySQL ativa.
 * @param {string} tableName - Nome da tabela.
 * @param {string} createSql - SQL completo de criacao.
 * @returns {Promise<void>}
 */
async function ensureTable(connection, tableName, createSql) {
  if (!(await tableExists(connection, tableName))) {
    await connection.query(createSql);
  }
}

/**
 * Adiciona coluna quando ela ainda nao existe.
 * @param {Object} connection - Conexao MySQL ativa.
 * @param {string} tableName - Nome da tabela.
 * @param {string} columnName - Nome da coluna.
 * @param {string} definition - Definicao SQL da coluna.
 * @returns {Promise<void>}
 */
async function ensureColumn(connection, tableName, columnName, definition) {
  if (!(await columnExists(connection, tableName, columnName))) {
    await connection.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

async function ensureNullableColumn(connection, tableName, columnName, definition) {
  const [rows] = await connection.query(
    `
      SELECT IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
    `,
    [tableName, columnName]
  );

  if (rows.length > 0 && rows[0].IS_NULLABLE !== 'YES') {
    await connection.query(`ALTER TABLE ${tableName} MODIFY COLUMN ${columnName} ${definition}`);
  }
}

async function ensureColumnDefinition(connection, tableName, columnName, definition, shouldModify) {
  const [rows] = await connection.query(
    `
      SELECT COLUMN_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
    `,
    [tableName, columnName]
  );

  if (rows.length > 0 && shouldModify(rows[0].COLUMN_TYPE)) {
    await connection.query(`ALTER TABLE ${tableName} MODIFY COLUMN ${columnName} ${definition}`);
  }
}

async function viewExists(connection, viewName) {
  const [rows] = await connection.query(
    `
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.VIEWS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
    `,
    [viewName]
  );

  return rows.length > 0;
}

async function ensureView(connection, viewName, createSql) {
  if (!(await tableExists(connection, viewName)) && !(await viewExists(connection, viewName))) {
    await connection.query(createSql);
  }
}

async function seedBurgerFlowProducts(connection) {
  const [[{ total }]] = await connection.query('SELECT COUNT(*) AS total FROM produtos');

  if (Number(total) > 0) {
    return;
  }

  const products = [
    ['BF Smash Clássico', 'hambúrgueres', 'composto', 24.9, 11.2, 0, 0, 'un', 'chapa'],
    ['BF Cheese Bacon', 'hambúrgueres', 'composto', 29.9, 13.8, 0, 0, 'un', 'chapa'],
    ['BF Duplo Cheddar', 'hambúrgueres', 'composto', 33.9, 16.4, 0, 0, 'un', 'chapa'],
    ['BF Frango Crispy', 'hambúrgueres', 'composto', 27.9, 12.5, 0, 0, 'un', 'fritadeira'],
    ['BF Veggie Burger', 'hambúrgueres', 'composto', 28.9, 13.1, 0, 0, 'un', 'chapa'],
    ['Combo Smash', 'combos', 'combo', 39.9, 19.8, 0, 0, 'un', 'montagem'],
    ['Combo Bacon', 'combos', 'combo', 44.9, 22.6, 0, 0, 'un', 'montagem'],
    ['Combo Duplo', 'combos', 'combo', 49.9, 25.4, 0, 0, 'un', 'montagem'],
    ['Combo Kids Nuggets', 'combos', 'combo', 31.9, 15.2, 0, 0, 'un', 'montagem'],
    ['Batata Pequena', 'acompanhamentos', 'composto', 10.9, 4.1, 0, 0, 'un', 'fritadeira'],
    ['Batata Grande', 'acompanhamentos', 'composto', 14.9, 5.9, 0, 0, 'un', 'fritadeira'],
    ['Nuggets 6 unidades', 'acompanhamentos', 'composto', 15.9, 6.8, 0, 0, 'un', 'fritadeira'],
    ['Refrigerante 300ml', 'bebidas', 'simples', 7.9, 3.2, 120, 20, 'un', 'bebidas'],
    ['Refrigerante 500ml', 'bebidas', 'simples', 9.9, 4.1, 100, 20, 'un', 'bebidas'],
    ['Suco Natural', 'bebidas', 'simples', 11.9, 5.3, 60, 10, 'un', 'bebidas'],
    ['Água Mineral', 'bebidas', 'simples', 5.9, 2.0, 90, 15, 'un', 'bebidas'],
    ['Milkshake Chocolate', 'sobremesas', 'simples', 16.9, 7.4, 45, 8, 'un', 'sobremesa'],
    ['Sundae Caramelo', 'sobremesas', 'simples', 12.9, 5.6, 55, 8, 'un', 'sobremesa'],
    ['Brownie BurgerFlow', 'sobremesas', 'simples', 13.9, 6.2, 40, 6, 'un', 'sobremesa'],
    ['Casquinha Baunilha', 'sobremesas', 'simples', 6.9, 2.8, 70, 10, 'un', 'sobremesa'],
    ['Molho Extra', 'complementos', 'simples', 2.9, 0.7, 120, 20, 'un', 'expedicao']
  ];

  await connection.query(
    `
      INSERT INTO produtos (
        nome, categoria, tipo, preco, custo, quantidade, estoque_minimo,
        unidade, ativo, estacao_cozinha, preparation_station, business_type
      ) VALUES ?
    `,
    [
      products.map(([nome, categoria, tipo, preco, custo, quantidade, estoqueMinimo, unidade, estacao]) => [
        nome,
        categoria,
        tipo,
        preco,
        custo,
        quantidade,
        estoqueMinimo,
        unidade,
        true,
        estacao,
        estacao,
        'fast_food'
      ])
    ]
  );

  const ingredients = [
    ['Ingrediente Pão brioche', 'ingredientes', 0.8, 1200, 120, 'un', 'montagem'],
    ['Ingrediente Carne smash 90g', 'ingredientes', 3.9, 900, 100, 'un', 'chapa'],
    ['Ingrediente Queijo cheddar', 'ingredientes', 1.1, 900, 100, 'un', 'montagem'],
    ['Ingrediente Bacon', 'ingredientes', 1.6, 500, 60, 'un', 'chapa'],
    ['Ingrediente Frango empanado', 'ingredientes', 4.2, 450, 50, 'un', 'fritadeira'],
    ['Ingrediente Burger vegetal', 'ingredientes', 4.5, 260, 30, 'un', 'chapa'],
    ['Ingrediente Batata porção P', 'ingredientes', 2.8, 600, 70, 'un', 'fritadeira'],
    ['Ingrediente Batata porção G', 'ingredientes', 4.1, 450, 60, 'un', 'fritadeira'],
    ['Ingrediente Nuggets unidade', 'ingredientes', 0.95, 1200, 120, 'un', 'fritadeira'],
    ['Ingrediente Alface/tomate', 'ingredientes', 0.7, 500, 50, 'un', 'montagem'],
    ['Ingrediente Molho BurgerFlow', 'ingredientes', 0.45, 600, 60, 'un', 'montagem']
  ];

  await connection.query(
    `
      INSERT INTO produtos (
        nome, categoria, tipo, preco, custo, quantidade, estoque_minimo,
        unidade, ativo, estacao_cozinha, preparation_station, business_type
      ) VALUES ?
    `,
    [
      ingredients.map(([nome, categoria, custo, quantidade, estoqueMinimo, unidade, estacao]) => [
        nome,
        categoria,
        'ingrediente',
        0,
        custo,
        quantidade,
        estoqueMinimo,
        unidade,
        false,
        estacao,
        estacao,
        'fast_food'
      ])
    ]
  );

  const [seededProducts] = await connection.query(
    'SELECT id, nome FROM produtos WHERE business_type = ?',
    ['fast_food']
  );
  const productIdByName = new Map(seededProducts.map((product) => [product.nome, product.id]));
  const recipeRows = [];

  const addRecipe = (productName, items) => {
    const productId = productIdByName.get(productName);
    for (const [ingredientName, quantity] of items) {
      recipeRows.push([productId, productIdByName.get(ingredientName), quantity, 'un']);
    }
  };

  addRecipe('BF Smash Clássico', [
    ['Ingrediente Pão brioche', 1],
    ['Ingrediente Carne smash 90g', 1],
    ['Ingrediente Queijo cheddar', 1],
    ['Ingrediente Alface/tomate', 1],
    ['Ingrediente Molho BurgerFlow', 1]
  ]);
  addRecipe('BF Cheese Bacon', [
    ['Ingrediente Pão brioche', 1],
    ['Ingrediente Carne smash 90g', 1],
    ['Ingrediente Queijo cheddar', 1],
    ['Ingrediente Bacon', 1],
    ['Ingrediente Molho BurgerFlow', 1]
  ]);
  addRecipe('BF Duplo Cheddar', [
    ['Ingrediente Pão brioche', 1],
    ['Ingrediente Carne smash 90g', 2],
    ['Ingrediente Queijo cheddar', 2],
    ['Ingrediente Molho BurgerFlow', 1]
  ]);
  addRecipe('BF Frango Crispy', [
    ['Ingrediente Pão brioche', 1],
    ['Ingrediente Frango empanado', 1],
    ['Ingrediente Queijo cheddar', 1],
    ['Ingrediente Alface/tomate', 1],
    ['Ingrediente Molho BurgerFlow', 1]
  ]);
  addRecipe('BF Veggie Burger', [
    ['Ingrediente Pão brioche', 1],
    ['Ingrediente Burger vegetal', 1],
    ['Ingrediente Queijo cheddar', 1],
    ['Ingrediente Alface/tomate', 1],
    ['Ingrediente Molho BurgerFlow', 1]
  ]);
  addRecipe('Batata Pequena', [['Ingrediente Batata porção P', 1]]);
  addRecipe('Batata Grande', [['Ingrediente Batata porção G', 1]]);
  addRecipe('Nuggets 6 unidades', [['Ingrediente Nuggets unidade', 6]]);

  if (recipeRows.length > 0) {
    await connection.query(
      'INSERT INTO receitas (produto_id, ingrediente_id, quantidade, unidade) VALUES ?',
      [recipeRows]
    );
  }
}

async function seedBurgerFlowCombos(connection) {
  const [[{ totalCombos }]] = await connection.query('SELECT COUNT(*) AS total FROM combo_itens');

  if (Number(totalCombos) > 0) {
    return;
  }

  const [seededProducts] = await connection.query(
    'SELECT id, nome FROM produtos WHERE business_type = ?',
    ['fast_food']
  );
  const productIdByName = new Map(seededProducts.map((product) => [product.nome, product.id]));
  const comboRows = [];

  const addCombo = (comboName, items) => {
    const comboId = productIdByName.get(comboName);
    if (!comboId) {
      console.error(`Combo não encontrado: ${comboName}`);
      return;
    }
    for (const [productName, quantity, group = null] of items) {
      const productId = productIdByName.get(productName);
      if (!productId) {
        console.error(`Produto não encontrado para combo ${comboName}: ${productName}`);
        continue;
      }
      comboRows.push([comboId, productId, quantity, true, group, 0]);
    }
  };

  addCombo('Combo Smash', [['BF Smash Clássico', 1, 'lanche'], ['Batata Pequena', 1, 'acompanhamento'], ['Refrigerante 300ml', 1, 'bebida']]);
  addCombo('Combo Bacon', [['BF Cheese Bacon', 1, 'lanche'], ['Batata Pequena', 1, 'acompanhamento'], ['Refrigerante 300ml', 1, 'bebida']]);
  addCombo('Combo Duplo', [['BF Duplo Cheddar', 1, 'lanche'], ['Batata Grande', 1, 'acompanhamento'], ['Refrigerante 500ml', 1, 'bebida']]);
  addCombo('Combo Kids Nuggets', [['Nuggets 6 unidades', 1, 'principal'], ['Batata Pequena', 1, 'acompanhamento'], ['Suco Natural', 1, 'bebida']]);

  if (comboRows.length > 0) {
    console.log(`Inserindo ${comboRows.length} itens de combo`);
    await connection.query(
      'INSERT INTO combo_itens (combo_id, produto_id, quantidade, obrigatorio, grupo, adicional_preco) VALUES ?',
      [comboRows]
    );
  } else {
    console.log('Nenhum item de combo para inserir');
  }
}

export async function ensureDatabaseSchema() {
  await ensureDatabaseExists();

  const connection = await db.getConnection();

  try {
    await ensureTable(
      connection,
      'usuarios',
      `
        CREATE TABLE usuarios (
          id INT AUTO_INCREMENT PRIMARY KEY,
          nome VARCHAR(160) NOT NULL,
          email VARCHAR(160) NOT NULL UNIQUE,
          senha VARCHAR(255) NOT NULL,
          nivel_acesso ENUM('admin','vendedor','gerente','estoquista','cozinha','entregador','farmaceutico') DEFAULT 'vendedor',
          ativo BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `
    );

    await ensureColumnDefinition(
      connection,
      'usuarios',
      'nivel_acesso',
      "ENUM('admin','vendedor','gerente','estoquista','cozinha','entregador','farmaceutico') DEFAULT 'vendedor'",
      (columnType) => !String(columnType).includes('cozinha') || !String(columnType).includes('entregador') || !String(columnType).includes('farmaceutico')
    );

    await ensureTable(
      connection,
      'produtos',
      `
        CREATE TABLE produtos (
          id INT AUTO_INCREMENT PRIMARY KEY,
          nome VARCHAR(255) NOT NULL,
          categoria VARCHAR(100) NULL,
          codigo_barras VARCHAR(80) NULL,
          preco DECIMAL(10,2) NOT NULL DEFAULT 0,
          quantidade INT NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `
    );

    await ensureTable(
      connection,
      'lojas',
      `
        CREATE TABLE lojas (
          id INT AUTO_INCREMENT PRIMARY KEY,
          nome VARCHAR(180) NOT NULL,
          business_type VARCHAR(40) NOT NULL DEFAULT 'fast_food',
          documento VARCHAR(40) NULL,
          ativo BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `
    );

    await ensureTable(
      connection,
      'categorias',
      `
        CREATE TABLE categorias (
          id INT AUTO_INCREMENT PRIMARY KEY,
          nome VARCHAR(120) NOT NULL,
          business_type VARCHAR(40) NULL,
          ativo BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `
    );

    await ensureTable(
      connection,
      'codigos_barras',
      `
        CREATE TABLE codigos_barras (
          id INT AUTO_INCREMENT PRIMARY KEY,
          produto_id INT NOT NULL,
          codigo VARCHAR(80) NOT NULL UNIQUE,
          tipo VARCHAR(40) NOT NULL DEFAULT 'ean',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `
    );

    await ensureColumn(connection, 'produtos', 'categoria', 'VARCHAR(100) NULL AFTER nome');
    await ensureColumn(connection, 'produtos', 'descricao', 'TEXT NULL AFTER nome');
    await ensureColumn(connection, 'produtos', 'codigo_barras', 'VARCHAR(80) NULL AFTER categoria');
    await ensureColumn(connection, 'produtos', 'tipo', "ENUM('simples','composto','combo','producao_interna','ingrediente') NOT NULL DEFAULT 'simples' AFTER categoria");
    await ensureColumn(connection, 'produtos', 'custo', 'DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER preco');
    await ensureColumn(connection, 'produtos', 'extra_price', 'DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER custo');
    await ensureColumnDefinition(
      connection,
      'produtos',
      'quantidade',
      'DECIMAL(12,3) NOT NULL DEFAULT 0',
      (columnType) => !String(columnType).includes('decimal')
    );
    await ensureColumn(connection, 'produtos', 'estoque_minimo', 'DECIMAL(12,3) NOT NULL DEFAULT 0 AFTER quantidade');
    await ensureColumn(connection, 'produtos', 'unidade', "VARCHAR(20) NOT NULL DEFAULT 'un' AFTER estoque_minimo");
    await ensureColumn(connection, 'produtos', 'ativo', 'BOOLEAN NOT NULL DEFAULT TRUE AFTER unidade');
    await ensureColumn(connection, 'produtos', 'estacao_cozinha', 'VARCHAR(80) NULL AFTER ativo');
    await ensureColumn(connection, 'produtos', 'marca', 'VARCHAR(120) NULL AFTER categoria');
    await ensureColumn(connection, 'produtos', 'fornecedor_id', 'INT NULL AFTER marca');
    await ensureColumn(connection, 'produtos', 'validade', 'DATE NULL AFTER estoque_minimo');
    await ensureColumn(connection, 'produtos', 'permite_venda_vencido', 'BOOLEAN NOT NULL DEFAULT FALSE AFTER validade');
    await ensureColumn(connection, 'produtos', 'preparation_station', 'VARCHAR(80) NULL AFTER estacao_cozinha');
    await ensureColumn(connection, 'produtos', 'business_type', "VARCHAR(40) NOT NULL DEFAULT 'fast_food' AFTER preparation_station");

    await ensureTable(
      connection,
      'vendas',
      `
        CREATE TABLE vendas (
          id INT AUTO_INCREMENT PRIMARY KEY,
          usuario_id INT NULL,
          total DECIMAL(10,2) NOT NULL DEFAULT 0,
          status VARCHAR(50) NOT NULL DEFAULT 'concluida',
          cancelado_em TIMESTAMP NULL DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `
    );

    await ensureColumn(connection, 'vendas', 'usuario_id', 'INT NULL AFTER id');
    await ensureColumn(connection, 'vendas', 'numero_pedido', 'INT NULL AFTER usuario_id');
    await ensureColumn(connection, 'vendas', 'canal', "VARCHAR(40) NOT NULL DEFAULT 'balcao' AFTER numero_pedido");
    await ensureColumn(connection, 'vendas', 'order_channel', "VARCHAR(40) NOT NULL DEFAULT 'counter' AFTER canal");
    await ensureColumn(connection, 'vendas', 'priority', 'INT NOT NULL DEFAULT 0 AFTER order_channel');
    await ensureColumn(connection, 'vendas', 'estimated_ready_at', 'TIMESTAMP NULL AFTER priority');
    await ensureColumn(connection, 'vendas', 'caixa_id', 'INT NULL AFTER canal');
    await ensureColumn(connection, 'vendas', 'total', 'DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER usuario_id');
    await ensureColumn(connection, 'vendas', 'subtotal', 'DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER total');
    await ensureColumn(connection, 'vendas', 'desconto', 'DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER subtotal');
    await ensureColumn(connection, 'vendas', 'forma_pagamento', "VARCHAR(40) NOT NULL DEFAULT 'dinheiro' AFTER desconto");
    await ensureColumn(connection, 'vendas', 'status', `VARCHAR(50) NOT NULL DEFAULT 'concluida' AFTER total`);
    await ensureColumn(connection, 'vendas', 'paid_at', 'TIMESTAMP NULL AFTER status');
    await ensureColumn(connection, 'vendas', 'sent_to_kitchen_at', 'TIMESTAMP NULL AFTER paid_at');
    await ensureColumn(connection, 'vendas', 'ready_at', 'TIMESTAMP NULL AFTER sent_to_kitchen_at');
    await ensureColumn(connection, 'vendas', 'delivered_at', 'TIMESTAMP NULL AFTER ready_at');
    await ensureColumn(connection, 'vendas', 'stock_consumed_at', 'TIMESTAMP NULL AFTER paid_at');
    await ensureColumn(connection, 'vendas', 'retry_count', 'INT NOT NULL DEFAULT 0 AFTER delivered_at');
    await ensureColumn(connection, 'vendas', 'is_recovered', 'BOOLEAN NOT NULL DEFAULT FALSE AFTER retry_count');
    await ensureColumn(connection, 'vendas', 'recovered_from_order_id', 'INT NULL AFTER is_recovered');
    await ensureColumn(connection, 'vendas', 'cancelado_em', 'TIMESTAMP NULL DEFAULT NULL AFTER status');
    await ensureColumn(connection, 'vendas', 'created_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');

    await ensureTable(
      connection,
      'itens_venda',
      `
        CREATE TABLE itens_venda (
          id INT AUTO_INCREMENT PRIMARY KEY,
          venda_id INT NOT NULL,
          produto_id INT NULL,
          produto_nome VARCHAR(255) NULL,
          categoria VARCHAR(100) NULL,
          quantidade INT NOT NULL,
          preco_unitario DECIMAL(10,2) NOT NULL,
          subtotal DECIMAL(10,2) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `
    );

    await ensureColumn(connection, 'itens_venda', 'venda_id', 'INT NOT NULL AFTER id');
    await ensureColumn(connection, 'itens_venda', 'produto_id', 'INT NOT NULL AFTER venda_id');
    await ensureNullableColumn(connection, 'itens_venda', 'produto_id', 'INT NULL');
    await ensureColumn(connection, 'itens_venda', 'produto_nome', 'VARCHAR(255) NULL AFTER produto_id');
    await ensureColumn(connection, 'itens_venda', 'categoria', 'VARCHAR(100) NULL AFTER produto_nome');
    await ensureColumn(connection, 'itens_venda', 'quantidade', 'INT NOT NULL AFTER categoria');
    await ensureColumnDefinition(
      connection,
      'itens_venda',
      'quantidade',
      'INT NOT NULL',
      (columnType) => String(columnType).toLowerCase().includes('unsigned')
    );
    await ensureColumn(connection, 'itens_venda', 'preco_unitario', 'DECIMAL(10,2) NOT NULL AFTER quantidade');
    await ensureColumn(connection, 'itens_venda', 'preco_base', 'DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER preco_unitario');
    await ensureColumn(connection, 'itens_venda', 'subtotal', 'DECIMAL(10,2) NOT NULL AFTER preco_unitario');
    await ensureColumn(connection, 'itens_venda', 'observacoes', 'TEXT NULL AFTER subtotal');
    await ensureColumn(connection, 'itens_venda', 'customization_summary', 'TEXT NULL AFTER observacoes');
    await ensureColumn(connection, 'itens_venda', 'status_preparo', "VARCHAR(40) NOT NULL DEFAULT 'recebido' AFTER subtotal");
    await ensureColumn(connection, 'itens_venda', 'item_status', "VARCHAR(40) NOT NULL DEFAULT 'pending' AFTER status_preparo");
    await ensureColumn(connection, 'itens_venda', 'created_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');

    await ensureTable(
      connection,
      'receitas',
      `
        CREATE TABLE receitas (
          id INT AUTO_INCREMENT PRIMARY KEY,
          produto_id INT NOT NULL,
          ingrediente_id INT NOT NULL,
          quantidade DECIMAL(12,3) NOT NULL,
          unidade VARCHAR(20) NOT NULL DEFAULT 'un',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `
    );
    await ensureColumn(connection, 'receitas', 'required', 'BOOLEAN NOT NULL DEFAULT TRUE AFTER unidade');
    await ensureColumn(connection, 'receitas', 'removable', 'BOOLEAN NOT NULL DEFAULT TRUE AFTER required');
    await ensureColumn(connection, 'receitas', 'allow_extra', 'BOOLEAN NOT NULL DEFAULT TRUE AFTER removable');
    await ensureColumn(connection, 'receitas', 'extra_price', 'DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER allow_extra');
    await ensureColumn(connection, 'receitas', 'updated_at', 'DATETIME NULL AFTER created_at');

    await ensureTable(
      connection,
      'combo_itens',
      `
        CREATE TABLE combo_itens (
          id INT AUTO_INCREMENT PRIMARY KEY,
          combo_id INT NOT NULL,
          produto_id INT NOT NULL,
          quantidade DECIMAL(12,3) NOT NULL DEFAULT 1,
          obrigatorio BOOLEAN NOT NULL DEFAULT TRUE,
          grupo VARCHAR(80) NULL,
          adicional_preco DECIMAL(10,2) NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `
    );

    await ensureTable(
      connection,
      'movimentacoes_estoque',
      `
        CREATE TABLE movimentacoes_estoque (
          id INT AUTO_INCREMENT PRIMARY KEY,
          produto_id INT NOT NULL,
          venda_id INT NULL,
          usuario_id INT NULL,
          tipo VARCHAR(40) NOT NULL,
          quantidade DECIMAL(12,3) NOT NULL,
          custo_unitario DECIMAL(10,2) NULL,
          lote VARCHAR(80) NULL,
          validade DATE NULL,
          motivo TEXT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `
    );
    await ensureColumnDefinition(
      connection,
      'movimentacoes_estoque',
      'quantidade',
      'DECIMAL(12,3) NOT NULL',
      (columnType) => {
        const normalizedType = String(columnType).toLowerCase();
        return normalizedType.includes('unsigned') || !normalizedType.includes('decimal(12,3)');
      }
    );

    await ensureTable(
      connection,
      'order_item_customizations',
      `
        CREATE TABLE order_item_customizations (
          id INT AUTO_INCREMENT PRIMARY KEY,
          order_item_id INT NOT NULL,
          ingrediente_id INT NOT NULL,
          type VARCHAR(40) NOT NULL,
          quantity DECIMAL(12,3) NOT NULL DEFAULT 1,
          price_delta DECIMAL(10,2) NOT NULL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `
    );

    await ensureTable(
      connection,
      'caixas',
      `
        CREATE TABLE caixas (
          id INT AUTO_INCREMENT PRIMARY KEY,
          usuario_abertura_id INT NULL,
          usuario_fechamento_id INT NULL,
          status VARCHAR(40) NOT NULL DEFAULT 'aberto',
          valor_abertura DECIMAL(10,2) NOT NULL DEFAULT 0,
          valor_esperado DECIMAL(10,2) NOT NULL DEFAULT 0,
          valor_declarado DECIMAL(10,2) NULL,
          diferenca DECIMAL(10,2) NULL,
          aberto_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          fechado_em TIMESTAMP NULL
        )
      `
    );
    await ensureColumn(connection, 'caixas', 'justificativa_diferenca', 'TEXT NULL AFTER diferenca');
    await ensureColumn(connection, 'caixas', 'observacao', 'TEXT NULL AFTER justificativa_diferenca');

    await ensureTable(
      connection,
      'caixa_movimentos',
      `
        CREATE TABLE caixa_movimentos (
          id INT AUTO_INCREMENT PRIMARY KEY,
          caixa_id INT NOT NULL,
          usuario_id INT NULL,
          tipo VARCHAR(40) NOT NULL,
          valor DECIMAL(10,2) NOT NULL,
          observacao TEXT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `
    );

    await ensureTable(
      connection,
      'pagamentos',
      `
        CREATE TABLE pagamentos (
          id INT AUTO_INCREMENT PRIMARY KEY,
          venda_id INT NOT NULL,
          metodo VARCHAR(40) NOT NULL,
          valor DECIMAL(10,2) NOT NULL,
          status VARCHAR(40) NOT NULL DEFAULT 'aprovado',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `
    );
    await ensureColumn(connection, 'pagamentos', 'caixa_id', 'INT NULL AFTER venda_id');
    await ensureColumn(connection, 'pagamentos', 'qr_code', 'VARCHAR(180) NULL AFTER status');
    await ensureColumn(connection, 'pagamentos', 'pix_code', 'TEXT NULL AFTER qr_code');
    await ensureColumn(connection, 'pagamentos', 'troco', 'DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER valor');
    await ensureColumn(connection, 'pagamentos', 'valor_recebido', 'DECIMAL(10,2) NULL AFTER troco');
    await ensureColumn(connection, 'pagamentos', 'provider', 'VARCHAR(60) NULL AFTER pix_code');
    await ensureColumn(connection, 'pagamentos', 'external_reference', 'VARCHAR(120) NULL AFTER provider');
    await ensureColumn(connection, 'pagamentos', 'expires_at', 'DATETIME NULL AFTER external_reference');
    await ensureColumn(connection, 'pagamentos', 'expired_at', 'DATETIME NULL AFTER expires_at');

    await ensureTable(
      connection,
      'pedidos_cozinha',
      `
        CREATE TABLE pedidos_cozinha (
          id INT AUTO_INCREMENT PRIMARY KEY,
          venda_id INT NOT NULL,
          estacao VARCHAR(80) NOT NULL DEFAULT 'expedicao',
          status VARCHAR(40) NOT NULL DEFAULT 'recebido',
          prioridade INT NOT NULL DEFAULT 0,
          iniciado_em TIMESTAMP NULL,
          pronto_em TIMESTAMP NULL,
          entregue_em TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `
    );

    await ensureColumn(connection, 'pedidos_cozinha', 'saiu_para_entrega_em', 'TIMESTAMP NULL AFTER pronto_em');

    await ensureTable(
      connection,
      'clientes',
      `
        CREATE TABLE clientes (
          id INT AUTO_INCREMENT PRIMARY KEY,
          nome VARCHAR(160) NOT NULL,
          telefone VARCHAR(40) NULL,
          email VARCHAR(160) NULL,
          documento VARCHAR(40) NULL,
          pontos INT NOT NULL DEFAULT 0,
          endereco TEXT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `
    );

    await ensureTable(
      connection,
      'promocoes',
      `
        CREATE TABLE promocoes (
          id INT AUTO_INCREMENT PRIMARY KEY,
          nome VARCHAR(160) NOT NULL,
          codigo VARCHAR(80) NULL,
          tipo_desconto VARCHAR(20) NOT NULL DEFAULT 'fixo',
          valor_desconto DECIMAL(10,2) NOT NULL DEFAULT 0,
          ativo BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `
    );

    await ensureTable(
      connection,
      'fornecedores',
      `
        CREATE TABLE fornecedores (
          id INT AUTO_INCREMENT PRIMARY KEY,
          nome VARCHAR(180) NOT NULL,
          cnpj VARCHAR(40) NULL,
          telefone VARCHAR(40) NULL,
          email VARCHAR(160) NULL,
          endereco TEXT NULL,
          laboratorio BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `
    );

    await ensureTable(
      connection,
      'compras',
      `
        CREATE TABLE compras (
          id INT AUTO_INCREMENT PRIMARY KEY,
          fornecedor_id INT NULL,
          usuario_id INT NULL,
          status VARCHAR(40) NOT NULL DEFAULT 'recebida',
          total DECIMAL(10,2) NOT NULL DEFAULT 0,
          observacao TEXT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `
    );

    await ensureTable(
      connection,
      'compra_itens',
      `
        CREATE TABLE compra_itens (
          id INT AUTO_INCREMENT PRIMARY KEY,
          compra_id INT NOT NULL,
          produto_id INT NOT NULL,
          quantidade DECIMAL(12,3) NOT NULL,
          custo_unitario DECIMAL(10,2) NOT NULL DEFAULT 0,
          lote VARCHAR(80) NULL,
          validade DATE NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `
    );

    await ensureTable(
      connection,
      'lotes_estoque',
      `
        CREATE TABLE lotes_estoque (
          id INT AUTO_INCREMENT PRIMARY KEY,
          produto_id INT NOT NULL,
          fornecedor_id INT NULL,
          lote VARCHAR(80) NOT NULL,
          validade DATE NOT NULL,
          quantidade DECIMAL(12,3) NOT NULL DEFAULT 0,
          custo_unitario DECIMAL(10,2) NOT NULL DEFAULT 0,
          bloqueado BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `
    );

    await ensureTable(
      connection,
      'detalhes_medicamento',
      `
        CREATE TABLE detalhes_medicamento (
          id INT AUTO_INCREMENT PRIMARY KEY,
          produto_id INT NOT NULL UNIQUE,
          principio_ativo VARCHAR(180) NULL,
          registro_anvisa VARCHAR(80) NULL,
          laboratorio VARCHAR(160) NULL,
          tipo_medicamento VARCHAR(60) NOT NULL DEFAULT 'comum',
          tarja VARCHAR(40) NOT NULL DEFAULT 'sem_tarja',
          exige_receita BOOLEAN NOT NULL DEFAULT FALSE,
          controlado BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `
    );

    await ensureTable(
      connection,
      'receitas_medicas',
      `
        CREATE TABLE receitas_medicas (
          id INT AUTO_INCREMENT PRIMARY KEY,
          cliente_id INT NULL,
          paciente_nome VARCHAR(180) NOT NULL,
          paciente_cpf VARCHAR(40) NULL,
          medico_nome VARCHAR(180) NOT NULL,
          medico_crm VARCHAR(60) NOT NULL,
          data_receita DATE NOT NULL,
          tipo_receita VARCHAR(80) NOT NULL,
          arquivo_url TEXT NULL,
          venda_id INT NULL,
          usuario_id INT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `
    );

    await ensureTable(
      connection,
      'card_terminals',
      `
        CREATE TABLE card_terminals (
          id INT AUTO_INCREMENT PRIMARY KEY,
          store_id INT NULL,
          name VARCHAR(120) NOT NULL,
          provider VARCHAR(60) NOT NULL,
          terminal_id VARCHAR(120) NULL,
          serial_number VARCHAR(120) NULL,
          status VARCHAR(40) NOT NULL DEFAULT 'active',
          last_seen_at TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `
    );

    await ensureTable(
      connection,
      'card_transactions',
      `
        CREATE TABLE card_transactions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          payment_id INT NULL,
          order_id INT NULL,
          store_id INT NULL,
          cash_register_id INT NULL,
          operator_id INT NULL,
          card_terminal_id INT NULL,
          provider VARCHAR(60) NOT NULL,
          terminal_id VARCHAR(120) NULL,
          transaction_id VARCHAR(120) NULL,
          authorization_code VARCHAR(80) NULL,
          nsu VARCHAR(80) NULL,
          brand VARCHAR(60) NULL,
          installments INT NOT NULL DEFAULT 1,
          amount DECIMAL(10,2) NOT NULL,
          method VARCHAR(40) NOT NULL,
          card_last4 VARCHAR(8) NULL,
          acquirer_response_code VARCHAR(40) NULL,
          acquirer_message TEXT NULL,
          receipt_customer TEXT NULL,
          receipt_merchant TEXT NULL,
          status VARCHAR(40) NOT NULL DEFAULT 'pending',
          raw_request JSON NULL,
          raw_response JSON NULL,
          requested_at TIMESTAMP NULL,
          approved_at TIMESTAMP NULL,
          cancelled_at TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `
    );

    await ensureTable(
      connection,
      'delivery_orders',
      `
        CREATE TABLE delivery_orders (
          id INT AUTO_INCREMENT PRIMARY KEY,
          order_id INT NOT NULL,
          customer_name VARCHAR(180) NULL,
          customer_phone VARCHAR(40) NULL,
          delivery_address TEXT NULL,
          address_reference TEXT NULL,
          delivery_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
          delivery_distance DECIMAL(10,2) NULL,
          delivery_estimated_time INT NULL,
          courier_name VARCHAR(180) NULL,
          courier_phone VARCHAR(40) NULL,
          status VARCHAR(40) NOT NULL DEFAULT 'received',
          marketplace_name VARCHAR(80) NULL,
          marketplace_order_id VARCHAR(120) NULL,
          estimated_delivery_at TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `
    );

    await ensureTable(
      connection,
      'drive_thru_orders',
      `
        CREATE TABLE drive_thru_orders (
          id INT AUTO_INCREMENT PRIMARY KEY,
          order_id INT NOT NULL,
          car_identifier VARCHAR(80) NULL,
          arrived_at TIMESTAMP NULL,
          order_started_at TIMESTAMP NULL,
          paid_at TIMESTAMP NULL,
          ready_at TIMESTAMP NULL,
          delivered_at TIMESTAMP NULL,
          total_time_seconds INT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `
    );

    await ensureTable(
      connection,
      'kitchen_order_items',
      `
        CREATE TABLE kitchen_order_items (
          id INT AUTO_INCREMENT PRIMARY KEY,
          order_id INT NOT NULL,
          order_item_id INT NULL,
          station VARCHAR(80) NOT NULL,
          status VARCHAR(40) NOT NULL DEFAULT 'received',
          started_at TIMESTAMP NULL,
          finished_at TIMESTAMP NULL,
          prepared_by INT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `
    );

    await ensureTable(
      connection,
      'order_status_history',
      `
        CREATE TABLE order_status_history (
          id INT AUTO_INCREMENT PRIMARY KEY,
          order_id INT NOT NULL,
          old_status VARCHAR(60) NULL,
          new_status VARCHAR(60) NOT NULL,
          user_id INT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `
    );
    await ensureColumn(connection, 'order_status_history', 'reason', 'TEXT NULL AFTER user_id');

    await ensureTable(
      connection,
      'customer_display_queue',
      `
        CREATE TABLE customer_display_queue (
          id INT AUTO_INCREMENT PRIMARY KEY,
          order_id INT NOT NULL,
          order_number INT NOT NULL,
          display_status VARCHAR(40) NOT NULL DEFAULT 'preparing',
          called_at TIMESTAMP NULL,
          completed_at TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `
    );

    await ensureTable(
      connection,
      'marketplace_orders',
      `
        CREATE TABLE marketplace_orders (
          id INT AUTO_INCREMENT PRIMARY KEY,
          order_id INT NULL,
          provider VARCHAR(80) NOT NULL DEFAULT 'ifood_mock',
          external_id VARCHAR(120) NULL,
          status VARCHAR(40) NOT NULL DEFAULT 'received',
          payload JSON NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `
    );

    await ensureTable(
      connection,
      'configuracoes',
      `
        CREATE TABLE configuracoes (
          id INT AUTO_INCREMENT PRIMARY KEY,
          chave VARCHAR(120) NOT NULL UNIQUE,
          valor TEXT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `
    );

    await ensureTable(
      connection,
      'auditoria',
      `
        CREATE TABLE auditoria (
          id INT AUTO_INCREMENT PRIMARY KEY,
          usuario_id INT NULL,
          acao VARCHAR(120) NOT NULL,
          entidade VARCHAR(120) NULL,
          entidade_id INT NULL,
          dados JSON NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `
    );

    await ensureTable(
      connection,
      'order_cancellations',
      `
        CREATE TABLE order_cancellations (
          id INT AUTO_INCREMENT PRIMARY KEY,
          order_id INT NOT NULL,
          operador_id INT NULL,
          motivo TEXT NOT NULL,
          criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `
    );

    await ensureTable(
      connection,
      'operator_logs',
      `
        CREATE TABLE operator_logs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          operador_id INT NULL,
          acao VARCHAR(120) NOT NULL,
          referencia_id INT NULL,
          descricao TEXT NULL,
          criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `
    );

    await connection.query(
      `
        INSERT INTO usuarios (nome, email, senha, nivel_acesso, ativo)
        VALUES ('Administrador', 'admin@estoque.com', ?, 'admin', TRUE)
        ON DUPLICATE KEY UPDATE
          senha = VALUES(senha),
          nivel_acesso = 'admin',
          ativo = TRUE
      `,
      [DEFAULT_ADMIN_PASSWORD_HASH]
    );

    await connection.query(`
      INSERT INTO configuracoes (chave, valor) VALUES
        ('nome_sistema', 'BurgerFlow POS'),
        ('slogan', 'Venda rapido. Produza certo. Controle tudo.'),
        ('venda_sem_estoque', 'false'),
        ('limite_desconto', '50'),
        ('usar_cozinha', 'true'),
        ('usar_delivery', 'true'),
        ('exigir_caixa_aberto', 'true'),
        ('limite_alerta_dinheiro', '300'),
        ('limite_bloqueio_dinheiro', '800'),
        ('limite_alerta_dinheiro_retail_pharma', '500'),
        ('limite_bloqueio_dinheiro_retail_pharma', '3000'),
        ('bloquear_venda_vencido', 'true')
      ON DUPLICATE KEY UPDATE valor = VALUES(valor)
    `);

    await connection.query("UPDATE produtos SET estacao_cozinha = 'expedicao' WHERE estacao_cozinha = 'balcao'");
    await connection.query("UPDATE produtos SET preparation_station = 'expedicao' WHERE preparation_station = 'balcao'");
    await connection.query("UPDATE pedidos_cozinha SET estacao = 'expedicao' WHERE estacao = 'balcao'");
    await connection.query("UPDATE kitchen_order_items SET station = 'expedicao' WHERE station = 'balcao'");

    await seedBurgerFlowProducts(connection);
    await seedBurgerFlowCombos(connection);

    await ensureView(
      connection,
      'products',
      `
        CREATE VIEW products AS
        SELECT
          id,
          nome,
          categoria,
          preco,
          custo,
          ativo,
          created_at AS criado_em
        FROM produtos
      `
    );

    await ensureView(
      connection,
      'orders',
      `
        CREATE VIEW orders AS
        SELECT
          id,
          numero_pedido,
          status,
          canal AS tipo_pedido,
          total AS valor_total,
          usuario_id AS operador_id,
          created_at AS criado_em
        FROM vendas
      `
    );

    await ensureView(
      connection,
      'order_items',
      `
        CREATE VIEW order_items AS
        SELECT
          id,
          venda_id AS order_id,
          produto_id AS product_id,
          quantidade,
          preco_unitario AS preco,
          NULL AS observacao
        FROM itens_venda
      `
    );

    await ensureView(
      connection,
      'cash_registers',
      `
        CREATE VIEW cash_registers AS
        SELECT
          id,
          usuario_abertura_id AS operador_id,
          valor_abertura,
          valor_declarado AS valor_fechamento,
          CASE WHEN status = 'aberto' THEN 'open' ELSE 'closed' END AS status,
          aberto_em,
          fechado_em
        FROM caixas
      `
    );

    await ensureView(
      connection,
      'cash_movements',
      `
        CREATE VIEW cash_movements AS
        SELECT
          id,
          caixa_id AS cash_register_id,
          CASE
            WHEN tipo = 'sangria' THEN 'sangria'
            WHEN tipo = 'suprimento' THEN 'suprimento'
            WHEN tipo = 'estorno' THEN 'estorno'
            ELSE tipo
          END AS tipo,
          valor,
          observacao AS descricao,
          created_at AS criado_em
        FROM caixa_movimentos
      `
    );

    await ensureView(
      connection,
      'payments',
      `
        CREATE VIEW payments AS
        SELECT
          id,
          venda_id AS order_id,
          caixa_id AS cash_register_id,
          metodo AS tipo,
          valor,
          status,
          created_at AS criado_em
        FROM pagamentos
      `
    );

    await ensureView(
      connection,
      'users',
      `
        CREATE VIEW users AS
        SELECT
          id,
          nome,
          nivel_acesso AS perfil,
          ativo,
          created_at AS criado_em
        FROM usuarios
      `
    );
  } finally {
    connection.release();
  }
}
