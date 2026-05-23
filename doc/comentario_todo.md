# Comentario geral - BurgerFlow 2.0

Atualizado em: 2026-05-23.

Este arquivo resume o estado atual do projeto para evitar confusao entre o MVP
basico implementado agora e planos maiores de ERP/PDV para fases futuras.

## Visao geral

O projeto esta organizado como um monorepo simples:

- `backend/`: API Node.js com Express, MySQL, JWT e bcrypt.
- `frontend/`: aplicacao React + Vite.
- `databases/`: schema, seed e migracao incremental do modelo basico.
- `backend exemplo/`: referencia antiga/maior, nao e o backend ativo.

O escopo atual continua limitado a:

- cardapio
- estoque
- pedidos
- caixa/PDV
- menu gerencial (admin/gerente)

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
- `PATCH /api/auth/alterar-senha`
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
- `PATCH /api/pedidos/:id/status/gerencial`
- `GET /api/cozinha/pedidos`
- `PATCH /api/cozinha/pedidos/:id/status`
- `GET /api/usuarios`
- `POST /api/usuarios`
- `PUT /api/usuarios/:id`
- `PATCH /api/usuarios/:id/senha`
- `DELETE /api/usuarios/:id`
- `POST /api/gerencial/autorizar`
- `GET /api/gerencial/relatorios/produtos-vendidos`

O backend usa `PORT=3006` por padrao e banco MySQL `burger_flow_2_0`.

## Caixa (estado atual do MVP)

Fechamento de caixa e funcao gerencial de caixa implementados com regra oficial
no backend.

Calculo oficial:

`valor_esperado = valor_inicial + vendas_dinheiro + suprimentos - sangrias - despesas`

`diferenca = valor_final - valor_esperado`

No fechamento, o backend salva:

- `valor_final`
- `valor_esperado`
- `diferenca`
- `observacao`
- `status = fechado`
- `fechado_em`
- `usuario_fechamento_id`
- `gerente_autorizador_id` (quando houver override)

Validacoes ativas:

- nao fecha sem caixa aberto
- nao fecha caixa ja fechado
- nao aceita `valor_final` invalido/NaN
- nao fecha sem usuario autenticado
- exige observacao quando `diferenca != 0`
- vendedor nao fecha caixa sem autorizacao gerencial
- suprimento/sangria exigem motivo
- sangria acima do esperado exige autorizacao gerencial para usuario comum
- retorna erro em JSON

Autorizacao gerencial:

- endpoint `POST /api/gerencial/autorizar`
- valida gerente/admin por usuario/email + senha
- gera token temporario (15 minutos)
- token usado no header `x-gerencial-token`
- registra auditoria `caixa.autorizacao_gerencial`

## Cozinha (estado atual do MVP)

A tela da cozinha foi melhorada para um visual tipo KDS, sem mudar a regra de
pedido do MVP:

- continua lendo pedidos criados por `POST /api/pedidos`
- colunas por status: `novo`, `em_preparo`, `pronto`, `entregue`
- cards com numero, cliente, tipo, data/hora, tempo e itens do pedido
- acoes guiadas: Iniciar preparo -> Marcar pronto -> Entregar
- filtro rapido: Todos, Novos, Em preparo, Prontos
- botao de atualizar pedidos
- pedidos entregues ficam visiveis na coluna `entregue`

## Menu Gerencial (estado atual do MVP)

Rota frontend:

- `/gerencial`

Regras de acesso:

- link do menu so aparece para `admin` e `gerente`
- usuario sem permissao nao ve o link
- acesso direto sem permissao exibe tela de acesso restrito

Blocos implementados:

- Caixa Gerencial
- Pedidos (correcao de status)
- Reimprimir comprovante (nao fiscal)
- Relatorio de produtos vendidos por periodo
- Usuarios
- Alterar minha senha

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

Para a funcao gerencial de caixa foi criada migracao incremental:

- `databases/migration_funcao_gerencial_caixa.sql`

Essa migracao adiciona:

- `caixas.usuario_fechamento_id`
- `caixas.gerente_autorizador_id`
- `caixa_movimentos.usuario_id`
- `caixa_movimentos.gerente_autorizador_id`
- suporte de tipo para `despesa` e `cancelamento` em `caixa_movimentos.tipo`

Para Menu Gerencial foi aplicada evolucao de perfis em `usuarios.nivel_acesso`:

- `admin`, `gerente`, `vendedor`, `estoquista`, `cozinha`

## Frontend atual

Rotas registradas em `frontend/src/App.jsx`:

- `/login`
- `/dashboard`
- `/pedidos`
- `/cardapio`
- `/estoque`
- `/caixa`
- `/cozinha`
- `/gerencial`

Telas principais:

- Login
- Dashboard
- Pedidos
- Cardapio / Cadastrar Item
- Estoque
- Caixa com PDV
- Cozinha (KDS)
- Menu Gerencial

Mensagens do fluxo usam popup/modal interno.
Nao ha uso ativo de `alert`, `confirm`, `prompt` ou `window.*` em
`frontend/src`.

## Fluxo principal de venda (mantido)

1. Usuario abre caixa.
2. PDV lista itens do cardapio.
3. Usuario adiciona produto, combo ou promocao ao pedido.
4. Frontend envia pedido para `POST /api/pedidos`.
5. Backend resolve ingredientes.
6. Backend calcula avisos de estoque negativo.
7. Backend cria pedido e itens.
8. Backend baixa estoque dos ingredientes, permitindo negativo.
9. Backend registra movimento de caixa do tipo `venda`.
10. Pedido aparece na cozinha.
11. Frontend mostra sucesso e avisos, se existirem.

## Validacao executada

Evidencias ja executadas nesta fase:

- schema aplicado em MySQL
- migracao aplicada em MySQL
- `node --check` nos arquivos alterados do backend
- `npm run lint` no frontend passou
- `npm run build` no frontend passou
- checagem de frontend sem `alert/confirm/prompt/window.*`
- suite automatizada de funcao gerencial:
  - `node backend/tests/gerencial-function-tests.mjs`
  - resumo final: `36 PASS`, `0 FAIL`, `0 SKIP`
- smoke test de API cobrindo:
  - venda bloqueada com caixa fechado
  - fechamento de caixa: conferido, faltou e sobrou
  - fluxo principal via `POST /api/pedidos`
  - pedido aparecendo na cozinha
  - transicao de status na cozinha ate `entregue`
  - usuarios sem token: 401
  - usuarios com perfil sem permissao: 403
  - criacao/desativacao de usuario por admin
  - alteracao de senha propria
  - relatorio gerencial com controle por perfil
  - correcao gerencial de status de pedido com controle por perfil
- health check `GET /api/health` respondendo JSON

## Pendencias recomendadas

- Rodar checklist manual completo no navegador.
- Centralizar configuracao de API do frontend.
- Criar testes automatizados de API para fluxo de pedidos, caixa e cozinha.
- Revisar permissao por papel em rotas sensiveis antes de uso em producao.
