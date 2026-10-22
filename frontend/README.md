# BurgerFlow 2.0 - Frontend

Frontend React + Vite do BurgerFlow 2.0.

## Stack

- React
- Vite
- React Router
- ESLint

## Como rodar

Na raiz do repositorio, `npm run dev` inicia o backend e o frontend juntos.
O backend espera pelo MySQL antes de aceitar requisicoes; no Windows, tenta
iniciar a instalacao portatil configurada para o BurgerFlow. Se o backend
falhar, o frontend tambem e encerrado para evitar uma tela funcionando sem API.

Instale dependencias:

```bash
npm install
```

Inicie o frontend:

```bash
npm run dev
```

Por padrao os services chamam a API em:

```text
http://localhost:3006/api
```

Antes de testar as telas, configure o banco e aplique o schema/migracoes. O
endpoint `http://localhost:3006/api/health` confirma que a API e o MySQL estao
disponiveis.

## Scripts

```bash
npm run dev
npm run lint
npm run build
npm run preview
```

## Rotas da aplicacao

- `/login`
- `/dashboard`
- `/pedidos`
- `/cardapio`
- `/estoque`
- `/caixa`
- `/cozinha`

## Fluxos ativos

- Login com JWT.
- Cadastro de item: ingrediente, produto, combo e promocao.
- Cardapio filtrando itens ativos que aparecem no cardapio.
- Estoque de ingredientes com entrada, saida e ajuste.
- Caixa com abertura, fechamento, suprimento, sangria e PDV.
- PDV finalizando pedido no backend.
- Pedidos listando e alterando status.
- Cozinha listando pedidos pendentes.

## Regra de estoque negativo

O frontend permite finalizar venda mesmo quando o backend retorna aviso de
estoque negativo. O aviso aparece em popup visual, mas nao bloqueia a venda.

Exemplo de aviso:

```text
Atencao: Batata ficara com estoque negativo: -100 gr
```

## Mensagens

As telas operacionais usam popups da propria aplicacao. Nao devem ser usados
`alert`, `confirm`, `prompt` ou acesso direto a `window.*` em `frontend/src`.

Checagem util:

```bash
rg -n "\b(alert|confirm|prompt)\s*\(|window\." frontend/src
```

## Validacao recente

Validado nesta fase:

```bash
npm run lint
npm run build
```

Ambos passaram.
