-- Migration: adiciona coluna politica_estoque em itens
SET @politica_estoque_column_sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'itens'
      AND column_name = 'politica_estoque'
  ),
  'SELECT 1',
  'ALTER TABLE itens ADD COLUMN politica_estoque VARCHAR(30) NOT NULL DEFAULT ''STRICT'''
);
PREPARE add_politica_estoque_column FROM @politica_estoque_column_sql;
EXECUTE add_politica_estoque_column;
DEALLOCATE PREPARE add_politica_estoque_column;

-- Nota: usar runner de migrações do projeto para aplicar esta alteração em produção/testes
