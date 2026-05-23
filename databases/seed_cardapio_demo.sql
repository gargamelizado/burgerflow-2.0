USE burger_flow_2_0;

START TRANSACTION;

DROP TEMPORARY TABLE IF EXISTS tmp_cardapio_demo;

CREATE TEMPORARY TABLE tmp_cardapio_demo (
  nome VARCHAR(150) NOT NULL,
  categoria VARCHAR(80) NOT NULL,
  tipo_item ENUM('PRODUTO', 'COMBO') NOT NULL,
  preco_venda DECIMAL(10,2) NOT NULL,
  estoque_base DECIMAL(12,3) NULL,
  unidade_base ENUM('gr', 'ml') NULL,
  uso_base DECIMAL(12,3) NULL
);

INSERT INTO tmp_cardapio_demo (
  nome,
  categoria,
  tipo_item,
  preco_venda,
  estoque_base,
  unidade_base,
  uso_base
) VALUES
-- HAMBURGUER
('X-Burger', 'hambúrguer', 'PRODUTO', 18.90, 30.000, 'gr', 1.000),
('X-Salada', 'hambúrguer', 'PRODUTO', 20.90, 30.000, 'gr', 1.000),
('X-Bacon', 'hambúrguer', 'PRODUTO', 24.90, 25.000, 'gr', 1.000),
('X-Egg', 'hambúrguer', 'PRODUTO', 22.90, 25.000, 'gr', 1.000),
('X-Tudo', 'hambúrguer', 'PRODUTO', 29.90, 20.000, 'gr', 1.000),
('Cheddar Burger', 'hambúrguer', 'PRODUTO', 26.90, 20.000, 'gr', 1.000),
('Duplo Burger', 'hambúrguer', 'PRODUTO', 31.90, 18.000, 'gr', 1.000),
('Chicken Burger', 'hambúrguer', 'PRODUTO', 23.90, 20.000, 'gr', 1.000),

-- VEGANO
('Veggie Burger', 'vegano', 'PRODUTO', 24.90, 15.000, 'gr', 1.000),
('Burger de Grão-de-bico', 'vegano', 'PRODUTO', 25.90, 15.000, 'gr', 1.000),
('Burger de Lentilha', 'vegano', 'PRODUTO', 25.90, 15.000, 'gr', 1.000),
('Burger de Cogumelo', 'vegano', 'PRODUTO', 28.90, 12.000, 'gr', 1.000),
('Wrap Vegano', 'vegano', 'PRODUTO', 21.90, 15.000, 'gr', 1.000),
('Salada Vegana', 'vegano', 'PRODUTO', 19.90, 20.000, 'gr', 1.000),

-- ACOMPANHAMENTO
('Onion Rings', 'acompanhamento', 'PRODUTO', 14.90, 30.000, 'gr', 1.000),
('Nuggets 6 unidades', 'acompanhamento', 'PRODUTO', 15.90, 30.000, 'gr', 1.000),
('Nuggets 12 unidades', 'acompanhamento', 'PRODUTO', 25.90, 20.000, 'gr', 1.000),
('Salada Simples', 'acompanhamento', 'PRODUTO', 12.90, 20.000, 'gr', 1.000),
('Molho Especial', 'acompanhamento', 'PRODUTO', 3.00, 100.000, 'gr', 1.000),
('Molho Barbecue', 'acompanhamento', 'PRODUTO', 3.00, 100.000, 'gr', 1.000),
('Molho Cheddar', 'acompanhamento', 'PRODUTO', 4.00, 80.000, 'gr', 1.000),

-- SOBREMESA
('Brownie', 'sobremesa', 'PRODUTO', 11.90, 20.000, 'gr', 1.000),
('Milkshake Chocolate', 'sobremesa', 'PRODUTO', 16.90, 8000.000, 'ml', 400.000),
('Milkshake Morango', 'sobremesa', 'PRODUTO', 16.90, 8000.000, 'ml', 400.000),
('Milkshake Baunilha', 'sobremesa', 'PRODUTO', 16.90, 8000.000, 'ml', 400.000),
('Sorvete Casquinha', 'sobremesa', 'PRODUTO', 7.90, 30.000, 'gr', 1.000),
('Petit Gateau', 'sobremesa', 'PRODUTO', 18.90, 15.000, 'gr', 1.000),

-- FRITAS
('Batata Pequena', 'fritas', 'PRODUTO', 9.90, 40.000, 'gr', 1.000),
('Batata Média', 'fritas', 'PRODUTO', 13.90, 35.000, 'gr', 1.000),
('Batata Grande', 'fritas', 'PRODUTO', 18.90, 30.000, 'gr', 1.000),
('Batata com Cheddar', 'fritas', 'PRODUTO', 21.90, 25.000, 'gr', 1.000),
('Batata com Bacon', 'fritas', 'PRODUTO', 23.90, 25.000, 'gr', 1.000),
('Batata Especial', 'fritas', 'PRODUTO', 26.90, 20.000, 'gr', 1.000),

-- BEBIDA
('Coca-Cola Lata', 'bebida', 'PRODUTO', 6.00, 21000.000, 'ml', 350.000),
('Coca-Cola 600ml', 'bebida', 'PRODUTO', 8.50, 30000.000, 'ml', 600.000),
('Guaraná Lata', 'bebida', 'PRODUTO', 6.00, 21000.000, 'ml', 350.000),
('Guaraná 600ml', 'bebida', 'PRODUTO', 8.50, 30000.000, 'ml', 600.000),
('Fanta Laranja Lata', 'bebida', 'PRODUTO', 6.00, 17500.000, 'ml', 350.000),
('Sprite Lata', 'bebida', 'PRODUTO', 6.00, 17500.000, 'ml', 350.000),
('Água Mineral', 'bebida', 'PRODUTO', 4.00, 40000.000, 'ml', 500.000),
('Suco Natural Laranja', 'bebida', 'PRODUTO', 9.90, 9000.000, 'ml', 300.000),
('Suco Natural Maracujá', 'bebida', 'PRODUTO', 9.90, 9000.000, 'ml', 300.000),

-- COMBO
('Combo X-Burger', 'combo', 'COMBO', 29.90, NULL, NULL, NULL),
('Combo X-Salada', 'combo', 'COMBO', 32.90, NULL, NULL, NULL),
('Combo X-Bacon', 'combo', 'COMBO', 36.90, NULL, NULL, NULL),
('Combo Duplo Burger', 'combo', 'COMBO', 42.90, NULL, NULL, NULL),
('Combo Chicken Burger', 'combo', 'COMBO', 34.90, NULL, NULL, NULL),
('Combo Veggie Burger', 'combo', 'COMBO', 35.90, NULL, NULL, NULL),
('Combo Família 2 Pessoas', 'combo', 'COMBO', 69.90, NULL, NULL, NULL),
('Combo Família 4 Pessoas', 'combo', 'COMBO', 129.90, NULL, NULL, NULL),
('Combo Kids', 'combo', 'COMBO', 24.90, NULL, NULL, NULL),
('Combo Fritas + Bebida', 'combo', 'COMBO', 19.90, NULL, NULL, NULL);

INSERT INTO itens (
  nome,
  tipo,
  categoria,
  preco_venda,
  ativo,
  aparece_cardapio
)
SELECT
  nome,
  tipo_item,
  categoria,
  preco_venda,
  TRUE,
  TRUE
FROM tmp_cardapio_demo
ON DUPLICATE KEY UPDATE
  categoria = VALUES(categoria),
  preco_venda = VALUES(preco_venda),
  ativo = TRUE,
  aparece_cardapio = TRUE;

INSERT INTO itens (
  nome,
  tipo,
  categoria,
  preco_venda,
  ativo,
  aparece_cardapio
)
SELECT
  CONCAT('Insumo ', nome),
  'INGREDIENTE',
  'ingrediente',
  NULL,
  TRUE,
  FALSE
FROM tmp_cardapio_demo
WHERE tipo_item = 'PRODUTO'
ON DUPLICATE KEY UPDATE
  categoria = 'ingrediente',
  preco_venda = NULL,
  ativo = TRUE,
  aparece_cardapio = FALSE;

INSERT INTO estoque_ingredientes (
  ingrediente_id,
  tipo_entrada,
  quantidade_entrada,
  pacotes_por_caixa,
  quantidade_por_pacote,
  unidade_medida,
  quantidade_total_base,
  unidade_base
)
SELECT
  ingrediente.id,
  'medida',
  produto.estoque_base,
  NULL,
  NULL,
  produto.unidade_base,
  produto.estoque_base,
  produto.unidade_base
FROM tmp_cardapio_demo produto
INNER JOIN itens ingrediente
  ON ingrediente.nome = CONCAT('Insumo ', produto.nome)
  AND ingrediente.tipo = 'INGREDIENTE'
WHERE produto.tipo_item = 'PRODUTO'
ON DUPLICATE KEY UPDATE
  tipo_entrada = VALUES(tipo_entrada),
  quantidade_entrada = VALUES(quantidade_entrada),
  pacotes_por_caixa = NULL,
  quantidade_por_pacote = NULL,
  unidade_medida = VALUES(unidade_medida),
  quantidade_total_base = VALUES(quantidade_total_base),
  unidade_base = VALUES(unidade_base);

INSERT INTO produto_ingredientes (
  produto_id,
  ingrediente_id,
  quantidade_usada,
  unidade_usada,
  quantidade_usada_base,
  unidade_base
)
SELECT
  item_produto.id,
  ingrediente.id,
  produto.uso_base,
  produto.unidade_base,
  produto.uso_base,
  produto.unidade_base
FROM tmp_cardapio_demo produto
INNER JOIN itens item_produto
  ON item_produto.nome = produto.nome
  AND item_produto.tipo = 'PRODUTO'
INNER JOIN itens ingrediente
  ON ingrediente.nome = CONCAT('Insumo ', produto.nome)
  AND ingrediente.tipo = 'INGREDIENTE'
WHERE produto.tipo_item = 'PRODUTO'
ON DUPLICATE KEY UPDATE
  quantidade_usada = VALUES(quantidade_usada),
  unidade_usada = VALUES(unidade_usada),
  quantidade_usada_base = VALUES(quantidade_usada_base),
  unidade_base = VALUES(unidade_base);

DROP TEMPORARY TABLE IF EXISTS tmp_combo_demo;

CREATE TEMPORARY TABLE tmp_combo_demo (
  combo_nome VARCHAR(150) NOT NULL,
  produto_nome VARCHAR(150) NOT NULL,
  quantidade DECIMAL(12,3) NOT NULL DEFAULT 1.000
);

INSERT INTO tmp_combo_demo (combo_nome, produto_nome, quantidade) VALUES
('Combo X-Burger', 'X-Burger', 1.000),
('Combo X-Burger', 'Batata Média', 1.000),
('Combo X-Burger', 'Coca-Cola Lata', 1.000),
('Combo X-Salada', 'X-Salada', 1.000),
('Combo X-Salada', 'Batata Média', 1.000),
('Combo X-Salada', 'Guaraná Lata', 1.000),
('Combo X-Bacon', 'X-Bacon', 1.000),
('Combo X-Bacon', 'Batata Grande', 1.000),
('Combo X-Bacon', 'Coca-Cola Lata', 1.000),
('Combo Duplo Burger', 'Duplo Burger', 1.000),
('Combo Duplo Burger', 'Batata Grande', 1.000),
('Combo Duplo Burger', 'Coca-Cola 600ml', 1.000),
('Combo Chicken Burger', 'Chicken Burger', 1.000),
('Combo Chicken Burger', 'Batata Média', 1.000),
('Combo Chicken Burger', 'Guaraná Lata', 1.000),
('Combo Veggie Burger', 'Veggie Burger', 1.000),
('Combo Veggie Burger', 'Batata Média', 1.000),
('Combo Veggie Burger', 'Água Mineral', 1.000),
('Combo Família 2 Pessoas', 'X-Burger', 1.000),
('Combo Família 2 Pessoas', 'X-Salada', 1.000),
('Combo Família 2 Pessoas', 'Batata Grande', 1.000),
('Combo Família 2 Pessoas', 'Coca-Cola 600ml', 2.000),
('Combo Família 4 Pessoas', 'X-Burger', 1.000),
('Combo Família 4 Pessoas', 'X-Bacon', 1.000),
('Combo Família 4 Pessoas', 'Chicken Burger', 1.000),
('Combo Família 4 Pessoas', 'Veggie Burger', 1.000),
('Combo Família 4 Pessoas', 'Batata Grande', 2.000),
('Combo Família 4 Pessoas', 'Coca-Cola 600ml', 2.000),
('Combo Kids', 'Chicken Burger', 1.000),
('Combo Kids', 'Batata Pequena', 1.000),
('Combo Kids', 'Água Mineral', 1.000),
('Combo Fritas + Bebida', 'Batata Média', 1.000),
('Combo Fritas + Bebida', 'Coca-Cola Lata', 1.000);

INSERT INTO combo_itens (
  combo_id,
  produto_id,
  quantidade
)
SELECT
  combo.id,
  produto.id,
  tmp.quantidade
FROM tmp_combo_demo tmp
INNER JOIN itens combo
  ON combo.nome = tmp.combo_nome
  AND combo.tipo = 'COMBO'
INNER JOIN itens produto
  ON produto.nome = tmp.produto_nome
  AND produto.tipo = 'PRODUTO'
ON DUPLICATE KEY UPDATE
  quantidade = VALUES(quantidade);

DROP TEMPORARY TABLE IF EXISTS tmp_promocoes_demo;

CREATE TEMPORARY TABLE tmp_promocoes_demo (
  promocao_nome VARCHAR(150) NOT NULL,
  item_original_nome VARCHAR(150) NOT NULL,
  preco_promocional DECIMAL(10,2) NOT NULL
);

INSERT INTO tmp_promocoes_demo (
  promocao_nome,
  item_original_nome,
  preco_promocional
) VALUES
('Promoção Segunda', 'Combo X-Burger', 25.00),
('Promoção Fritas + Bebida', 'Combo Fritas + Bebida', 16.90);

INSERT INTO itens (
  nome,
  tipo,
  categoria,
  preco_venda,
  ativo,
  aparece_cardapio
)
SELECT
  promocao_nome,
  'PROMOCAO',
  'promoção',
  preco_promocional,
  TRUE,
  TRUE
FROM tmp_promocoes_demo
ON DUPLICATE KEY UPDATE
  categoria = 'promoção',
  preco_venda = VALUES(preco_venda),
  ativo = TRUE,
  aparece_cardapio = TRUE;

INSERT INTO promocoes (
  promocao_id,
  item_original_id,
  preco_promocional,
  data_inicio,
  data_fim,
  ativo
)
SELECT
  promocao.id,
  original.id,
  tmp.preco_promocional,
  CURDATE(),
  NULL,
  TRUE
FROM tmp_promocoes_demo tmp
INNER JOIN itens promocao
  ON promocao.nome = tmp.promocao_nome
  AND promocao.tipo = 'PROMOCAO'
INNER JOIN itens original
  ON original.nome = tmp.item_original_nome
  AND original.tipo IN ('PRODUTO', 'COMBO')
ON DUPLICATE KEY UPDATE
  item_original_id = VALUES(item_original_id),
  preco_promocional = VALUES(preco_promocional),
  data_inicio = VALUES(data_inicio),
  data_fim = NULL,
  ativo = TRUE;

DROP TEMPORARY TABLE IF EXISTS tmp_promocoes_demo;
DROP TEMPORARY TABLE IF EXISTS tmp_combo_demo;
DROP TEMPORARY TABLE IF EXISTS tmp_cardapio_demo;

COMMIT;
