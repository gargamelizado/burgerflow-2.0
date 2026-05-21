# Comentario do frontend - BurgerFlow 2.0

Atualizado em: 2026-05-19.

O frontend e uma aplicacao React + Vite com `react-router`. A autenticacao e
controlada no cliente por `localStorage`, usando `isLoggedIn`, `token` e
`usuario`.

## Entrada e rotas

Arquivos principais:

- `src/main.jsx`: entrada do React.
- `src/App.jsx`: define login e rotas.
- `src/components/Layout/MainLayout.jsx`: menu lateral e botao sair.

Rotas registradas:

- `/login`
- `/dashboard`
- `/pedidos`
- `/cardapio`
- `/estoque`
- `/caixa`
- `/cozinha`

## Mensagens e popups

As telas operacionais usam popup visual dentro da propria aplicacao para
sucesso, erro, confirmacao e avisos.

Checagem feita:

- `rg -n "\b(alert|confirm|prompt)\s*\(|window\." frontend/src`

Resultado esperado: sem ocorrencias.

## Telas

### Login

Arquivo: `src/components/Login/Login.jsx`

- envia `POST http://localhost:3006/api/auth/login`
- salva `token`, `usuario` e `isLoggedIn` no `localStorage`
- redireciona para `/dashboard`

### Dashboard

Arquivo: `src/components/Dashboard/Dashboard.jsx`

- tela inicial do sistema apos login
- mostra cards gerais do BurgerFlow

### Cardapio / Cadastrar Item

Arquivos:

- `src/components/Cardapio/Cardapio.jsx`
- `src/components/Cardapio/Cardapio.css`
- `src/services/productService.js`

Funcionalidades:

- lista itens cadastrados
- cadastra `INGREDIENTE`, `PRODUTO`, `COMBO` e `PROMOCAO`
- edita item em popup
- desativa item
- muda o formulario conforme o tipo selecionado
- nao salva categoria `todos`

Fluxos:

- ingrediente: entrada por `cx`, `pacote` ou `medida`
- produto: vincula um ou mais ingredientes
- combo: vincula produtos
- promocao: aponta para produto ou combo

APIs consumidas:

- `GET /api/itens`
- `GET /api/itens/:id`
- `POST /api/itens`
- `PUT /api/itens/:id`
- `DELETE /api/itens/:id`

### Estoque

Arquivos:

- `src/components/Estoque/Estoque.jsx`
- `src/components/Estoque/Estoque.css`
- `src/services/stockService.js`

Funcionalidades:

- lista apenas ingredientes em estoque
- registra entrada, saida ou ajuste
- permite estoque negativo
- mostra historico de movimentacoes
- usa popup para informar resultado ou erro

APIs consumidas:

- `GET /api/estoque`
- `POST /api/estoque/movimentar`
- `GET /api/estoque/historico`

### Caixa e PDV

Arquivos:

- `src/components/Caixa/Caixa.jsx`
- `src/components/Caixa/Caixa.css`
- `src/components/PDV/PDV.jsx`
- `src/components/PDV/PDV.css`
- `src/services/cashService.js`
- `src/services/orderService.js`

Caixa:

- busca caixa aberto
- abre caixa
- registra suprimento e sangria
- lista movimentos
- fecha caixa calculando valor esperado e diferenca

PDV:

- aparece dentro do caixa quando existe caixa aberto
- lista itens do cardapio
- filtra por categoria
- adiciona item ao pedido
- permite informar quantidade em popup
- calcula total
- finaliza pedido no backend
- mostra aviso visual se algum ingrediente ficar negativo
- nao bloqueia finalizar venda por falta de estoque

APIs consumidas:

- `GET /api/caixa/aberto`
- `POST /api/caixa/abrir`
- `POST /api/caixa/movimento`
- `GET /api/caixa/movimentos`
- `POST /api/caixa/fechar`
- `GET /api/cardapio`
- `POST /api/pedidos`

### Pedidos

Arquivo: `src/components/Pedidos/Pedidos.jsx`

- lista pedidos registrados
- muda status pelo select

APIs consumidas:

- `GET /api/pedidos`
- `PATCH /api/pedidos/:id/status`

### Cozinha

Arquivo: `src/components/Cozinha/Cozinha.jsx`

- lista pedidos pendentes
- muda status para `em_preparo`, `pronto` e `entregue`
- pedido entregue some da lista da cozinha

APIs consumidas:

- `GET /api/cozinha/pedidos`
- `PATCH /api/cozinha/pedidos/:id/status`

## Services

Services ativos:

- `productService.js`
- `stockService.js`
- `cashService.js`
- `orderService.js`
- `kitchenService.js`

Eles ainda repetem `API_URL`, `getToken` e tratamento de resposta.
Centralizar isso e uma pendencia tecnica, nao um bloqueio do MVP.

## Validacao executada

Comandos executados em `frontend/`:

- `npm run lint`: passou
- `npm run build`: passou

Tambem foi feito screenshot Playwright da rota `/caixa` com a tela de PDV
carregando.

## Pendencias

- Rodar teste manual completo no navegador para todos os fluxos.
- Centralizar helper de API.
- Criar testes automatizados de componentes ou smoke test E2E quando o fluxo
  estabilizar.
