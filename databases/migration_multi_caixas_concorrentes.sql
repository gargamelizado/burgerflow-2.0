USE burger_flow_2_0;

DROP PROCEDURE IF EXISTS add_column_if_missing;
DROP PROCEDURE IF EXISTS add_index_if_missing;

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

CREATE PROCEDURE add_index_if_missing(
  IN table_name_param VARCHAR(64),
  IN index_name_param VARCHAR(64),
  IN index_definition_param TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = table_name_param
      AND index_name = index_name_param
  ) THEN
    SET @alter_sql = CONCAT(
      'ALTER TABLE `',
      table_name_param,
      '` ADD ',
      index_definition_param
    );
    PREPARE alter_stmt FROM @alter_sql;
    EXECUTE alter_stmt;
    DEALLOCATE PREPARE alter_stmt;
  END IF;
END//

DELIMITER ;

CALL add_column_if_missing('caixas', 'numero', '`numero` INT NULL AFTER `id`');
CALL add_column_if_missing('caixas', 'operador_id', '`operador_id` INT NULL AFTER `usuario_id`');
CALL add_column_if_missing('caixas', 'valor_total_vendas', '`valor_total_vendas` DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER `valor_inicial`');
CALL add_column_if_missing('caixas', 'data_abertura', '`data_abertura` TIMESTAMP NULL AFTER `aberto_em`');
CALL add_column_if_missing('caixas', 'data_fechamento', '`data_fechamento` TIMESTAMP NULL AFTER `fechado_em`');
CALL add_column_if_missing('caixas', 'criado_em', '`criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER `gerente_autorizador_id`');
CALL add_column_if_missing('caixas', 'atualizado_em', '`atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `criado_em`');

UPDATE caixas
SET numero = id
WHERE numero IS NULL OR numero <= 0;

UPDATE caixas
SET operador_id = COALESCE(operador_id, usuario_id)
WHERE operador_id IS NULL;

UPDATE caixas
SET data_abertura = COALESCE(data_abertura, aberto_em, criado_em, CURRENT_TIMESTAMP)
WHERE data_abertura IS NULL;

UPDATE caixas
SET data_fechamento = COALESCE(data_fechamento, fechado_em)
WHERE status = 'fechado' AND data_fechamento IS NULL;

UPDATE caixas c
LEFT JOIN (
  SELECT
    caixa_id,
    COALESCE(SUM(CASE WHEN tipo = 'venda' THEN valor ELSE 0 END), 0) AS total_vendas
  FROM caixa_movimentos
  GROUP BY caixa_id
) cm ON cm.caixa_id = c.id
SET c.valor_total_vendas = COALESCE(cm.total_vendas, 0);

CALL add_index_if_missing('caixas', 'idx_caixas_numero', 'INDEX `idx_caixas_numero` (`numero`)');
CALL add_index_if_missing('caixas', 'idx_caixas_status_numero', 'INDEX `idx_caixas_status_numero` (`status`, `numero`)');
CALL add_index_if_missing('caixas', 'idx_caixas_operador', 'INDEX `idx_caixas_operador` (`operador_id`)');

SET @fk_exists := (
  SELECT COUNT(*)
  FROM information_schema.table_constraints
  WHERE constraint_schema = DATABASE()
    AND table_name = 'caixas'
    AND constraint_name = 'fk_caixas_operador'
);
SET @sql := IF(
  @fk_exists = 0,
  'ALTER TABLE caixas ADD CONSTRAINT fk_caixas_operador FOREIGN KEY (operador_id) REFERENCES usuarios(id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CALL add_column_if_missing('pedidos', 'usuario_id', '`usuario_id` INT NULL AFTER `caixa_id`');
CALL add_index_if_missing('pedidos', 'idx_pedidos_usuario', 'INDEX `idx_pedidos_usuario` (`usuario_id`)');

SET @fk_exists := (
  SELECT COUNT(*)
  FROM information_schema.table_constraints
  WHERE constraint_schema = DATABASE()
    AND table_name = 'pedidos'
    AND constraint_name = 'fk_pedidos_usuario'
);
SET @sql := IF(
  @fk_exists = 0,
  'ALTER TABLE pedidos ADD CONSTRAINT fk_pedidos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

DROP PROCEDURE IF EXISTS add_column_if_missing;
DROP PROCEDURE IF EXISTS add_index_if_missing;
