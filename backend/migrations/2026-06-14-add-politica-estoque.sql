-- Migration: adiciona coluna politica_estoque em itens
ALTER TABLE itens
  ADD COLUMN IF NOT EXISTS politica_estoque VARCHAR(30) NOT NULL DEFAULT 'STRICT';

-- Nota: usar runner de migrações do projeto para aplicar esta alteração em produção/testes
