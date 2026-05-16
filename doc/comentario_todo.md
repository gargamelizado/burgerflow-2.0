# Comentario geral - BurgerFlow 2.0

Atualizado em: 2026-05-15.

Este arquivo resume o estado atual do projeto inteiro. Ele deve ser usado como
guia rapido antes de mexer no codigo, para nao confundir o que ja esta
implementado com o que ainda esta incompleto.

## Visao geral

O projeto esta organizado como um monorepo simples:

- `backend/`: API Node.js com Express, MySQL, JWT e bcrypt.
- `frontend/`: aplicacao React + Vite.
- `databases/`: scripts SQL atuais para criar o banco e usuario inicial.
- `backend exemplo/`: referencia maior, com arquitetura e tabelas de futuro ERP.

O caminho principal hoje e manter o sistema funcionando de forma basica, sem
apagar a estrutura MVC do backend. A regra importante e preservar os modulos em
`backend/src/modules/` para evolucao futura.

## Estado atual do backend

O backend sobe a partir de `backend/src/server.js` e monta a API em
`backend/src/app.js`.

Rotas montadas hoje:

- `GET /api/health`
- `POST /api/auth/login`
- `GET /api/auth/verify`
- `GET /api/produtos`
- `POST /api/produtos`
- `PUT /api/produtos/:id`
- `DELETE /api/produtos/:id`
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

## Estado atual do frontend

O frontend tem telas para:

- Login.
- Dashboard.
- Pedidos.
- Cardapio/produtos.
- Estoque.
- Cozinha.
- Caixa, mas a rota `/caixa` ainda nao esta registrada em `App.jsx`.

Os services chamam a API diretamente em `http://localhost:3006/api`.

## Pontos de atencao

1. `databases/schema.sql` so cria `usuarios`, `produtos` e `auditoria`.
   Os modulos de estoque, caixa, pedidos e cozinha ja consultam tabelas que nao
   existem nesse schema atual, como `movimentacoes_estoque`, `caixas`,
   `caixa_movimentos` e `pedidos`.

2. `backend/.env` contem comandos SQL no fim do arquivo, a partir de
   `USE burger_flow_2_0;`. Isso nao deveria ficar em `.env`; deve virar script
   `.sql` separado ou ser removido do arquivo de ambiente.

3. `backend/src/routes/product.routes.js` existe como uma rota simples antiga,
   mas nao esta montada no `app.js`. O backend atual usa
   `backend/src/modules/products/product.routes.js`.

4. `frontend/src/components/config/api.js` esta vazio. Os services repetem a
   constante `API_URL` e a funcao de tratamento de resposta.

5. O menu mostra `Caixa`, mas `frontend/src/App.jsx` nao possui
   `<Route path="/caixa" ...>`.

6. `PDV` e `ProductCompositionEditor` existem apenas como placeholders.

7. `mapa-rotas-backend.txt` e `mapa-arquivos-backend.txt` ainda apontam para
   `backend exemplo/`, entao nao representam fielmente o backend ativo.

## Validacao executada

Comandos executados em 2026-05-15:

- `node --check` nos principais arquivos do backend: passou.
- `npm run build` em `frontend/`: passou.
- `npm run lint` em `frontend/`: falhou com 18 erros.

Principais erros do lint:

- Imports `React` nao usados em varios componentes.
- `Caixa` importado em `App.jsx`, mas ainda nao usado por uma rota.
- Regra `react-hooks/set-state-in-effect` em componentes que carregam dados no
  `useEffect`.
- Variavel `error` nao usada no `catch` do login.

## Prioridades recomendadas

1. Corrigir `databases/schema.sql` para incluir as tabelas usadas pelos modulos
   ja montados: estoque, caixa e pedidos.
2. Limpar `backend/.env`, tirando SQL de dentro dele.
3. Registrar a rota `/caixa` no frontend ou remover o link do menu ate a tela
   estar liberada.
4. Centralizar `API_URL`, `getToken` e `tratarResposta` em um helper unico.
5. Decidir se `backend/src/routes/product.routes.js` sera removido, corrigido ou
   mantido apenas como referencia.
6. Corrigir o lint do frontend.
7. Depois disso, rodar smoke test completo: login, produtos, estoque, caixa,
   pedidos e cozinha.
