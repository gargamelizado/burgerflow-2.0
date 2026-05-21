terminar de fazer frontend e backend ate as fuçoes basica (cardapio ,caixa,estoque,pedidos)


#token
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkBlc3RvcXVlLmNvbSIsIm5pdmVsX2FjZXNzbyI6ImFkbWluIiwiaWF0IjoxNzc4NDUxMzkzLCJleHAiOjE3Nzg1Mzc3OTN9.hLO9RYakQ-Cg1HeGCzKU2mCkBG76vqxlmM2wA4ImgkA"

curl -i http://localhost:3006/api/produtos \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkBlc3RvcXVlLmNvbSIsIm5pdmVsX2FjZXNzbyI6ImFkbWluIiwiaWF0IjoxNzc4NDUxMzkzLCJleHAiOjE3Nzg1Mzc3OTN9.hLO9RYakQ-Cg1HeGCzKU2mCkBG76vqxlmM2wA4ImgkA"


  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkBlc3RvcXVlLmNvbSIsIm5pdmVsX2FjZXNzbyI6ImFkbWluIiwiaWF0IjoxNzc4NDUyMjM4LCJleHAiOjE3Nzg1Mzg2Mzh9.qUMOkkd9tUGcp6VdPBG07HlDdwTY23mSFylzhBwBTiM"

  curl -i -X PUT http://localhost:3006/api/produtos/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkBlc3RvcXVlLmNvbSIsIm5pdmVsX2FjZXNzbyI6ImFkbWluIiwiaWF0IjoxNzc4NDUyMjM4LCJleHAiOjE3Nzg1Mzg2Mzh9.qUMOkkd9tUGcp6VdPBG07HlDdwTY23mSFylzhBwBTiM" \
  -d '{
    "nome": "Produto Editado",
    "categoria": "",
    "tipo": "simples",
    "preco": 20.00,
    "custo": 10.00,
    "quantidade_estoque": 5,
    "unidade": "un",
    "ativo": true
  }'
  curl -i -X PUT http://localhost:3006/api/produtos/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkBlc3RvcXVlLmNvbSIsIm5pdmVsX2FjZXNzbyI6ImFkbWluIiwiaWF0IjoxNzc4NDUyMjM4LCJleHAiOjE3Nzg1Mzg2Mzh9.qUMOkkd9tUGcp6VdPBG07HlDdwTY23mSFylzhBwBTiM" \
  -d '{
    "nome": "Produto Editado",
    "categoria": "",
    "tipo": "simples",
    "preco": 20.00,
    "custo": 10.00,
    "quantidade_estoque": 5,
    "unidade": "un",
    "ativo": true
  }'

curl -i -X POST http://localhost:3006/api/estoque/movimentar \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkBlc3RvcXVlLmNvbSIsIm5pdmVsX2FjZXNzbyI6ImFkbWluIiwiaWF0IjoxNzc4NDUyMjM4LCJleHAiOjE3Nzg1Mzg2Mzh9.qUMOkkd9tUGcp6VdPBG07HlDdwTY23mSFylzhBwBTiM" \
  -d '{
    "produto_id": 1,
    "tipo": "entrada",
    "quantidade": 5,
    "motivo": "Reposição manual"
  }'







  mkdir backend/src/modules/inventory/inventory.routes.js inventory.controller.js inventory.service.js inventory.repository.js




  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkBlc3RvcXVlLmNvbSIsIm5pdmVsX2FjZXNzbyI6ImFkbWluIiwiaWF0IjoxNzc4NzEwOTgzLCJleHAiOjE3Nzg3OTczODN9.bF0yiq_hDR3DkZi7nDP1sx819ULscXwsAwCpAitQhaU


  curl -i http://localhost:3006/api/caixa/aberto \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkBlc3RvcXVlLmNvbSIsIm5pdmVsX2FjZXNzbyI6ImFkbWluIiwiaWF0IjoxNzc4NzEwOTgzLCJleHAiOjE3Nzg3OTczODN9.bF0yiq_hDR3DkZi7nDP1sx819ULscXwsAwCpAitQhaU"

  curl -i -X POST http://localhost:3006/api/caixa/abrir \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkBlc3RvcXVlLmNvbSIsIm5pdmVsX2FjZXNzbyI6ImFkbWluIiwiaWF0IjoxNzc4NzEwOTgzLCJleHAiOjE3Nzg3OTczODN9.bF0yiq_hDR3DkZi7nDP1sx819ULscXwsAwCpAitQhaU" \
  -d '{
    "valor_inicial": 100,
    "observacao": "Abertura inicial"
  }'

  curl -i -X POST http://localhost:3006/api/caixa/fechar \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkBlc3RvcXVlLmNvbSIsIm5pdmVsX2FjZXNzbyI6ImFkbWluIiwiaWF0IjoxNzc4NzEwOTgzLCJleHAiOjE3Nzg3OTczODN9.bF0yiq_hDR3DkZi7nDP1sx819ULscXwsAwCpAitQhaU" \
  -d '{
    "valor_final": 150,
    "observacao": "Fechamento manual"
  }'


  curl -i -X POST http://localhost:3006/api/caixa/movimento \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkBlc3RvcXVlLmNvbSIsIm5pdmVsX2FjZXNzbyI6ImFkbWluIiwiaWF0IjoxNzc4NzEwOTgzLCJleHAiOjE3Nzg3OTczODN9.bF0yiq_hDR3DkZi7nDP1sx819ULscXwsAwCpAitQhaU" \
  -d '{
    "tipo": "sangria",
    "valor": 20,
    "motivo": "Retirada manual"
  }'

  curl -i http://localhost:3006/api/caixa/movimentos \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkBlc3RvcXVlLmNvbSIsIm5pdmVsX2FjZXNzbyI6ImFkbWluIiwiaWF0IjoxNzc4NzEwOTgzLCJleHAiOjE3Nzg3OTczODN9.bF0yiq_hDR3DkZi7nDP1sx819ULscXwsAwCpAitQhaU"

 Você é um agente de desenvolvimento full-stack trabalhando no projeto BurgerFlow 2.0.

OBJETIVO:
Implementar a lógica de cadastro de itens, cardápio, estoque, combos, promoções, pedidos e caixa.

Focar somente nas funções básicas:

- cardápio
- estoque
- pedidos
- caixa

Não fugir desse escopo.

==================================================
REGRA PRINCIPAL
==================================================

Usar apenas estes tipos de item:

- INGREDIENTE
- PRODUTO
- COMBO
- PROMOCAO

Não criar:

- PRODUTO_SIMPLES
- PRODUTO_COMPOSTO
- estoque_minimo
- alerta de estoque baixo
- preco_compra
- custo_unitario
- validade

Observação importante:

O sistema não vai calcular custo/lucro real agora, porque ingrediente não terá preço de compra nesta fase.
O foco agora é controlar quantidade de estoque e baixa automática nos pedidos.

==================================================
LÓGICA GERAL DO SISTEMA
==================================================

1. INGREDIENTE

Ingrediente é item de estoque.

Exemplos:

- Pão
- Hambúrguer
- Queijo
- Batata
- Molho
- Coca-Cola
- Embalagem

Ingrediente não aparece no cardápio.
Ingrediente serve apenas para controlar quantidade no estoque.

2. PRODUTO

Produto é item vendido no cardápio.

Produto usa ingredientes.

Exemplo:

Produto: X-Burger

Ingredientes usados:

- pão
- hambúrguer
- queijo
- molho

Produto também pode ter apenas 1 ingrediente.

Exemplo:

Produto: Coca-Cola

Ingrediente usado:

- Coca-Cola

Não criar tipo PRODUTO_SIMPLES.
Produto simples é apenas um PRODUTO com 1 ingrediente.

3. COMBO

Combo é um conjunto de produtos.

Exemplo:

Combo X-Burger

Produtos dentro:

- 1 X-Burger
- 1 Fritas
- 1 Coca-Cola

Combo não tem ingredientes diretos.
Combo tem produtos.
Os produtos têm ingredientes.

Quando vender um combo, o sistema deve:

- buscar os produtos dentro do combo
- buscar os ingredientes de cada produto
- baixar os ingredientes finais do estoque

4. PROMOCAO

Promoção aponta para um PRODUTO ou COMBO existente com preço diferente.

Exemplo:

Promoção Segunda

- item original: Combo X-Burger
- preço promocional: 25.00

Promoção não tem ingredientes próprios.
Promoção usa a composição do item original.

Quando vender uma promoção, o sistema deve:

- buscar o item original
- usar a composição do item original
- cobrar o preço promocional
- baixar o estoque igual ao item original

==================================================
CATEGORIAS
==================================================

Categorias permitidas:

- hambúrguer
- vegano
- acompanhamento
- sobremesa
- fritas
- bebida
- combo
- promoção
- ingrediente

A opção "todos" não deve ser salva no banco.
"Todos" deve existir apenas no frontend como filtro visual.

==================================================
TELA DE CADASTRO DE ITEM
==================================================

Criar uma tela/formulário chamada:

Cadastrar Item

Campos principais:

- nome
- tipo
- categoria

O campo tipo deve ser um select com:

- INGREDIENTE
- PRODUTO
- COMBO
- PROMOCAO

Conforme o tipo selecionado, o formulário deve mudar.

==================================================
SE TIPO = INGREDIENTE
==================================================

Ingrediente deve ter cadastro simples, mas com lógica de unidade em níveis:

CAIXA -> PACOTE -> UNIDADE DE MEDIDA

A unidade de medida final pode ser:

- gr
- kg
- ml
- li

O ingrediente pode ser cadastrado de 3 formas:

1. Por caixa
2. Por pacote
3. Por medida direta

--------------------------------------------------
1. CADASTRO POR CAIXA
--------------------------------------------------

Quando o usuário escolher entrada por CAIXA, mostrar:

- nome
- categoria
- quantidade_caixas
- pacotes_por_caixa
- quantidade_por_pacote
- unidade_medida

Exemplo:

Nome: Batata
Categoria: fritas
Quantidade de caixas: 2
Pacotes por caixa: 10
Quantidade por pacote: 1
Unidade de medida: kg

Cálculo:

2 caixas x 10 pacotes x 1 kg = 20 kg

O sistema deve converter para unidade base:

20 kg = 20000 gr

Salvar:

quantidade_total_base = 20000
unidade_base = gr

--------------------------------------------------
2. CADASTRO POR PACOTE
--------------------------------------------------

Quando o usuário escolher entrada por PACOTE, mostrar:

- nome
- categoria
- quantidade_pacotes
- quantidade_por_pacote
- unidade_medida

Exemplo:

Nome: Molho
Categoria: ingrediente
Quantidade de pacotes: 5
Quantidade por pacote: 500
Unidade de medida: gr

Cálculo:

5 pacotes x 500 gr = 2500 gr

Salvar:

quantidade_total_base = 2500
unidade_base = gr

--------------------------------------------------
3. CADASTRO POR MEDIDA DIRETA
--------------------------------------------------

Quando o usuário escolher entrada por MEDIDA DIRETA, mostrar:

- nome
- categoria
- quantidade
- unidade_medida

Exemplo:

Nome: Óleo
Categoria: ingrediente
Quantidade: 5
Unidade de medida: li

Cálculo:

5 li = 5000 ml

Salvar:

quantidade_total_base = 5000
unidade_base = ml

Outro exemplo:

Nome: Molho especial
Categoria: ingrediente
Quantidade: 800
Unidade de medida: gr

Salvar:

quantidade_total_base = 800
unidade_base = gr

==================================================
REGRAS DE CONVERSÃO DE UNIDADE
==================================================

O sistema deve sempre converter para unidade base.

Conversões:

- kg -> gr
- gr -> gr
- li -> ml
- ml -> ml

Exemplos:

1 kg = 1000 gr
2 kg = 2000 gr
1 li = 1000 ml
5 li = 5000 ml

A baixa de estoque deve sempre usar:

- quantidade_total_base
- unidade_base

Exemplo:

Ingrediente Batata cadastrado:

2 caixas x 10 pacotes x 1 kg = 20 kg

Salvar no estoque:

quantidade_total_base = 20000
unidade_base = gr

Produto Fritas usa:

300 gr de batata

Ao vender 1 Fritas:

20000 gr - 300 gr = 19700 gr

==================================================
REGRAS DO INGREDIENTE
==================================================

- INGREDIENTE é item de estoque.
- INGREDIENTE não aparece no cardápio.
- aparece_cardapio deve ser false.
- preco_venda deve ser null ou 0.
- Não criar preco_compra.
- Não criar custo_unitario.
- Não criar validade.
- Não criar estoque_minimo.
- Não criar alerta de estoque baixo.
- O estoque deve ser controlado por quantidade_total_base e unidade_base.
- A unidade usada no produto precisa ser compatível com a unidade base do ingrediente.

Exemplos de compatibilidade:

Ingrediente com unidade_base = gr:
- produto pode usar gr
- produto pode usar kg, mas deve converter para gr

Ingrediente com unidade_base = ml:
- produto pode usar ml
- produto pode usar li, mas deve converter para ml

==================================================
SE TIPO = PRODUTO
==================================================

Produto aparece no cardápio e baixa ingredientes.

Mostrar campos:

- nome
- categoria
- preco_venda
- ingredientes usados
- quantidade usada de cada ingrediente
- unidade da quantidade usada
- ativo
- aparece_cardapio

Regras:

- Produto aparece no cardápio.
- Produto baixa ingredientes.
- Produto pode ter 1 ingrediente ou vários ingredientes.
- Não criar PRODUTO_SIMPLES.
- Produto não controla estoque próprio.
- Produto baixa o estoque dos ingredientes.

Exemplo:

Produto:

Nome: X-Burger
Tipo: PRODUTO
Categoria: hambúrguer
Preço venda: 18.00

Ingredientes usados:

- pão: 1 pacote
- hambúrguer: 1 pacote
- queijo: 1 pacote
- molho: 20 gr

Quando vender 1 X-Burger, o sistema deve baixar esses ingredientes do estoque.

Exemplo de produto com 1 ingrediente:

Produto:

Nome: Coca-Cola
Tipo: PRODUTO
Categoria: bebida
Preço venda: 6.00

Ingrediente usado:

- Coca-Cola: 350 ml

Quando vender 1 Coca-Cola, baixar 350 ml do ingrediente Coca-Cola.

==================================================
SE TIPO = COMBO
==================================================

Combo aparece no cardápio e junta produtos.

Mostrar campos:

- nome
- categoria
- preco_venda
- produtos dentro do combo
- quantidade de cada produto
- ativo
- aparece_cardapio

Regras:

- Combo aparece no cardápio.
- Combo junta produtos.
- Combo não baixa estoque diretamente.
- Combo não tem ingredientes diretos.
- O estoque baixa pelos ingredientes dos produtos dentro do combo.

Exemplo:

Combo:

Nome: Combo X-Burger
Tipo: COMBO
Categoria: combo
Preço venda: 30.00

Produtos dentro:

- X-Burger: 1
- Fritas: 1
- Coca-Cola: 1

Quando vender 1 combo:

- buscar os produtos do combo
- buscar os ingredientes de cada produto
- baixar os ingredientes finais

==================================================
SE TIPO = PROMOCAO
==================================================

Promoção aparece no cardápio e aponta para produto ou combo existente.

Mostrar campos:

- nome
- categoria
- item_original
- preco_promocional
- data_inicio
- data_fim
- ativo
- aparece_cardapio

Regras:

- Promoção aparece no cardápio.
- Promoção aponta para um PRODUTO ou COMBO.
- Promoção não tem ingredientes próprios.
- Promoção usa a composição do item original.
- Promoção cobra o preço promocional.
- Promoção não pode apontar para INGREDIENTE.

Exemplo:

Promoção:

Nome: Promoção Segunda
Tipo: PROMOCAO
Categoria: promoção
Item original: Combo X-Burger
Preço promocional: 25.00

Quando vender a promoção:

- buscar o item original
- usar a composição do item original
- cobrar o preço promocional
- baixar estoque igual ao item original

==================================================
BANCO DE DADOS
==================================================

Criar ou ajustar as tabelas para esta lógica.

--------------------------------------------------
Tabela: itens
--------------------------------------------------

Campos:

- id
- nome
- tipo ENUM('INGREDIENTE', 'PRODUTO', 'COMBO', 'PROMOCAO')
- categoria
- preco_venda
- ativo
- aparece_cardapio
- created_at
- updated_at

Regras:

- INGREDIENTE deve ter aparece_cardapio = false.
- INGREDIENTE pode ter preco_venda null ou 0.
- PRODUTO, COMBO e PROMOCAO podem aparecer no cardápio.
- Não criar PRODUTO_SIMPLES.
- Não criar PRODUTO_COMPOSTO.

--------------------------------------------------
Tabela: estoque_ingredientes
--------------------------------------------------

Campos:

- id
- ingrediente_id
- tipo_entrada
- quantidade_entrada
- pacotes_por_caixa
- quantidade_por_pacote
- unidade_medida
- quantidade_total_base
- unidade_base
- created_at
- updated_at

Onde:

tipo_entrada pode ser:

- cx
- pacote
- medida

unidade_medida pode ser:

- gr
- kg
- ml
- li

unidade_base pode ser:

- gr
- ml

Regras:

- ingrediente_id precisa apontar para um item do tipo INGREDIENTE.
- tipo_entrada define se o ingrediente entrou como caixa, pacote ou medida direta.
- quantidade_entrada representa:
  - quantidade de caixas, se tipo_entrada = cx
  - quantidade de pacotes, se tipo_entrada = pacote
  - quantidade direta, se tipo_entrada = medida
- quantidade_total_base deve ser calculada automaticamente.
- unidade_base deve ser calculada automaticamente.
- Não criar preco_compra.
- Não criar custo_unitario.
- Não criar validade.
- Não criar estoque_minimo.

Cálculo:

Se tipo_entrada = cx:

quantidade_total = quantidade_entrada * pacotes_por_caixa * quantidade_por_pacote

Depois converter para unidade_base.

Exemplo:

2 caixas x 10 pacotes x 1 kg = 20 kg
20 kg = 20000 gr

quantidade_total_base = 20000
unidade_base = gr

Se tipo_entrada = pacote:

quantidade_total = quantidade_entrada * quantidade_por_pacote

Depois converter para unidade_base.

Exemplo:

5 pacotes x 500 gr = 2500 gr

quantidade_total_base = 2500
unidade_base = gr

Se tipo_entrada = medida:

quantidade_total = quantidade_entrada

Depois converter para unidade_base.

Exemplo:

5 li = 5000 ml

quantidade_total_base = 5000
unidade_base = ml

--------------------------------------------------
Tabela: produto_ingredientes
--------------------------------------------------

Campos:

- id
- produto_id
- ingrediente_id
- quantidade_usada
- unidade_usada
- quantidade_usada_base
- unidade_base
- created_at
- updated_at

Regras:

- produto_id precisa apontar para um item do tipo PRODUTO.
- ingrediente_id precisa apontar para um item do tipo INGREDIENTE.
- Produto pode ter 1 ou vários ingredientes.
- quantidade_usada representa quanto daquele ingrediente o produto consome.
- unidade_usada pode ser gr, kg, ml ou li.
- quantidade_usada_base deve ser convertida para gr ou ml.
- unidade_base deve ser gr ou ml.
- unidade_base do uso precisa ser compatível com unidade_base do estoque do ingrediente.

Exemplo:

Produto Fritas usa:

quantidade_usada = 300
unidade_usada = gr

Salvar:

quantidade_usada_base = 300
unidade_base = gr

Produto Suco usa:

quantidade_usada = 1
unidade_usada = li

Salvar:

quantidade_usada_base = 1000
unidade_base = ml

--------------------------------------------------
Tabela: combo_itens
--------------------------------------------------

Campos:

- id
- combo_id
- produto_id
- quantidade
- created_at
- updated_at

Regras:

- combo_id precisa apontar para um item do tipo COMBO.
- produto_id precisa apontar para um item do tipo PRODUTO.
- Combo só pode conter produtos.
- Combo não pode conter ingrediente direto.
- Combo não pode conter promoção.

--------------------------------------------------
Tabela: promocoes
--------------------------------------------------

Campos:

- id
- promocao_id
- item_original_id
- preco_promocional
- data_inicio
- data_fim
- ativo
- created_at
- updated_at

Regras:

- promocao_id precisa apontar para um item do tipo PROMOCAO.
- item_original_id pode apontar para PRODUTO ou COMBO.
- Promoção não pode apontar para INGREDIENTE.
- Promoção não tem ingredientes próprios.

==================================================
BACKEND
==================================================

Criar ou ajustar endpoints para:

1. Ingredientes

- criar ingrediente
- listar ingredientes
- editar ingrediente
- desativar ingrediente
- atualizar quantidade do estoque

2. Produtos

- criar produto
- listar produtos
- editar produto
- desativar produto
- vincular ingredientes ao produto
- buscar receita do produto

3. Combos

- criar combo
- listar combos
- editar combo
- desativar combo
- vincular produtos ao combo

4. Promoções

- criar promoção
- listar promoções
- editar promoção
- desativar promoção
- vincular promoção a produto ou combo

5. Cardápio

- listar apenas itens com aparece_cardapio = true
- listar apenas itens com ativo = true
- não listar ingredientes no cardápio
- permitir filtro por categoria
- permitir filtro por tipo
- se categoria = todos, retornar todos os itens ativos do cardápio

6. Pedidos

Ao criar pedido:

- receber itens vendidos
- identificar se cada item é PRODUTO, COMBO ou PROMOCAO
- calcular ingredientes necessários
- verificar estoque suficiente
- se faltar estoque, bloquear pedido e retornar erro claro
- se tiver estoque, criar pedido
- baixar estoque dos ingredientes
- registrar movimentação de estoque, se já existir estrutura para isso

7. Caixa

Ao finalizar venda:

- registrar valor total
- registrar forma de pagamento
- registrar itens vendidos
- registrar desconto se houver promoção
- registrar data e hora
- registrar status do pagamento

==================================================
FUNÇÕES OBRIGATÓRIAS DO BACKEND
==================================================

Criar função:

converterParaBase(quantidade, unidade)

Regras:

Se unidade = kg:
retornar quantidade * 1000 com unidade_base = gr

Se unidade = gr:
retornar quantidade com unidade_base = gr

Se unidade = li:
retornar quantidade * 1000 com unidade_base = ml

Se unidade = ml:
retornar quantidade com unidade_base = ml

--------------------------------------------------

Criar função:

calcularEstoqueBase(dadosIngrediente)

Regras:

Se tipo_entrada = cx:

quantidade_total = quantidade_entrada * pacotes_por_caixa * quantidade_por_pacote

Depois converter quantidade_total usando unidade_medida.

Se tipo_entrada = pacote:

quantidade_total = quantidade_entrada * quantidade_por_pacote

Depois converter quantidade_total usando unidade_medida.

Se tipo_entrada = medida:

quantidade_total = quantidade_entrada

Depois converter quantidade_total usando unidade_medida.

--------------------------------------------------

Criar função:

resolverIngredientesDoItem(itemId, quantidadeVendida)

Essa função deve resolver quais ingredientes precisam ser baixados do estoque.

Regras:

Se item.tipo = PRODUTO:

- buscar ingredientes em produto_ingredientes
- multiplicar quantidade_usada_base pela quantidadeVendida
- retornar lista final de ingredientes

Se item.tipo = COMBO:

- buscar produtos em combo_itens
- para cada produto, buscar ingredientes em produto_ingredientes
- multiplicar:

quantidade_usada_base_do_ingrediente * quantidade_do_produto_no_combo * quantidadeVendida

Se item.tipo = PROMOCAO:

- buscar item_original_id na tabela promocoes
- chamar novamente resolverIngredientesDoItem(item_original_id, quantidadeVendida)

Se item.tipo = INGREDIENTE:

- não permitir venda direta como item de pedido
- retornar erro

--------------------------------------------------

Criar função:

verificarEstoqueSuficiente(ingredientesNecessarios)

Regras:

- para cada ingrediente necessário, comparar quantidade necessária com quantidade_total_base do estoque
- unidade_base precisa ser igual
- se quantidade necessária for maior que estoque disponível, retornar erro
- informar qual ingrediente está faltando

--------------------------------------------------

Criar função:

baixarEstoque(ingredientesNecessarios)

Regras:

- baixar apenas ingredientes
- atualizar quantidade_total_base
- não baixar estoque de produto
- não baixar estoque de combo
- não baixar estoque de promoção

==================================================
EXEMPLO COMPLETO DE BAIXA DE ESTOQUE
==================================================

Ingrediente Batata cadastrado:

Tipo entrada: cx
Quantidade entrada: 2
Pacotes por caixa: 10
Quantidade por pacote: 1
Unidade medida: kg

Cálculo:

2 x 10 x 1 kg = 20 kg
20 kg = 20000 gr

Estoque salvo:

quantidade_total_base = 20000
unidade_base = gr

Produto Fritas:

usa 300 gr de Batata

Produto X-Burger:

usa 20 gr de Molho

Combo X-Burger:

- 1 X-Burger
- 1 Fritas
- 1 Coca-Cola

Ao vender 2 Combo X-Burger:

Sistema calcula:

Fritas:
300 gr x 2 = 600 gr de Batata

X-Burger:
20 gr x 2 = 40 gr de Molho

Depois baixa do estoque:

Batata:
20000 gr - 600 gr = 19400 gr

Molho:
estoque atual - 40 gr

==================================================
FRONTEND
==================================================

Criar ou ajustar telas:

1. Tela de Cadastro de Item

Campo tipo com opções:

- INGREDIENTE
- PRODUTO
- COMBO
- PROMOCAO

O formulário deve mudar conforme o tipo selecionado.

--------------------------------------------------
2. Formulário de Ingrediente
--------------------------------------------------

Mostrar:

- nome
- categoria
- tipo_entrada

tipo_entrada deve ter opções:

- cx
- pacote
- medida

Se tipo_entrada = cx, mostrar:

- quantidade_caixas
- pacotes_por_caixa
- quantidade_por_pacote
- unidade_medida

Se tipo_entrada = pacote, mostrar:

- quantidade_pacotes
- quantidade_por_pacote
- unidade_medida

Se tipo_entrada = medida, mostrar:

- quantidade
- unidade_medida

unidade_medida deve ter opções:

- gr
- kg
- ml
- li

Não mostrar:

- preco_compra
- custo_unitario
- validade
- estoque_minimo
- alerta de estoque baixo

--------------------------------------------------
3. Formulário de Produto
--------------------------------------------------

Campos:

- nome
- categoria
- preco_venda
- ingredientes usados
- quantidade usada de cada ingrediente
- unidade usada
- ativo

Ao selecionar ingrediente em produto, permitir informar:

- quantidade_usada
- unidade_usada

unidade_usada deve ter opções:

- gr
- kg
- ml
- li

O frontend pode mostrar a quantidade original, mas o backend deve salvar convertida em quantidade_usada_base.

--------------------------------------------------
4. Formulário de Combo
--------------------------------------------------

Campos:

- nome
- categoria = combo
- preco_venda
- produtos dentro do combo
- quantidade de cada produto
- ativo

--------------------------------------------------
5. Formulário de Promoção
--------------------------------------------------

Campos:

- nome
- categoria = promoção
- item original: produto ou combo
- preco_promocional
- data_inicio
- data_fim
- ativo

--------------------------------------------------
6. Tela de Cardápio
--------------------------------------------------

- listar produtos, combos e promoções
- não listar ingredientes
- filtro por categoria
- filtro "todos" apenas no frontend
- filtro por tipo, se necessário

--------------------------------------------------
7. Tela de Pedido/Caixa
--------------------------------------------------

- listar itens do cardápio
- adicionar item ao pedido
- calcular total
- finalizar venda
- chamar backend para verificar estoque
- chamar backend para baixar estoque
- mostrar erro se faltar ingrediente

==================================================
REGRAS IMPORTANTES
==================================================

- Ingrediente controla estoque.
- Produto baixa ingredientes.
- Combo junta produtos.
- Promoção aponta para produto ou combo.
- Estoque só baixa ingrediente.
- Ingrediente não aparece no cardápio.
- Produto pode ter 1 ou vários ingredientes.
- Combo não tem ingredientes diretos.
- Promoção não tem ingredientes próprios.
- Não criar PRODUTO_SIMPLES.
- Não criar PRODUTO_COMPOSTO.
- Não criar estoque_minimo.
- Não criar alerta de estoque baixo.
- Não criar preco_compra.
- Não criar custo_unitario.
- Não criar validade.
- Não salvar categoria "todos" no banco.
- Não baixar estoque de combo diretamente.
- Não baixar estoque de promoção diretamente.
- Não permitir ingrediente no pedido.
- Não misturar ingrediente com produto vendido.
- Sempre converter kg para gr.
- Sempre converter li para ml.
- Sempre baixar estoque usando quantidade_total_base.
- Sempre comparar estoque usando unidade_base.

==================================================
ORDEM DE IMPLEMENTAÇÃO
==================================================

1. Analisar a estrutura atual do projeto.
2. Ajustar banco/migrations.
3. Remover qualquer lógica antiga de PRODUTO_SIMPLES e PRODUTO_COMPOSTO.
4. Remover estoque_minimo se existir.
5. Remover preco_compra, custo_unitario e validade se estiverem na nova tela.
6. Criar/ajustar tabela itens.
7. Criar/ajustar tabela estoque_ingredientes com lógica de caixa, pacote e medida.
8. Criar/ajustar tabela produto_ingredientes.
9. Criar/ajustar tabela combo_itens.
10. Criar/ajustar tabela promocoes.
11. Criar função converterParaBase.
12. Criar função calcularEstoqueBase.
13. Criar função resolverIngredientesDoItem.
14. Criar função verificarEstoqueSuficiente.
15. Criar função baixarEstoque.
16. Criar endpoints de ingredientes.
17. Criar endpoints de produtos.
18. Criar endpoints de combos.
19. Criar endpoints de promoções.
20. Ajustar criação de pedidos para verificar e baixar estoque.
21. Ajustar caixa para registrar venda.
22. Ajustar frontend de cadastro de item.
23. Ajustar frontend de estoque.
24. Ajustar frontend de cardápio.
25. Ajustar frontend de pedidos/caixa.
26. Testar fluxo completo.

==================================================
TESTES MÍNIMOS
==================================================

Criar ingredientes:

1. Batata

Entrada:
- tipo_entrada: cx
- quantidade_entrada: 2
- pacotes_por_caixa: 10
- quantidade_por_pacote: 1
- unidade_medida: kg

Resultado esperado:
- quantidade_total_base: 20000
- unidade_base: gr

2. Molho

Entrada:
- tipo_entrada: pacote
- quantidade_entrada: 5
- quantidade_por_pacote: 500
- unidade_medida: gr

Resultado esperado:
- quantidade_total_base: 2500
- unidade_base: gr

3. Refrigerante

Entrada:
- tipo_entrada: medida
- quantidade_entrada: 10
- unidade_medida: li

Resultado esperado:
- quantidade_total_base: 10000
- unidade_base: ml

Criar produtos:

1. X-Burger

Ingredientes:
- molho: 20 gr

2. Fritas

Ingredientes:
- batata: 300 gr

3. Coca-Cola

Ingredientes:
- refrigerante: 350 ml

Criar combo:

Combo X-Burger:

- X-Burger: 1
- Fritas: 1
- Coca-Cola: 1

Criar promoção:

Promoção Segunda:

- item original: Combo X-Burger
- preço promocional: 25.00

Testar venda:

- vender 1 X-Burger
- vender 1 Fritas
- vender 1 Combo X-Burger
- vender 1 Promoção Segunda

Resultado esperado:

- estoque dos ingredientes baixa corretamente
- pedido é registrado
- caixa registra o valor correto
- se faltar estoque, pedido é bloqueado
- conversão kg para gr funciona
- conversão li para ml funciona

==================================================
NÃO FAZER
==================================================

- não criar produto simples
- não criar produto composto
- não criar estoque mínimo
- não criar alerta de estoque baixo
- não criar preço de compra no ingrediente
- não criar custo unitário
- não criar validade
- não salvar categoria "todos" no banco
- não baixar estoque de combo diretamente
- não baixar estoque de promoção diretamente
- não misturar ingrediente com produto vendido
- não permitir ingrediente no pedido
- não comparar kg com gr sem converter
- não comparar li com ml sem converter

==================================================
ENTREGA ESPERADA
==================================================

Entregar o código funcionando no padrão atual do projeto.

Manter a organização existente de pastas, rotas, controllers, services e models.

No final, explicar:

- quais arquivos foram criados
- quais arquivos foram alterados
- quais endpoints foram adicionados
- quais tabelas foram criadas ou alteradas
- como testar o fluxo completo