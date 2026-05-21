# Plano do backend - BurgerFlow 2.0

Atualizado em: 2026-05-19.

Este plano reflete a fase atual do projeto. A ideia anterior de reconstruir um
ERP maior fica para depois; agora o foco e manter o MVP simples funcionando.

## Stack atual

- Node.js
- Express
- MySQL
- JWT
- bcrypt
- MVC simples com Service e Repository

Padrao:

```text
Route -> Controller -> Service -> Repository -> MySQL
```

## Escopo da fase atual

- Auth basico
- Cadastro de itens
- Cardapio
- Estoque de ingredientes
- Combos
- Promocoes
- Pedidos
- Caixa/PDV
- Cozinha basica

## Tipos permitidos

- `INGREDIENTE`
- `PRODUTO`
- `COMBO`
- `PROMOCAO`

Fora do escopo:

- `PRODUTO_SIMPLES`
- `PRODUTO_COMPOSTO`
- custo/lucro real
- estoque minimo
- alerta de estoque baixo
- validade
- Node-RED
- microservicos
- multi-loja
- Prisma

## Regras de estoque

- Ingrediente controla estoque.
- Produto baixa ingredientes.
- Combo baixa produtos internos e seus ingredientes.
- Promocao usa a composicao do item original.
- O estoque baixa somente ingredientes.
- Estoque negativo e permitido.
- Venda nao e bloqueada por falta de estoque.
- Aviso de estoque negativo deve ser retornado ao frontend.

## Tabelas atuais

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

## Rotas atuais

Auth:

- `POST /api/auth/login`
- `GET /api/auth/verify`

Itens:

- `GET /api/itens`
- `GET /api/itens/:id`
- `POST /api/itens`
- `PUT /api/itens/:id`
- `DELETE /api/itens/:id`

Cardapio:

- `GET /api/cardapio`

Estoque:

- `GET /api/estoque`
- `POST /api/estoque/movimentar`
- `GET /api/estoque/historico`

Caixa:

- `GET /api/caixa/aberto`
- `POST /api/caixa/abrir`
- `POST /api/caixa/movimento`
- `POST /api/caixa/fechar`
- `GET /api/caixa/movimentos`

Pedidos:

- `GET /api/pedidos`
- `POST /api/pedidos`
- `PATCH /api/pedidos/:id/status`

Cozinha:

- `GET /api/cozinha/pedidos`
- `PATCH /api/cozinha/pedidos/:id/status`

## Proximas melhorias recomendadas

1. Rodar teste manual completo no navegador.
2. Centralizar helper de API no frontend.
3. Criar testes automatizados de backend para pedido e estoque negativo.
4. Melhorar permissoes por perfil antes de producao.
5. Depois do MVP, avaliar dashboard gerencial e relatorios.

## Validacoes da fase

- `node --check` nos arquivos alterados do backend.
- `npm run lint` em `frontend/`.
- `npm run build` em `frontend/`.
- smoke test de API com venda deixando estoque negativo.
- screenshot Playwright de `/caixa`.
