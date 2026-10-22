# BurgerFlow 2.0

Sistema de gestão para operação de restaurantes, com interface web para equipe
e API própria. O projeto reúne os fluxos de pedidos, caixa, cozinha, cardápio,
produtos e estoque.

## Funcionalidades

- Autenticação de usuários com JWT.
- Cadastro e gerenciamento de produtos, ingredientes, combos e promoções.
- Gestão de estoque de ingredientes.
- Registro e acompanhamento de pedidos e status da cozinha.
- Operações de caixa, incluindo abertura, fechamento, suprimento e sangria.
- Relatórios e operações gerenciais.
- Validação de payloads, controle de acesso por perfil e registro de auditoria
  em operações selecionadas.

## Tecnologias

- **Frontend:** React, Vite e React Router.
- **Backend:** Node.js, Express e Zod.
- **Banco de dados:** MySQL com `mysql2`.

## Requisitos

- Node.js 20 ou superior e npm.
- MySQL 8.x acessível localmente ou em outro host.

No Windows, o backend também pode iniciar uma instalação portátil local do
MySQL, se ela estiver configurada conforme descrito em
[Inicialização do MySQL no Windows](#inicialização-do-mysql-no-windows).

## Configuração

1. Instale as dependências na raiz:

   ```bash
   npm install
   ```

   O `postinstall` do projeto também instala as dependências do backend e do
   frontend.

2. Crie `backend/.env` (esse arquivo é local e não deve ser enviado ao Git) com
   os dados do seu ambiente:

   ```dotenv
   PORT=3006
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=sua_senha_mysql
   DB_NAME=burger_flow_2_0
   JWT_SECRET=seu_segredo_aleatorio_forte
   JWT_EXPIRES_IN=1d
   ```

   Gere um segredo aleatório para `JWT_SECRET`, por exemplo:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

   Não use o exemplo acima como senha real e não compartilhe nem versiona o
   arquivo `.env`. Se o MySQL usar socket, configure `DB_SOCKET` em vez de
   `DB_HOST` e `DB_PORT`.

3. Prepare o banco. O schema inicial está em
   [`databases/schema.sql`](databases/schema.sql); execute-o uma vez em uma
   instância MySQL:

   ```bash
   mysql -u root -p < databases/schema.sql
   ```

   O usuário configurado em `DB_USER` precisa ter permissão para acessar o
   banco e aplicar as migrações. Na inicialização, o backend aplica em ordem
   as migrações ainda não registradas em `schema_migrations`. As migrações não
   substituem a criação do schema inicial.

## Executar em desenvolvimento

Na raiz do repositório:

```bash
npm run dev
```

Esse comando inicia o backend e o frontend em conjunto. Por padrão:

- Frontend: <http://localhost:5173>
- API: <http://localhost:3006>
- Health check: <http://localhost:3006/api/health>

O health check retorna o estado da conexão com o MySQL. A API só começa a
aceitar requisições depois de conectar ao banco e aplicar as migrações
pendentes.

Também é possível iniciar cada parte separadamente:

```bash
npm run dev:backend
npm run dev:frontend
```

Para iniciar o backend fora do modo de desenvolvimento:

```bash
npm start --prefix backend
```

## Testes e validações

Testes automatizados do backend:

```bash
npm test --prefix backend
```

Lint e build de produção do frontend:

```bash
npm run lint --prefix frontend
npm run build --prefix frontend
```

Pré-visualização do build do frontend:

```bash
npm run preview --prefix frontend
```

## Estrutura do projeto

```text
backend/     API Express, migrações e testes
databases/   Schema inicial MySQL
doc/         Documentação técnica e de arquitetura
frontend/    Interface React/Vite
.github/     Workflows de CI
```

O backend segue principalmente o fluxo
`Route -> Controller -> Service -> Repository -> MySQL`.

## Inicialização do MySQL no Windows

Quando o banco não estiver acessível, o backend tenta iniciar automaticamente
o MySQL portátil apenas se estiver configurado localmente na porta `3306`.
Por padrão, procura `mysqld.exe` em:

```text
%LOCALAPPDATA%\Programs\BurgerFlow\MySQL\mysql-8.4.9-winx64
```

Também espera encontrar o arquivo de configuração em:

```text
%LOCALAPPDATA%\BurgerFlow\my.ini
```

Se a instalação estiver em outra pasta, defina `BURGERFLOW_MYSQL_DIR` para o
diretório que contém a pasta `bin` do MySQL. A inicialização automática não
instala nem inicializa o banco de dados e não cria o schema inicial.

## Segurança

- Mantenha credenciais e segredos apenas em arquivos locais de ambiente.
- Use um `JWT_SECRET` forte e exclusivo por ambiente.
- Não exponha o MySQL à internet sem controles de rede e autenticação
  apropriados.
- Configure usuários MySQL com somente as permissões necessárias.
