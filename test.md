# Testes e status - BurgerFlow 2.0

Atualizado em: 2026-05-23.

Este documento registra o estado atual do MVP basico: cardapio, estoque,
pedidos, caixa, PDV, cozinha e menu gerencial.

## Regra atual de estoque

O sistema aceita estoque negativo.

- Se faltar estoque, a venda nao e bloqueada.
- O pedido e criado normalmente.
- O caixa registra a venda normalmente.
- O estoque e baixado mesmo que fique negativo.
- O backend retorna aviso em `avisos_estoque`.
- O frontend mostra o aviso em popup visual, sem travar o botao de finalizar.

Exemplo:

```text
Estoque atual de Batata: 200 gr
Produto Fritas usa: 300 gr
Depois da venda: -100 gr
```

## Fluxo atual de venda

1. Abrir caixa.
2. Acessar `/caixa`.
3. Montar pedido no PDV.
4. Finalizar pedido.
5. Backend cria pedido e itens.
6. Backend resolve ingredientes.
7. Backend baixa estoque dos ingredientes.
8. Backend registra movimento de estoque.
9. Backend registra movimento de caixa do tipo `venda`.
10. Frontend limpa pedido e mostra popup de sucesso.
11. Se houver estoque negativo, frontend mostra popup de aviso.

## Atualizacao da tela Cardapio

- O botao `Editar` abre o formulario em popup/modal visual.
- O popup de edicao permite atualizar dados principais, composicao,
  combo ou promocao conforme o tipo do item.
- A lista de itens cadastrados tem filtro por texto, tipo, categoria,
  status e exibicao no cardapio.
- A opcao `todos` dos filtros fica somente no frontend e nao e salva no banco.

## Checklist validado por comando ou smoke test

- [x] Schema atual aplicado em MySQL.
- [x] Migracao `migration_cardapio_estoque_basico.sql` aplicada em MySQL.
- [x] Backend passou em checagem de sintaxe com `node --check`.
- [x] Frontend passou em `npm run lint`.
- [x] Frontend passou em `npm run build`.
- [x] Tela `/caixa` carregou em screenshot Playwright com o PDV visivel.
- [x] Receita com ingrediente duplicado foi agrupada sem erro
  `produto_ingredientes.uk_produto_ingrediente`.
- [x] Venda com estoque insuficiente foi concluida.
- [x] Estoque ficou negativo no smoke test.
- [x] Resposta de pedido retornou aviso de estoque negativo.
- [x] `frontend/src` ficou sem uso ativo de `alert`, `confirm`, `prompt` ou
  `window.*`.

## Checklist funcional para testar manualmente no navegador

- [x] Login com `admin@estoque.com` / `admin123`.
- [x] Dashboard abre apos login.
- [x] Menu mostra Cardapio.
- [x] Menu mostra Estoque.
- [x] Menu mostra Caixa.
- [x] Menu mostra Pedidos.
- [x] Menu mostra Cozinha.
- [x] Menu mostra Gerencial para perfil `admin` e `gerente`.

### Cardapio / Cadastrar Item

- [x] Cadastrar ingrediente por caixa.
- [x] Cadastrar ingrediente por pacote.
- [x] Cadastrar ingrediente por medida direta.
- [x] Cadastrar produto com 1 ingrediente.
- [x] Cadastrar produto com varios ingredientes.
- [x] Cadastrar combo com produtos.
- [x] Cadastrar promocao apontando para produto ou combo.
- [x] Editar item em popup.
- [x] Filtrar itens cadastrados por texto, tipo, categoria, status e cardapio.
- [x] Desativar item em popup.
- [x] Confirmar que ingrediente nao aparece no cardapio.
- [x] Confirmar que categoria `todos` nao e salva no banco.

### Estoque

- [x] Listar ingredientes.
- [x] Registrar entrada.
- [x] Registrar saida.
- [x] Registrar ajuste.
- [x] Ver historico.
- [x] Confirmar que saida manual pode deixar saldo negativo.

### Caixa e PDV

- [x] Abrir caixa.
- [x] Registrar suprimento.
- [x] Registrar sangria.
- [x] PDV aparece apenas com caixa aberto.
- [x] PDV lista itens do cardapio.
- [x] PDV filtra categoria.
- [x] PDV adiciona item com `+1`.
- [x] PDV altera quantidade em popup.
- [x] PDV remove item.
- [x] PDV limpa pedido.
- [x] PDV calcula total.
- [x] PDV finaliza pedido.
- [x] PDV mostra aviso visual quando estoque fica negativo.
- [x] Caixa mostra movimento de venda.
- [x] Caixa calcula total de vendas.
- [x] Caixa calcula saldo esperado.
- [x] Caixa fecha.

### Pedidos e Cozinha

- [x] Pedido criado pelo PDV aparece em Pedidos.
- [x] Pedido criado pelo PDV aparece na Cozinha.
- [x] Pedidos muda status.
- [x] Cozinha muda para `em_preparo`.
- [x] Cozinha muda para `pronto`.
- [x] Cozinha muda para `entregue`.
- [x] Pedido entregue aparece na coluna `entregue` da Cozinha.

### Menu Gerencial

- [x] Login admin mostra link `Gerencial`.
- [x] Login sem permissao nao mostra link `Gerencial`.
- [x] Acesso direto a `/gerencial` sem permissao mostra acesso restrito.
- [x] Card `Caixa Gerencial` mostra status e resumo.
- [x] Card `Pedidos` permite corrigir status com rota gerencial.
- [x] Card `Reimpressao` mostra previa e permite imprimir comprovante.
- [x] Card `Produtos vendidos` gera relatorio por periodo.
- [x] Card `Usuarios` lista usuarios.
- [x] Admin cadastra usuario.
- [x] Admin desativa usuario.
- [x] Gerente nao cadastra usuario (bloqueado).
- [x] Card `Alterar senha` altera senha propria.

## Teste minimo de estoque negativo

1. Criar ingrediente Batata com `quantidade_total_base = 200` e
   `unidade_base = gr`.
2. Criar produto Fritas usando 300 gr de Batata.
3. Abrir caixa.
4. Vender 1 Fritas pelo PDV.

Resultado esperado:

- [x] pedido criado com sucesso.
- [x] caixa registrado com sucesso.
- [x] estoque de Batata atualizado para `-100 gr`.
- [x] venda nao bloqueada.
- [x] popup mostra aviso de estoque negativo.

Evidencia executada em 2026-05-19:

- Dados do teste: sufixo `568167`.
- Produto vendido: `BF Fritas 568167`.
- Pedido criado: numero `13`, id `26`.
- Caixa usado: id `11`.
- Estoque final do ingrediente `BF Batata Venda 568167`: `-100.000 gr`.
- Popup exibido no PDV:
  `Venda finalizada com aviso` e aviso de estoque negativo.
- Cozinha moveu o pedido para `em_preparo`, `pronto` e `entregue`.
- Pedido entregue ficou visivel na coluna `entregue` da Cozinha.
- Pedido foi alterado para `cancelado` na tela Pedidos.
- Caixa foi fechado pela tela com sucesso.

## Testes automatizados — Funcao Gerencial (2026-05-23)

Script criado:

- `backend/tests/gerencial-function-tests.mjs`

Relatorio gerado:

- `backend/test-results/gerencial-function-report.json`

Resumo da execucao:

- Total: 36
- PASS: 36
- FAIL: 0
- SKIP: 0

Principais pontos validados (PASS):

- abertura de caixa por gerente/admin
- abertura de caixa por vendedor com autorizacao gerencial temporaria
- bloqueio de abertura duplicada
- bloqueio de valor inicial negativo
- suprimento e sangria com caixa aberto, valor valido e motivo obrigatorio
- bloqueio de valor invalido em movimentacao
- bloqueio de sangria acima do esperado sem autorizacao gerencial
- fechamento com diferenca exige observacao
- fechamento por vendedor exige autorizacao gerencial
- Pix e cartao nao entram no dinheiro fisico esperado
- bloqueio de venda com caixa fechado
- venda permitida com caixa aberto via `POST /api/pedidos`
- fluxo principal mantido: pedido aparece na cozinha e cria movimento `venda`
- erros de API retornando JSON
- fechamento de caixa com calculo oficial no backend
- auditoria de acoes gerenciais (`caixa.aberto`, `caixa.fechado`,
  `caixa.suprimento`, `caixa.sangria`, `caixa.autorizacao_gerencial`,
  `caixa.fechamento_com_diferenca`)

Checklist manual sugerido para frontend (Caixa):

- [ ] login como vendedor e tentar abrir caixa (deve pedir autorizacao gerencial)
- [ ] login como vendedor e tentar fechar caixa (deve pedir autorizacao gerencial)
- [ ] tentar suprimento sem motivo (deve bloquear com mensagem clara)
- [ ] tentar sangria sem motivo (deve bloquear com mensagem clara)
- [ ] tentar fechar com diferenca sem observacao (deve bloquear)
- [ ] validar previa de diferenca visual vs calculo oficial retornado pelo backend

## Comandos uteis

Backend:

```bash
cd backend
npm install
npm run dev
```

Frontend:

```bash
cd frontend
npm install
npm run dev
npm run lint
npm run build
```

Banco:

```bash
mysql -uroot -p123456789 < databases/schema.sql
mysql -uroot -p123456789 < databases/seed.sql
mysql -uroot -p123456789 < databases/migration_cardapio_estoque_basico.sql
mysql -uroot -p123456789 < databases/migration_funcao_gerencial_caixa.sql
```

Checar mensagens nativas no frontend:

```bash
rg -n "\b(alert|confirm|prompt)\s*\(|window\." frontend/src
```
