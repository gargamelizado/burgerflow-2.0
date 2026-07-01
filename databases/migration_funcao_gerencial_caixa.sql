USE burger_flow_2_0;

SET @col_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'caixas'
    AND COLUMN_NAME = 'usuario_fechamento_id'
);
SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE caixas ADD COLUMN usuario_fechamento_id INT NULL AFTER fechado_em',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'caixas'
    AND COLUMN_NAME = 'gerente_autorizador_id'
);
SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE caixas ADD COLUMN gerente_autorizador_id INT NULL AFTER usuario_fechamento_id',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'caixas'
    AND INDEX_NAME = 'idx_caixas_usuario_fechamento'
);
SET @sql := IF(
  @idx_exists = 0,
  'ALTER TABLE caixas ADD INDEX idx_caixas_usuario_fechamento (usuario_fechamento_id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'caixas'
    AND INDEX_NAME = 'idx_caixas_gerente_autorizador'
);
SET @sql := IF(
  @idx_exists = 0,
  'ALTER TABLE caixas ADD INDEX idx_caixas_gerente_autorizador (gerente_autorizador_id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists := (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'caixas'
    AND CONSTRAINT_NAME = 'fk_caixas_usuario_fechamento'
);
SET @sql := IF(
  @fk_exists = 0,
  'ALTER TABLE caixas ADD CONSTRAINT fk_caixas_usuario_fechamento FOREIGN KEY (usuario_fechamento_id) REFERENCES usuarios(id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists := (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'caixas'
    AND CONSTRAINT_NAME = 'fk_caixas_gerente_autorizador'
);
SET @sql := IF(
  @fk_exists = 0,
  'ALTER TABLE caixas ADD CONSTRAINT fk_caixas_gerente_autorizador FOREIGN KEY (gerente_autorizador_id) REFERENCES usuarios(id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'caixa_movimentos'
    AND COLUMN_NAME = 'usuario_id'
);
SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE caixa_movimentos ADD COLUMN usuario_id INT NULL AFTER pedido_id',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'caixa_movimentos'
    AND COLUMN_NAME = 'gerente_autorizador_id'
);
SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE caixa_movimentos ADD COLUMN gerente_autorizador_id INT NULL AFTER usuario_id',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE caixa_movimentos
  MODIFY COLUMN tipo ENUM('suprimento', 'sangria', 'venda', 'despesa', 'cancelamento') NOT NULL;

SET @idx_exists := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'caixa_movimentos'
    AND INDEX_NAME = 'idx_caixa_movimentos_usuario'
);
SET @sql := IF(
  @idx_exists = 0,
  'ALTER TABLE caixa_movimentos ADD INDEX idx_caixa_movimentos_usuario (usuario_id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'caixa_movimentos'
    AND INDEX_NAME = 'idx_caixa_movimentos_gerente'
);
SET @sql := IF(
  @idx_exists = 0,
  'ALTER TABLE caixa_movimentos ADD INDEX idx_caixa_movimentos_gerente (gerente_autorizador_id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists := (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'caixa_movimentos'
    AND CONSTRAINT_NAME = 'fk_caixa_movimentos_usuario'
);
SET @sql := IF(
  @fk_exists = 0,
  'ALTER TABLE caixa_movimentos ADD CONSTRAINT fk_caixa_movimentos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists := (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'caixa_movimentos'
    AND CONSTRAINT_NAME = 'fk_caixa_movimentos_gerente'
);
SET @sql := IF(
  @fk_exists = 0,
  'ALTER TABLE caixa_movimentos ADD CONSTRAINT fk_caixa_movimentos_gerente FOREIGN KEY (gerente_autorizador_id) REFERENCES usuarios(id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

