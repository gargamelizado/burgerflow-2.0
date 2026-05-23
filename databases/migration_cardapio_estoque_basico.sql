USE burger_flow_2_0;

DROP PROCEDURE IF EXISTS add_column_if_missing;
DROP PROCEDURE IF EXISTS drop_column_if_present;

DELIMITER //

CREATE PROCEDURE add_column_if_missing(
  IN table_name_param VARCHAR(64),
  IN column_name_param VARCHAR(64),
  IN column_definition_param TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = table_name_param
      AND column_name = column_name_param
  ) THEN
    SET @alter_sql = CONCAT(
      'ALTER TABLE `',
      table_name_param,
      '` ADD COLUMN ',
      column_definition_param
    );
    PREPARE alter_stmt FROM @alter_sql;
    EXECUTE alter_stmt;
    DEALLOCATE PREPARE alter_stmt;
  END IF;
END//

CREATE PROCEDURE drop_column_if_present(
  IN table_name_param VARCHAR(64),
  IN column_name_param VARCHAR(64)
)
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = table_name_param
      AND column_name = column_name_param
  ) THEN
    SET @alter_sql = CONCAT(
      'ALTER TABLE `',
      table_name_param,
      '` DROP COLUMN `',
      column_name_param,
      '`'
    );
    PREPARE alter_stmt FROM @alter_sql;
    EXECUTE alter_stmt;
    DEALLOCATE PREPARE alter_stmt;
  END IF;
END//

DELIMITER ;

CALL add_column_if_missing('itens', 'preco_venda', '`preco_venda` DECIMAL(10,2) NULL AFTER `categoria`');
CALL add_column_if_missing('itens', 'aparece_cardapio', '`aparece_cardapio` BOOLEAN NOT NULL DEFAULT TRUE AFTER `ativo`');
CALL add_column_if_missing('itens', 'created_at', '`created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER `aparece_cardapio`');
CALL add_column_if_missing('itens', 'updated_at', '`updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`');

SET @has_itens_preco = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'itens'
    AND column_name = 'preco'
);
SET @sql_itens_preco = IF(
  @has_itens_preco > 0,
  'UPDATE itens SET preco_venda = COALESCE(preco_venda, preco) WHERE preco_venda IS NULL',
  'SELECT 1'
);
PREPARE stmt_itens_preco FROM @sql_itens_preco;
EXECUTE stmt_itens_preco;
DEALLOCATE PREPARE stmt_itens_preco;

UPDATE itens
SET aparece_cardapio = CASE WHEN tipo = 'INGREDIENTE' THEN FALSE ELSE TRUE END,
    preco_venda = CASE WHEN tipo = 'INGREDIENTE' THEN NULL ELSE preco_venda END
WHERE tipo IN ('INGREDIENTE', 'PRODUTO', 'COMBO', 'PROMOCAO');

CALL drop_column_if_present('itens', 'preco');
CALL drop_column_if_present('itens', 'custo');
CALL drop_column_if_present('itens', 'criado_em');
CALL drop_column_if_present('itens', 'atualizado_em');

CALL add_column_if_missing('estoque_ingredientes', 'tipo_entrada', '`tipo_entrada` ENUM(''cx'', ''pacote'', ''medida'') NOT NULL DEFAULT ''medida'' AFTER `ingrediente_id`');
CALL add_column_if_missing('estoque_ingredientes', 'quantidade_entrada', '`quantidade_entrada` DECIMAL(12,3) NOT NULL DEFAULT 0.000 AFTER `tipo_entrada`');
CALL add_column_if_missing('estoque_ingredientes', 'pacotes_por_caixa', '`pacotes_por_caixa` DECIMAL(12,3) NULL AFTER `quantidade_entrada`');
CALL add_column_if_missing('estoque_ingredientes', 'quantidade_por_pacote', '`quantidade_por_pacote` DECIMAL(12,3) NULL AFTER `pacotes_por_caixa`');
CALL add_column_if_missing('estoque_ingredientes', 'unidade_medida', '`unidade_medida` ENUM(''gr'', ''kg'', ''ml'', ''li'') NOT NULL DEFAULT ''gr'' AFTER `quantidade_por_pacote`');
CALL add_column_if_missing('estoque_ingredientes', 'quantidade_total_base', '`quantidade_total_base` DECIMAL(12,3) NOT NULL DEFAULT 0.000 AFTER `unidade_medida`');
CALL add_column_if_missing('estoque_ingredientes', 'unidade_base', '`unidade_base` ENUM(''gr'', ''ml'') NOT NULL DEFAULT ''gr'' AFTER `quantidade_total_base`');

SET @has_estoque_quantidade = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'estoque_ingredientes'
    AND column_name = 'quantidade'
);
SET @sql_estoque_quantidade = IF(
  @has_estoque_quantidade > 0,
  'UPDATE estoque_ingredientes
   SET quantidade_entrada = CASE
         WHEN quantidade_entrada > 0 THEN quantidade_entrada
         WHEN quantidade > 0 THEN quantidade
         WHEN quantidade_total > 0 THEN quantidade_total
         ELSE 0
       END,
       unidade_medida = CASE unidade
         WHEN ''kg'' THEN ''kg''
         WHEN ''g'' THEN ''gr''
         WHEN ''gr'' THEN ''gr''
         WHEN ''l'' THEN ''li''
         WHEN ''li'' THEN ''li''
         WHEN ''ml'' THEN ''ml''
         ELSE unidade_medida
       END',
  'SELECT 1'
);
PREPARE stmt_estoque_quantidade FROM @sql_estoque_quantidade;
EXECUTE stmt_estoque_quantidade;
DEALLOCATE PREPARE stmt_estoque_quantidade;

UPDATE estoque_ingredientes
SET quantidade_total_base = CASE unidade_medida
      WHEN 'kg' THEN quantidade_entrada * 1000
      WHEN 'li' THEN quantidade_entrada * 1000
      ELSE quantidade_entrada
    END,
    unidade_base = CASE unidade_medida
      WHEN 'ml' THEN 'ml'
      WHEN 'li' THEN 'ml'
      ELSE 'gr'
    END
WHERE quantidade_total_base = 0;

CALL drop_column_if_present('estoque_ingredientes', 'custo_compra');
CALL drop_column_if_present('estoque_ingredientes', 'quantidade');
CALL drop_column_if_present('estoque_ingredientes', 'unidade');
CALL drop_column_if_present('estoque_ingredientes', 'quantidade_caixas');
CALL drop_column_if_present('estoque_ingredientes', 'embalagens_por_caixa');
CALL drop_column_if_present('estoque_ingredientes', 'unidades_por_embalagem');
CALL drop_column_if_present('estoque_ingredientes', 'quantidade_total');
CALL drop_column_if_present('estoque_ingredientes', 'custo_unitario');
CALL drop_column_if_present('estoque_ingredientes', 'estoque_minimo');
CALL drop_column_if_present('estoque_ingredientes', 'preco_compra');
CALL drop_column_if_present('estoque_ingredientes', 'caixa');
CALL drop_column_if_present('estoque_ingredientes', 'quantidade_por_embalagem');
CALL drop_column_if_present('estoque_ingredientes', 'validade');

CALL add_column_if_missing('produto_ingredientes', 'unidade_usada', '`unidade_usada` ENUM(''gr'', ''kg'', ''ml'', ''li'') NOT NULL DEFAULT ''gr'' AFTER `quantidade_usada`');
CALL add_column_if_missing('produto_ingredientes', 'quantidade_usada_base', '`quantidade_usada_base` DECIMAL(12,3) NOT NULL DEFAULT 0.000 AFTER `unidade_usada`');
CALL add_column_if_missing('produto_ingredientes', 'unidade_base', '`unidade_base` ENUM(''gr'', ''ml'') NOT NULL DEFAULT ''gr'' AFTER `quantidade_usada_base`');

SET @has_produto_ingredientes_unidade = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'produto_ingredientes'
    AND column_name = 'unidade'
);
SET @sql_produto_ingredientes_unidade = IF(
  @has_produto_ingredientes_unidade > 0,
  'UPDATE produto_ingredientes
   SET unidade_usada = CASE unidade
         WHEN ''kg'' THEN ''kg''
         WHEN ''g'' THEN ''gr''
         WHEN ''gr'' THEN ''gr''
         WHEN ''l'' THEN ''li''
         WHEN ''li'' THEN ''li''
         WHEN ''ml'' THEN ''ml''
         ELSE unidade_usada
       END',
  'SELECT 1'
);
PREPARE stmt_produto_ingredientes_unidade FROM @sql_produto_ingredientes_unidade;
EXECUTE stmt_produto_ingredientes_unidade;
DEALLOCATE PREPARE stmt_produto_ingredientes_unidade;

UPDATE produto_ingredientes
SET quantidade_usada_base = CASE unidade_usada
      WHEN 'kg' THEN quantidade_usada * 1000
      WHEN 'li' THEN quantidade_usada * 1000
      ELSE quantidade_usada
    END,
    unidade_base = CASE unidade_usada
      WHEN 'ml' THEN 'ml'
      WHEN 'li' THEN 'ml'
      ELSE 'gr'
    END
WHERE quantidade_usada_base = 0;

CALL drop_column_if_present('produto_ingredientes', 'unidade');

CALL add_column_if_missing('pedido_itens', 'desconto', '`desconto` DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER `preco_unitario`');
CALL drop_column_if_present('pedido_itens', 'nome');
CALL drop_column_if_present('pedido_itens', 'tipo');

CALL add_column_if_missing('movimentacoes_estoque', 'unidade_base', '`unidade_base` ENUM(''gr'', ''ml'') NOT NULL DEFAULT ''gr'' AFTER `quantidade`');

CALL add_column_if_missing('caixa_movimentos', 'forma_pagamento', '`forma_pagamento` VARCHAR(40) NULL AFTER `valor`');
CALL add_column_if_missing('caixa_movimentos', 'status_pagamento', '`status_pagamento` VARCHAR(40) NULL AFTER `forma_pagamento`');

UPDATE usuarios
SET nivel_acesso = 'vendedor'
WHERE nivel_acesso = 'operador';

ALTER TABLE usuarios
MODIFY COLUMN nivel_acesso ENUM('admin', 'gerente', 'vendedor', 'estoquista', 'cozinha') NOT NULL DEFAULT 'vendedor';

DROP PROCEDURE IF EXISTS add_column_if_missing;
DROP PROCEDURE IF EXISTS drop_column_if_present;
