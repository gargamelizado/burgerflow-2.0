# Comentario do frontend - BurgerFlow 2.0

Atualizado em: 2026-05-23.

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
- `/gerencial`

## Mensagens e popups

As telas operacionais usam popup/modal interno para sucesso, erro, confirmacao
e aviso.

Checagem:

- `rg -n "\b(alert|confirm|prompt)\s*\(|window\.(alert|confirm|prompt)" frontend/src`

Resultado atual: sem ocorrencias.

## Telas

### Login

Arquivo: `src/components/Login/Login.jsx`

- envia `POST http://localhost:3006/api/auth/login`
- salva `token`, `usuario` e `isLoggedIn` no `localStorage`
- redireciona para `/dashboard`
- backend expõe `GET http://localhost:3006/api/health` para validação de API antes de autenticar

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
- edita item em popup/modal ao clicar `Editar`
- filtra itens por texto, tipo, categoria, status e exibicao no cardapio
- desativa item
- muda o formulario conforme tipo selecionado
- nao salva categoria `todos`; essa opcao fica no filtro visual

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

- lista ingredientes em estoque
- registra `entrada`, `saida` e `ajuste`
- permite saldo negativo
- mostra historico de movimentacoes
- usa popup para retorno visual

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
- `src/config/api.js`
- `src/services/cashService.js`
- `src/services/orderService.js`

Caixa:

- mostra status do caixa, ID, usuario e data/hora de abertura
- mostra resumo detalhado:
  - valor inicial
  - total de vendas
  - vendas dinheiro
  - vendas Pix
  - vendas cartao credito
  - vendas cartao debito
  - vendas voucher
  - suprimentos
  - sangrias
  - despesas
  - valor esperado em dinheiro
- exibe historico de movimentos com tipo, valor, motivo, data e usuario
- não inclui formulários de abertura/fechamento de caixa ou movimentações manuais
- o fluxo de autorização gerencial no Caixa foi removido da UI atual

Regra de calculo:

- a previa no frontend e visual
- o calculo oficial de `valor_esperado` e `diferenca` e do backend

PDV:

- aparece dentro do caixa quando existe caixa aberto
- lista itens do cardapio
- filtra por categoria
- adiciona item ao pedido
- permite alterar quantidade em popup
- calcula total
- finaliza pedido no backend (`POST /api/pedidos`)
- mostra aviso visual se estoque ficar negativo

APIs consumidas:

- `GET /api/caixa/aberto`
- `GET /api/caixa/movimentos`
- `GET /api/cardapio`
- `POST /api/pedidos`

### Pedidos

Arquivo: `src/components/Pedidos/Pedidos.jsx`

- lista pedidos registrados
- muda status pelo select

APIs consumidas:

- `GET /api/pedidos`
- `PATCH /api/pedidos/:id/status`

### Cozinha (KDS)

Arquivos:

- `src/components/Cozinha/Cozinha.jsx`
- `src/components/Cozinha/Cozinha.css`
- `src/services/kitchenService.js`

Funcionalidades:

- visual em colunas por status: Novo/Recebido, Em preparo, Pronto, Entregue
- cards com numero, cliente, tipo/canal, horario, tempo e lista de itens
- destaque visual por tempo:
  - 0 a 5 min: normal
  - 5 a 10 min: atencao
  - acima de 10 min: atrasado
- filtros rapidos: Todos, Novos, Em preparo, Prontos
- botao `Atualizar pedidos`
- acoes por fluxo:
  - `novo` -> Iniciar preparo
  - `em_preparo` -> Marcar pronto
  - `pronto` -> Entregar

APIs consumidas:

- `GET /api/cozinha/pedidos`
- `PATCH /api/cozinha/pedidos/:id/status`

### Menu Gerencial

Arquivos:

- `src/components/Gerencial/Gerencial.jsx`
- `src/components/Gerencial/Gerencial.css`

Acesso:

- link no menu visivel apenas para `admin` e `gerente`
- acesso direto a `/gerencial` sem permissao mostra tela de acesso restrito

Blocos funcionais:

- Caixa Gerencial (status, resumo, abrir/fechar, movimentos e quanto tem no caixa)
- Pedidos Gerenciais (correcao de status com rota gerencial)
- Reimprimir comprovante (nao fiscal, com previa e `window.print`)
- Relatorio de produtos vendidos por periodo
- Usuarios (listar/cadastrar/editar/desativar/alterar senha por perfil)
- Alterar minha senha

APIs consumidas:

- `GET /api/caixa/aberto`
- `POST /api/caixa/abrir`
- `POST /api/caixa/fechar`
- `GET /api/caixa/movimentos`
- `GET /api/pedidos`
- `PATCH /api/pedidos/:id/status/gerencial`
- `GET /api/gerencial/relatorios/produtos-vendidos`
- `GET /api/usuarios`
- `POST /api/usuarios`
- `PUT /api/usuarios/:id`
- `PATCH /api/usuarios/:id/senha`
- `DELETE /api/usuarios/:id`
- `PATCH /api/auth/alterar-senha`

## Services

Services ativos:

- `productService.js`
- `stockService.js`
- `cashService.js`
- `orderService.js`
- `kitchenService.js`
- `userService.js`
- `reportService.js`
- `authService.js`

Pendencia tecnica conhecida:

- centralizacao parcial feita em `src/config/api.js` (adotada no `cashService`);
  ainda faltam os demais services migrarem para o mesmo helper.

## Validacao executada

Comandos executados em `frontend/`:

- `npm run lint`: passou
- `npm run build`: passou
- checagem sem uso de `alert/confirm/prompt/window.*`: passou

Validacao integrada com backend (smoke de API):

- fluxo principal via `POST /api/pedidos` funcionando
- autorizacao gerencial no caixa funcionando com token temporario
- fechamento de caixa em cenarios conferido/faltou/sobrou
- pedido aparecendo na cozinha
- transicao de status da cozinha ate `entregue`
- controle de acesso do menu gerencial por perfil
- autorizacao gerencial no caixa funcionando com token temporario
- fluxo de autorizacao para venda com estoque insuficiente definido como objetivo de UX; hoje a venda continua com aviso de estoque negativo
- usuarios sem token/permissao bloqueados nas rotas sensiveis
- relatorio gerencial funcionando para admin e gerente
- correcao gerencial de status funcionando para admin/gerente

## Pendencias

- Rodar checklist manual completo no navegador.
- Centralizar helper de API.
- Criar testes automatizados de componentes ou smoke E2E quando o fluxo
  estabilizar.
