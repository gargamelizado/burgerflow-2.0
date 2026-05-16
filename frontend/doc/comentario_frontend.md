# Comentario do frontend - BurgerFlow 2.0

Atualizado em: 2026-05-15.

O frontend e uma aplicacao React + Vite com `react-router`. A autenticacao e
controlada no cliente por `localStorage`, usando `isLoggedIn`, `token` e
`usuario`.

## Entrada e rotas

Arquivos principais:

- `src/main.jsx`: entrada do React.
- `src/App.jsx`: define estado de login e rotas.
- `src/components/Layout/MainLayout.jsx`: menu lateral e botao sair.

Rotas registradas em `App.jsx`:

- `/login`
- `/dashboard`
- `/pedidos`
- `/cardapio`
- `/estoque`
- `/cozinha`
- `*` redireciona para `/login`

Ponto de atencao:

- `MainLayout.jsx` tem link para `/caixa`, e `App.jsx` importa `Caixa`, mas a
  rota `/caixa` nao esta registrada. Hoje clicar em Caixa cai no wildcard e
  redireciona para login.

## Telas

### Login

Arquivo: `src/components/Login/Login.jsx`

- Envia `POST http://localhost:3006/api/auth/login`.
- Envia `email` e `senha`.
- Salva `token`, `usuario` e `isLoggedIn` no `localStorage`.
- Redireciona para `/dashboard`.

Pendente:

- A URL da API esta fixa no componente.
- O `catch (error)` nao usa a variavel `error`, gerando erro de lint.

### Dashboard

Arquivo: `src/components/Dashboard/Dashboard.jsx`

- Tela estatica com cards de pedidos, vendas e itens no cardapio.

Pendente:

- Ainda nao consome API para exibir numeros reais.

### Cardapio

Arquivo: `src/components/Cardapio/Cardapio.jsx`

- Lista produtos.
- Cadastra produtos.
- Edita produtos em modal.
- Deleta produtos apos confirmacao.
- Usa `src/services/productService.js`.

API consumida:

- `GET /api/produtos`
- `POST /api/produtos`
- `PUT /api/produtos/:id`
- `DELETE /api/produtos/:id`

Pendente:

- O formulario principal nao mostra campo de categoria, apesar da tabela exibir
  categoria e o state possuir `categoria`.
- A edicao tambem nao mostra campo de categoria.

### Estoque

Arquivo: `src/components/Estoque/Estoque.jsx`

- Lista produtos.
- Registra entrada e saida de estoque.
- Lista historico de movimentacoes.
- Usa `src/services/stockService.js`.

API consumida:

- `GET /api/produtos`
- `POST /api/estoque/movimentar`
- `GET /api/estoque/historico`

Pendente:

- Depende da tabela `movimentacoes_estoque`, ausente no schema atual do banco.

### Pedidos

Arquivo: `src/components/Pedidos/Pedidos.jsx`

- Cria pedidos.
- Lista pedidos.
- Atualiza status pelo select.
- Usa `src/services/orderService.js`.

API consumida:

- `GET /api/pedidos`
- `POST /api/pedidos`
- `PATCH /api/pedidos/:id/status`

Pendente:

- Depende da tabela `pedidos`, ausente no schema atual.
- Ainda nao possui itens do pedido nem integracao real com PDV/venda.

### Cozinha

Arquivo: `src/components/Cozinha/Cozinha.jsx`

- Lista pedidos pendentes.
- Permite mudar status para `em_preparo`, `pronto` e `entregue`.
- Usa `src/services/kitchenService.js`.

API consumida:

- `GET /api/cozinha/pedidos`
- `PATCH /api/cozinha/pedidos/:id/status`

Pendente:

- Depende da tabela `pedidos`, ausente no schema atual.
- Ainda nao separa pedidos por estacao de preparo.

### Caixa

Arquivo: `src/components/Caixa/Caixa.jsx`

- Busca caixa aberto.
- Abre caixa.
- Registra suprimento e sangria.
- Lista movimentos.
- Fecha caixa calculando saldo esperado e diferenca.
- Usa `src/services/cashService.js`.

API consumida:

- `GET /api/caixa/aberto`
- `POST /api/caixa/abrir`
- `POST /api/caixa/movimento`
- `GET /api/caixa/movimentos`
- `POST /api/caixa/fechar`

Pendente:

- A tela nao esta acessivel por rota.
- Depende de `caixas` e `caixa_movimentos`, ausentes no schema atual.

### PDV e composicao

Arquivos:

- `src/components/PDV/PDV.jsx`
- `src/components/ProductCompositionEditor/ProductCompositionEditor.jsx`

Estado atual:

- Sao placeholders simples, sem fluxo real implementado.

## Services

Services existentes:

- `productService.js`
- `stockService.js`
- `cashService.js`
- `orderService.js`
- `kitchenService.js`

Todos repetem:

- `const API_URL = 'http://localhost:3006/api'`
- `getToken()`
- `tratarResposta()`

Pendente:

- Centralizar isso em um arquivo unico. O arquivo
  `src/components/config/api.js` existe, mas esta vazio.

## Validacao executada

Comandos executados em `frontend/`:

- `npm run build`: passou.
- `npm run lint`: falhou com 18 erros.

Erros principais do lint:

- `React` importado e nao usado em varios componentes.
- `Caixa` importado em `App.jsx`, mas nao usado em rota.
- `react-hooks/set-state-in-effect` em `Cardapio`, `Estoque`, `Pedidos`,
  `Cozinha` e `Caixa`.
- `error` nao usado no `catch` do login.

## Proximos ajustes recomendados

1. Registrar `/caixa` em `App.jsx`.
2. Centralizar configuracao da API.
3. Remover imports `React` desnecessarios ou ajustar regra de lint.
4. Resolver a regra `react-hooks/set-state-in-effect` conforme o padrao do
   projeto.
5. Mostrar categoria nos formularios de produto.
6. So validar telas de estoque, pedidos, cozinha e caixa em runtime depois que
   o schema do backend tiver as tabelas necessarias.
