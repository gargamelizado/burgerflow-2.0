-- Apply to existing databases before deploying the API changes.
SET @audit_ip_column_sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'auditoria'
      AND column_name = 'ip_address'
  ),
  'SELECT 1',
  'ALTER TABLE auditoria ADD COLUMN ip_address VARCHAR(45) NULL'
);
PREPARE add_audit_ip_column FROM @audit_ip_column_sql;
EXECUTE add_audit_ip_column;
DEALLOCATE PREPARE add_audit_ip_column;

SET @audit_index_sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'auditoria'
      AND index_name = 'idx_auditoria_usuario_data'
  ),
  'SELECT 1',
  'CREATE INDEX idx_auditoria_usuario_data ON auditoria (usuario_id, criado_em)'
);
PREPARE add_audit_index FROM @audit_index_sql;
EXECUTE add_audit_index;
DEALLOCATE PREPARE add_audit_index;
