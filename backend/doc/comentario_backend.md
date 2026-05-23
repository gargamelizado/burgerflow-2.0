# Comentario do backend - BurgerFlow 2.0

Atualizado em: 2026-05-23.

Este backend e uma API Express em CommonJS, com MySQL via `mysql2/promise`,
autenticacao JWT e senha com bcrypt. O padrao principal continua:

Route -> Controller -> Service -> Repository -> MySQL.

Escopo ativo do MVP: cardapio, estoque, pedidos, caixa, cozinha e menu
gerencial.

## Entrada da aplicacao

- `src/server.js`: carrega `.env`, importa `app` e escuta em
  `process.env.PORT || 3006`.
- `src/app.js`: configura `cors`, `express.json`, health check, rotas da API,
  404 e middleware de erro.
- `src/config/env.js`: define porta, banco e segredo JWT.
- `src/config/db.js`: cria pool MySQL.
- `src/middlewares/auth.middleware.js`: valida `Authorization: Bearer <token>`.
- `src/middlewares/error.middleware.js`: devolve erro sempre em JSON.

## Tipos de item

Os unicos tipos aceitos nesta fase:

- `INGREDIENTE`
- `PRODUTO`
- `COMBO`
- `PROMOCAO`

Nao existe fluxo ativo de `PRODUTO_SIMPLES` ou `PRODUTO_COMPOSTO`.

## Regras principais

- Ingrediente controla estoque e nao aparece no cardapio.
- Produto aparece no cardapio e baixa ingredientes.
- Combo aparece no cardapio, contem produtos e baixa os ingredientes desses
  produtos.
- Promocao aparece no cardapio, aponta para produto ou combo e baixa estoque
  como o item original.
- A categoria `todos` existe apenas no frontend e nao deve ser salva no banco.
- Estoque e controlado por `quantidade_total_base` e `unidade_base`.
- Conversoes aceitas: `kg -> gr`, `gr -> gr`, `li -> ml`, `ml -> ml`.
- O pedido nao bloqueia venda por falta de estoque; pode gerar
  `avisos_estoque`.

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
- `PATCH /api/auth/alterar-senha`

`alterar-senha` valida senha atual e aplica hash bcrypt para nova senha.

### Itens

Base generica:

- `GET /api/itens`
- `GET /api/itens/:id`
- `POST /api/itens`
- `PUT /api/itens/:id`
- `DELETE /api/itens/:id`
- `GET /api/itens/cardapio`

Rotas por tipo:

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

Regras atuais:

- so permite um caixa aberto
- abertura exige usuario autenticado
- movimento manual aceita `suprimento` e `sangria`
- venda de PDV entra como movimento `venda` via `POST /api/pedidos`
- fechamento oficial e calculado no backend:
  - `valor_esperado = valor_inicial + vendas + suprimentos - sangrias - despesas`
  - `diferenca = valor_final - valor_esperado`
- fechamento salva `valor_final`, `valor_esperado`, `diferenca`, `observacao`,
  `status=fechado` e `fechado_em`
- retorno inclui resumo e resultado: `conferido`, `faltou` ou `sobrou`

### Pedidos

- `GET /api/pedidos`
- `POST /api/pedidos`
- `PATCH /api/pedidos/:id/status`
- `PATCH /api/pedidos/:id/status/gerencial`

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
- correcoes gerenciais de status exigem perfil `admin` ou `gerente`
- correcoes gerenciais registram auditoria em `auditoria`

### Cozinha

- `GET /api/cozinha/pedidos`
- `PATCH /api/cozinha/pedidos/:id/status`

Regras atuais:

- lista pedidos com status `novo`, `em_preparo`, `pronto` e `entregue`
- nao lista pedidos `cancelado`
- retorno inclui `tempo_minutos`
- retorno inclui itens do pedido (`pedido_itens`) para renderizacao da KDS

### Usuarios

- `GET /api/usuarios` (`admin`, `gerente`)
- `POST /api/usuarios` (`admin`)
- `PUT /api/usuarios/:id` (`admin`)
- `PATCH /api/usuarios/:id/senha` (`admin` ou `gerente` para propria senha)
- `DELETE /api/usuarios/:id` (`admin`)

Regras:

- senha com bcrypt
- email unico
- nao retorna `senha_hash` no payload de resposta
- `DELETE` desativa usuario (`ativo = false`)
- usuario nao pode desativar a propria conta

### Relatorios Gerenciais

- `GET /api/gerencial/relatorios/produtos-vendidos?data_inicio=YYYY-MM-DD&data_fim=YYYY-MM-DD`

Regras:

- exige autenticacao
- exige perfil `admin` ou `gerente`
- agrega `pedido_itens` por item no periodo
- ignora pedidos `cancelado`
- retorna resumo com quantidade total e valor total vendido

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

`databases/migration_cardapio_estoque_basico.sql` continua sendo a migracao
incremental para banco antigo.

Para esta fase foi adicionada evolucao incremental de perfil em `usuarios`:

- conversao de legado `operador` para `vendedor`
- enum final de nivel de acesso:
  `admin`, `gerente`, `vendedor`, `estoquista`, `cozinha`

Campos fora do MVP:

- `preco_compra`
- `custo_unitario`
- `validade`
- `estoque_minimo`
- alerta de estoque baixo

## Credencial de teste

Seed:

- email: `admin@estoque.com`
- senha: `admin123`

## Validacao executada

Validacoes ja executadas nesta fase:

- `node --check` nos arquivos alterados do backend
- `npm run lint` em `frontend/`
- `npm run build` em `frontend/`
- checagem sem `alert/confirm/prompt/window.*` no frontend
- smoke de API cobrindo:
  - venda bloqueada com caixa fechado
  - fechamento de caixa em 3 cenarios (conferido, faltou, sobrou)
  - fluxo principal com `POST /api/pedidos`
  - pedido aparecendo na cozinha
  - transicao de status `novo -> em_preparo -> pronto -> entregue`
  - rotas de usuarios com e sem permissao
  - alteracao de senha propria (`/api/auth/alterar-senha`)
  - relatorio gerencial com bloqueio por perfil
  - correcao gerencial de status com bloqueio por perfil
- `GET /api/health` respondendo JSON

## Pendencias conhecidas

- Centralizar `API_URL`, `getToken` e tratamento de resposta do frontend em um
  helper unico.
- Rodar bateria manual completa no navegador com checklist funcional.
- Criar testes automatizados de API quando o MVP estabilizar.
