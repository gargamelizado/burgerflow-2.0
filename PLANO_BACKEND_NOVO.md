# Plano do Backend Novo - BurgerFlow

## Regra principal

Preservar o frontend atual e reconstruir o backend de forma limpa, usando Node.js, Express, MySQL, JWT, bcrypt e arquitetura Route -> Controller -> Service -> Repository -> MySQL.

## Backend exemplo usado como referência

Arquivos analisados:

- backend exemplo/src/modules/auth/auth.routes.js
- backend exemplo/src/modules/auth/auth.controller.js
- backend exemplo/src/modules/cash/cash.routes.js
- backend exemplo/src/modules/cash/cash.controller.js
- backend exemplo/src/modules/products/product.routes.js
- backend exemplo/src/modules/products/product.controller.js
- backend exemplo/src/modules/kitchen/kitchen.routes.js
- backend exemplo/src/modules/kitchen/kitchen.controller.js
- backend exemplo/src/modules/recover-order/recoverOrder.routes.js
- backend exemplo/src/modules/recover-order/recoverOrder.controller.js

## Módulos prioritários do MVP

1. Auth
2. Produtos
3. Caixa
4. Vendas
5. Cozinha
6. Dashboard
7. Recuperador de pedidos
8. Estoque

## Rotas iniciais obrigatórias

### Auth

- POST /api/auth/login
- GET /api/auth/verify
- GET /api/auth/usuarios
- POST /api/auth/register
- PUT /api/auth/usuarios/:id
- DELETE /api/auth/usuarios/:id

### Produtos

- GET /api/produtos
- POST /api/produtos
- PUT /api/produtos/:id
- DELETE /api/produtos/:id

### Caixa

- GET /api/caixa/aberto
- POST /api/caixa/abrir
- POST /api/caixa/movimento
- POST /api/caixa/fechar
- GET /api/caixa/:id/relatorio

### Cozinha

- GET /api/cozinha/pedidos
- PATCH /api/cozinha/pedidos/:id/status

### Recuperador de pedidos

- GET /api/recuperador-pedidos
- GET /api/recuperador-pedidos/:numero
- PATCH /api/recuperador-pedidos/:id/recuperar

## Ignorar nesta fase

- Node-RED
- integrações externas
- microserviços
- multi-loja
- Prisma
- MySQL 


./databases/seed.sql
mysql -u root -p < ./databases/schema.sql
mysql -u root -p < ./databases/seed.sql