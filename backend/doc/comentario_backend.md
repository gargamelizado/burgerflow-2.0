# Comentario do backend - BurgerFlow 2.0

Atualizado em: 2026-05-15.

Este backend e uma API Express em CommonJS, com MySQL via `mysql2/promise`,
autenticacao JWT e senha com bcrypt. A estrutura principal segue o padrao
Route -> Controller -> Service -> Repository -> MySQL.

## Entrada da aplicacao

- `src/server.js`: carrega `.env`, importa `app` e escuta na porta
  `process.env.PORT || 3006`.
- `src/app.js`: configura `cors`, `express.json`, rota de health check,
  modulos da API, 404 e middleware de erro.
- `src/config/env.js`: define valores padrao de porta, banco e JWT.
- `src/config/db.js`: cria pool MySQL.
- `src/middlewares/auth.middleware.js`: valida header
  `Authorization: Bearer <token>` e grava o payload em `req.user`.
- `src/middlewares/error.middleware.js`: devolve JSON com `message`.

## Modulos montados

### Auth

Arquivos:

- `src/modules/auth/auth.routes.js`
- `src/modules/auth/auth.controller.js`
- `src/modules/auth/auth.service.js`
- `src/modules/auth/auth.repository.js`

Rotas:

- `POST /api/auth/login`
- `GET /api/auth/verify`

Comportamento:

- Login aceita `email` e `senha` ou `password`.
- Busca usuario por email na tabela `usuarios`.
- Bloqueia usuario inativo.
- Compara senha com bcrypt.
- Gera JWT com `id`, `email` e `nivel_acesso`.

### Produtos

Arquivos ativos:

- `src/modules/products/product.routes.js`
- `src/modules/products/product.controller.js`
- `src/modules/products/product.service.js`
- `src/modules/products/product.repository.js`

Rotas:

- `GET /api/produtos`
- `POST /api/produtos`
- `PUT /api/produtos/:id`
- `DELETE /api/produtos/:id`

Comportamento:

- Todas as rotas exigem token.
- Lista produtos ordenando por `id DESC`.
- Cria e edita `nome`, `categoria`, `tipo`, `preco`, `custo`,
  `quantidade_estoque`, `unidade` e `ativo`.
- Remove produto com `DELETE FROM produtos WHERE id = ?`.

Observacao:

- Existe tambem `src/routes/product.routes.js`, mas ele nao esta montado no
  `app.js`. Ele mistura uma rota simples antiga com conteudo duplicado; se for
  reaproveitado, deve ser limpo antes.

### Estoque

Arquivos:

- `src/modules/inventory/inventory.routes.js`
- `src/modules/inventory/inventory.controller.js`
- `src/modules/inventory/inventory.service.js`
- `src/modules/inventory/inventory.repository.js`

Rotas:

- `POST /api/estoque/movimentar`
- `GET /api/estoque/historico`

Comportamento:

- Valida `produto_id`, `tipo` e `quantidade`.
- `tipo` aceito: `entrada` ou `saida`.
- Atualiza `produtos.quantidade_estoque`.
- Grava historico em `movimentacoes_estoque`.

Pendente:

- A tabela `movimentacoes_estoque` nao existe em `databases/schema.sql`.

### Caixa

Arquivos:

- `src/modules/cash/cash.routes.js`
- `src/modules/cash/cash.controller.js`
- `src/modules/cash/cash.service.js`
- `src/modules/cash/cash.repository.js`

Rotas:

- `GET /api/caixa/aberto`
- `POST /api/caixa/abrir`
- `POST /api/caixa/fechar`
- `POST /api/caixa/movimento`
- `GET /api/caixa/movimentos`

Comportamento:

- So permite um caixa aberto.
- Abertura valida valor inicial nao negativo.
- Movimentos aceitos: `suprimento` e `sangria`.
- Fechamento calcula valor esperado e diferenca.

Pendente:

- As tabelas `caixas` e `caixa_movimentos` nao existem em
  `databases/schema.sql`.

### Pedidos

Arquivos:

- `src/modules/orders/order.routes.js`
- `src/modules/orders/order.controller.js`
- `src/modules/orders/order.service.js`
- `src/modules/orders/order.repository.js`

Rotas:

- `GET /api/pedidos`
- `POST /api/pedidos`
- `PATCH /api/pedidos/:id/status`

Comportamento:

- Gera o proximo numero com `MAX(numero) + 1`.
- Cria pedido com status inicial `novo`.
- Status aceitos: `novo`, `em_preparo`, `pronto`, `entregue`, `cancelado`.

Pendente:

- A tabela `pedidos` nao existe em `databases/schema.sql`.
- Ainda nao existem itens do pedido, pagamentos ou baixa automatica de estoque.

### Cozinha

Arquivos:

- `src/modules/kitchen/kitchen.routes.js`
- `src/modules/kitchen/kitchen.controller.js`
- `src/modules/kitchen/kitchen.service.js`
- `src/modules/kitchen/kitchen.repository.js`

Rotas:

- `GET /api/cozinha/pedidos`
- `PATCH /api/cozinha/pedidos/:id/status`

Comportamento:

- Lista pedidos que nao estao `entregue` nem `cancelado`.
- Permite status `novo`, `em_preparo`, `pronto` e `entregue`.

Pendente:

- Depende da tabela `pedidos`, que ainda nao esta no schema atual.

## Banco de dados atual

`databases/schema.sql` cria:

- `usuarios`
- `produtos`
- `auditoria`

`databases/seed.sql` cria/atualiza:

- Usuario `admin@estoque.com`.

Credenciais documentadas para teste:

- Email: `admin@estoque.com`
- Senha esperada pelo hash atual: `admin123`

## Problemas atuais a corrigir

1. Completar `databases/schema.sql` com as tabelas usadas pelo backend ativo:
   `movimentacoes_estoque`, `caixas`, `caixa_movimentos` e `pedidos`.
2. Remover comandos SQL de `backend/.env`.
3. Conferir se `src/routes/product.routes.js` ainda tem utilidade; hoje o
   produto ativo esta em `src/modules/products/`.
4. Avaliar regras de permissao por papel. Hoje basta estar autenticado; nao ha
   controle por `admin`, `operador` ou `cozinha` nas rotas de negocio.
5. Criar smoke test de API depois que o schema estiver completo.

## Validacao executada

Foi executado `node --check` nos principais arquivos do backend, incluindo
`app.js`, `server.js`, rotas dos modulos e `src/routes/product.routes.js`.

Resultado: sintaxe OK.

Observacao importante: sintaxe OK nao garante que todos os endpoints rodem,
porque varios endpoints dependem de tabelas ausentes no schema atual.
