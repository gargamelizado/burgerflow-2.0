# Comentario geral - BurgerFlow 2.0

Atualizado em: 2026-05-19.

Este arquivo resume o estado atual do projeto para evitar confusao entre o MVP
basico implementado agora e planos maiores de ERP/PDV para fases futuras.

## Visao geral

O projeto esta organizado como um monorepo simples:

- `backend/`: API Node.js com Express, MySQL, JWT e bcrypt.
- `frontend/`: aplicacao React + Vite.
- `databases/`: schema, seed e migracao incremental do modelo basico.
- `backend exemplo/`: referencia antiga/maior, nao e o backend ativo.

O escopo atual esta limitado a:

- cardapio
- estoque
- pedidos
- caixa/PDV

## Modelo atual

Tipos de item aceitos:

- `INGREDIENTE`
- `PRODUTO`
- `COMBO`
- `PROMOCAO`

Regras do modelo:

- ingrediente controla estoque e nao aparece no cardapio
- produto vende no cardapio e baixa ingredientes
- combo vende no cardapio e contem produtos
- promocao aponta para produto ou combo
- o estoque baixa apenas ingredientes
- o estoque pode ficar negativo
- venda nao e bloqueada por falta de estoque
- avisos de estoque negativo podem aparecer para o usuario

Nao fazem parte do MVP atual:

- `PRODUTO_SIMPLES`
- `PRODUTO_COMPOSTO`
- `preco_compra`
- `custo_unitario`
- `validade`
- `estoque_minimo`
- alerta de estoque baixo

## Backend atual

Rotas principais montadas em `backend/src/app.js`:

- `GET /api/health`
- `POST /api/auth/login`
- `GET /api/auth/verify`
- `GET /api/itens`
- `GET /api/itens/:id`
- `POST /api/itens`
- `PUT /api/itens/:id`
- `DELETE /api/itens/:id`
- `GET /api/produtos`
- `POST /api/produtos`
- `GET /api/ingredientes`
- `POST /api/ingredientes`
- `GET /api/combos`
- `POST /api/combos`
- `GET /api/promocoes`
- `POST /api/promocoes`
- `GET /api/cardapio`
- `GET /api/estoque`
- `POST /api/estoque/movimentar`
- `GET /api/estoque/historico`
- `GET /api/caixa/aberto`
- `POST /api/caixa/abrir`
- `POST /api/caixa/fechar`
- `POST /api/caixa/movimento`
- `GET /api/caixa/movimentos`
- `GET /api/pedidos`
- `POST /api/pedidos`
- `PATCH /api/pedidos/:id/status`
- `GET /api/cozinha/pedidos`
- `PATCH /api/cozinha/pedidos/:id/status`

O backend usa `PORT=3006` por padrao e banco MySQL `burger_flow_2_0`.

## Banco de dados atual

`databases/schema.sql` cria o modelo atual completo do MVP:

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

`databases/migration_cardapio_estoque_basico.sql` existe para atualizar banco
antigo sem recriar tudo do zero.

## Frontend atual

Rotas registradas em `frontend/src/App.jsx`:

- `/login`
- `/dashboard`
- `/pedidos`
- `/cardapio`
- `/estoque`
- `/caixa`
- `/cozinha`

Telas principais:

- Login
- Dashboard
- Pedidos
- Cardapio / Cadastrar Item
- Estoque
- Caixa com PDV
- Cozinha

Mensagens importantes do fluxo foram migradas para popups dentro da tela.
Nao ha uso ativo de `alert`, `confirm`, `prompt` ou `window.*` em
`frontend/src`.

## Fluxo de venda atual

1. Usuario abre caixa.
2. PDV lista itens do cardapio.
3. Usuario adiciona produto, combo ou promocao ao pedido.
4. Frontend envia pedido para `POST /api/pedidos`.
5. Backend resolve ingredientes.
6. Backend calcula avisos de estoque negativo.
7. Backend cria pedido e itens.
8. Backend baixa estoque dos ingredientes, permitindo negativo.
9. Backend registra movimento de caixa do tipo `venda`.
10. Frontend mostra sucesso e, se existir, aviso de estoque negativo.

## Validacao executada

Evidencias ja executadas nesta fase:

- schema aplicado em MySQL
- migracao aplicada em MySQL
- sintaxe do backend verificada com `node --check`
- `npm run lint` no frontend passou
- `npm run build` no frontend passou
- smoke test de API para cadastro/receita duplicada/venda com estoque negativo
- screenshot Playwright da rota `/caixa` carregando PDV

## Pendencias recomendadas

- Rodar checklist manual completo no navegador.
- Centralizar configuracao de API do frontend.
- Criar testes automatizados de API para o fluxo de pedido e estoque negativo.
- Revisar permissao por papel em rotas sensiveis antes de usar em producao.
