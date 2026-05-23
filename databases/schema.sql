CREATE DATABASE IF NOT EXISTS burger_flow_2_0
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE burger_flow_2_0;

CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  senha_hash VARCHAR(255) NOT NULL,
  nivel_acesso ENUM('admin', 'gerente', 'vendedor', 'estoquista', 'cozinha') NOT NULL DEFAULT 'vendedor',
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS itens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(150) NOT NULL,
  tipo ENUM('INGREDIENTE', 'PRODUTO', 'COMBO', 'PROMOCAO') NOT NULL,
  categoria VARCHAR(80) NOT NULL,
  preco_venda DECIMAL(10,2) NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  aparece_cardapio BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_itens_nome_tipo (nome, tipo),
  KEY idx_itens_tipo (tipo),
  KEY idx_itens_cardapio (ativo, aparece_cardapio, categoria)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS estoque_ingredientes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ingrediente_id INT NOT NULL UNIQUE,
  tipo_entrada ENUM('cx', 'pacote', 'medida') NOT NULL,
  quantidade_entrada DECIMAL(12,3) NOT NULL,
  pacotes_por_caixa DECIMAL(12,3) NULL,
  quantidade_por_pacote DECIMAL(12,3) NULL,
  unidade_medida ENUM('gr', 'kg', 'ml', 'li') NOT NULL,
  quantidade_total_base DECIMAL(12,3) NOT NULL,
  unidade_base ENUM('gr', 'ml') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_estoque_ingrediente
    FOREIGN KEY (ingrediente_id) REFERENCES itens(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS produto_ingredientes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  produto_id INT NOT NULL,
  ingrediente_id INT NOT NULL,
  quantidade_usada DECIMAL(12,3) NOT NULL,
  unidade_usada ENUM('gr', 'kg', 'ml', 'li') NOT NULL,
  quantidade_usada_base DECIMAL(12,3) NOT NULL,
  unidade_base ENUM('gr', 'ml') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_produto_ingrediente (produto_id, ingrediente_id),
  KEY idx_produto_ingredientes_ingrediente (ingrediente_id),
  CONSTRAINT fk_produto_ingredientes_produto
    FOREIGN KEY (produto_id) REFERENCES itens(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_produto_ingredientes_ingrediente
    FOREIGN KEY (ingrediente_id) REFERENCES itens(id)
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS combo_itens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  combo_id INT NOT NULL,
  produto_id INT NOT NULL,
  quantidade DECIMAL(12,3) NOT NULL DEFAULT 1.000,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_combo_produto (combo_id, produto_id),
  KEY idx_combo_itens_produto (produto_id),
  CONSTRAINT fk_combo_itens_combo
    FOREIGN KEY (combo_id) REFERENCES itens(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_combo_itens_produto
    FOREIGN KEY (produto_id) REFERENCES itens(id)
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS promocoes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  promocao_id INT NOT NULL UNIQUE,
  item_original_id INT NOT NULL,
  preco_promocional DECIMAL(10,2) NOT NULL,
  data_inicio DATE NULL,
  data_fim DATE NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_promocoes_item_original (item_original_id),
  CONSTRAINT fk_promocoes_promocao
    FOREIGN KEY (promocao_id) REFERENCES itens(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_promocoes_item_original
    FOREIGN KEY (item_original_id) REFERENCES itens(id)
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS caixas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NULL,
  valor_inicial DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  valor_final DECIMAL(10,2) NULL,
  valor_esperado DECIMAL(10,2) NULL,
  diferenca DECIMAL(10,2) NULL,
  status ENUM('aberto', 'fechado') NOT NULL DEFAULT 'aberto',
  observacao VARCHAR(255) NULL,
  aberto_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fechado_em TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS pedidos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  numero INT NOT NULL UNIQUE,
  caixa_id INT NULL,
  cliente_nome VARCHAR(100) NULL,
  tipo ENUM('balcao', 'mesa', 'delivery') NOT NULL DEFAULT 'balcao',
  status ENUM('novo', 'em_preparo', 'pronto', 'entregue', 'cancelado') NOT NULL DEFAULT 'novo',
  total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  desconto DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  forma_pagamento VARCHAR(40) NULL,
  status_pagamento VARCHAR(40) NOT NULL DEFAULT 'pendente',
  observacao VARCHAR(255) NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_pedidos_caixa (caixa_id),
  CONSTRAINT fk_pedidos_caixa
    FOREIGN KEY (caixa_id) REFERENCES caixas(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS pedido_itens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id INT NOT NULL,
  item_id INT NOT NULL,
  item_nome VARCHAR(150) NOT NULL,
  item_tipo ENUM('PRODUTO', 'COMBO', 'PROMOCAO') NOT NULL,
  item_original_id INT NULL,
  quantidade DECIMAL(12,3) NOT NULL DEFAULT 1.000,
  preco_unitario DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  desconto DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_pedido_itens_pedido (pedido_id),
  KEY idx_pedido_itens_item (item_id),
  CONSTRAINT fk_pedido_itens_pedido
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_pedido_itens_item
    FOREIGN KEY (item_id) REFERENCES itens(id)
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ingrediente_id INT NOT NULL,
  pedido_id INT NULL,
  tipo ENUM('entrada', 'saida', 'ajuste', 'venda') NOT NULL,
  quantidade DECIMAL(12,3) NOT NULL,
  unidade_base ENUM('gr', 'ml') NOT NULL,
  quantidade_anterior DECIMAL(12,3) NOT NULL,
  quantidade_nova DECIMAL(12,3) NOT NULL,
  motivo VARCHAR(255) NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_mov_estoque_ingrediente (ingrediente_id),
  KEY idx_mov_estoque_pedido (pedido_id),
  CONSTRAINT fk_mov_estoque_ingrediente
    FOREIGN KEY (ingrediente_id) REFERENCES itens(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_mov_estoque_pedido
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS caixa_movimentos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  caixa_id INT NOT NULL,
  pedido_id INT NULL,
  tipo ENUM('suprimento', 'sangria', 'venda') NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  forma_pagamento VARCHAR(40) NULL,
  status_pagamento VARCHAR(40) NULL,
  motivo VARCHAR(255) NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_caixa_movimentos_caixa (caixa_id),
  KEY idx_caixa_movimentos_pedido (pedido_id),
  CONSTRAINT fk_caixa_movimentos_caixa
    FOREIGN KEY (caixa_id) REFERENCES caixas(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_caixa_movimentos_pedido
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS auditoria (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NULL,
  acao VARCHAR(100) NOT NULL,
  entidade VARCHAR(100) NULL,
  entidade_id INT NULL,
  detalhes JSON NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
