USE burger_flow_2_0;

INSERT INTO usuarios (nome, email, senha_hash, nivel_acesso, ativo)
VALUES (
  'Administrador',
  'admin@estoque.com',
  '$2b$10$m6wWZiZ8oHMtwKpQCR0AueJK9YWQcNss4B4bKJnlt8HKHbF7WI5nG',
  'admin',
  TRUE
)
ON DUPLICATE KEY UPDATE
  nome = VALUES(nome),
  senha_hash = VALUES(senha_hash),
  nivel_acesso = VALUES(nivel_acesso),
  ativo = VALUES(ativo);