# Comentario do backend - BurgerFlow 2.0

Atualizado em: 2026-05-19.

Este backend e uma API Express em CommonJS, com MySQL via `mysql2/promise`,
autenticacao JWT e senha com bcrypt. O padrao principal continua sendo:

Route -> Controller -> Service -> Repository -> MySQL.

Nesta fase o escopo ativo e basico: cardapio, estoque, pedidos e caixa.

## Entrada da aplicacao

- `src/server.js`: carrega `.env`, importa `app` e escuta em
  `process.env.PORT || 3006`.
- `src/app.js`: configura `cors`, `express.json`, health check, rotas da API,
  404 e middleware de erro.
- `src/config/env.js`: define porta, banco e segredo JWT.
- `src/config/db.js`: cria pool MySQL.
- `src/middlewares/auth.middleware.js`: valida `Authorization: Bearer <token>`.
- `src/middlewares/error.middleware.js`: devolve erro em JSON.

## Tipos de item

Os unicos tipos aceitos nesta fase sao:

- `INGREDIENTE`
- `PRODUTO`
- `COMBO`
- `PROMOCAO`

Nao existe fluxo ativo de `PRODUTO_SIMPLES` ou `PRODUTO_COMPOSTO`.
Produto simples e apenas um `PRODUTO` com um ingrediente.

## Regras principais

- Ingrediente controla estoque e nao aparece no cardapio.
- Produto aparece no cardapio e baixa ingredientes.
- Combo aparece no cardapio, contem produtos e baixa os ingredientes desses
  produtos.
- Promocao aparece no cardapio, aponta para um produto ou combo e baixa estoque
  como o item original.
- A categoria `todos` existe apenas como filtro do frontend. Ela nao deve ser
  salva no banco.
- Estoque e controlado por `quantidade_total_base` e `unidade_base`.
- Conversoes aceitas: `kg -> gr`, `gr -> gr`, `li -> ml`, `ml -> ml`.
- O pedido nao bloqueia venda por falta de estoque. Se o estoque ficar negativo,
  o backend retorna aviso em `avisos_estoque` e conclui a venda.

## Funcoes de regra

Arquivo: `src/utils/itemRules.js`

- `converterParaBase(quantidade, unidade)`
- `calcularEstoqueBase(dadosIngrediente)`
- validadores de tipo, categoria e unidades

Arquivo: `src/modules/orders/orderStock.service.js`

- `resolverIngredientesDoItem(itemId, quantidadeVendida)`
- `verificarEstoqueNegativo(ingredientesNecessarios)`
- `baixarEstoque(ingredientesNecessarios)`
- `mergeIngredientes(ingredientes)`

## Rotas montadas

### Auth

- `POST /api/auth/login`
- `GET /api/auth/verify`

### Itens

Base generica:

- `GET /api/itens`
- `GET /api/itens/:id`
- `POST /api/itens`
- `PUT /api/itens/:id`
- `DELETE /api/itens/:id`
- `GET /api/itens/cardapio`

Rotas por tipo, usando a mesma regra de itens:

- `GET /api/produtos`
- `POST /api/produtos`
- `GET /api/produtos/:id`
- `PUT /api/produtos/:id`
- `DELETE /api/produtos/:id`
- `GET /api/ingredientes`
- `POST /api/ingredientes`
- `GET /api/ingredientes/:id`
- `PUT /api/ingredientes/:id`
- `DELETE /api/ingredientes/:id`
- `GET /api/combos`
- `POST /api/combos`
- `GET /api/combos/:id`
- `PUT /api/combos/:id`
- `DELETE /api/combos/:id`
- `GET /api/promocoes`
- `POST /api/promocoes`
- `GET /api/promocoes/:id`
- `PUT /api/promocoes/:id`
- `DELETE /api/promocoes/:id`

`DELETE` desativa o item em vez de remover fisicamente.

### Cardapio

- `GET /api/cardapio`

Regras:

- lista apenas itens ativos
- lista apenas `aparece_cardapio = true`
- nao lista ingrediente
- aceita filtros `categoria` e `tipo`
- `categoria=todos` retorna todos os itens ativos do cardapio

### Estoque

- `GET /api/estoque`
- `POST /api/estoque/movimentar`
- `GET /api/estoque/historico`

Regras:

- movimenta apenas ingredientes
- aceita `entrada`, `saida` e `ajuste`
- permite saldo negativo
- registra historico em `movimentacoes_estoque`

### Caixa

- `GET /api/caixa/aberto`
- `POST /api/caixa/abrir`
- `POST /api/caixa/fechar`
- `POST /api/caixa/movimento`
- `GET /api/caixa/movimentos`

Regras:

- so permite um caixa aberto.
- movimento manual aceita `suprimento` e `sangria`.
- venda de PDV e registrada pelo fluxo de pedido como movimento `venda`.
- fechamento calcula valor esperado e diferenca.

### Pedidos

- `GET /api/pedidos`
- `POST /api/pedidos`
- `PATCH /api/pedidos/:id/status`

Ao criar pedido:

- recebe itens vendidos
- rejeita ingrediente como item vendido
- resolve ingredientes de produto, combo ou promocao
- calcula avisos de estoque negativo
- cria pedido e itens
- baixa estoque mesmo que fique negativo
- registra movimentacao de estoque
- registra movimento de caixa do tipo `venda`
- retorna `avisos_estoque` quando algum ingrediente ficar negativo

### Cozinha

- `GET /api/cozinha/pedidos`
- `PATCH /api/cozinha/pedidos/:id/status`

Lista pedidos que nao estao `entregue` nem `cancelado`.

## Banco de dados

`databases/schema.sql` cria as tabelas principais:

- `usuarios`
- `itens`
- `estoque_ingredientes`
- `produto_ingredientes`
- `combo_itens`
- `promocoes`
- `caixas`
- `pedidos`
- `pedido_itens`
- `movimentacoes_estoque`
- `caixa_movimentos`
- `auditoria`

`databases/migration_cardapio_estoque_basico.sql` e a migracao incremental para
levar um banco antigo para este modelo basico.

Campos que nao fazem parte desta fase:

- `preco_compra`
- `custo_unitario`
- `validade`
- `estoque_minimo`
- alerta de estoque baixo

## Credencial de teste

O seed cria/atualiza:

- email: `admin@estoque.com`
- senha: `admin123`

## Validacao executada

Validacoes ja executadas nesta fase:

- `mysql -uroot -p123456789 < databases/schema.sql`
- `mysql -uroot -p123456789 < databases/migration_cardapio_estoque_basico.sql`
- `node --check` nos arquivos JS alterados do backend
- `npm run lint` em `frontend/`
- `npm run build` em `frontend/`
- smoke test de API com produto duplicando ingrediente na receita, agrupando em
  uma linha e vendendo com estoque negativo permitido
- screenshot Playwright da rota `/caixa` carregando a tela de PDV

## Pendencias conhecidas

- Centralizar `API_URL`, `getToken` e tratamento de resposta do frontend em um
  helper unico.
- Fazer uma bateria manual completa no navegador para login, cadastro de todos
  os tipos, venda, estoque negativo, pedidos, cozinha e fechamento de caixa.
- Criar testes automatizados de API quando o MVP estabilizar.
