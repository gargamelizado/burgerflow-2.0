const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');
const app = require('../src/app');
const db = require('../src/config/db');
const authService = require('../src/modules/auth/auth.service');
const runMigrations = require('../src/database/migrate');
const { authorizeRoles } = require('../src/middlewares/rbac.middleware');
const managementSchemas = require('../src/modules/management/management.schemas');

let server;
let baseUrl;
let originalTestConnection;
let originalLogin;
let loginCalls = 0;

before(async () => {
  originalTestConnection = db.testConnection;
  originalLogin = authService.login;
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  db.testConnection = originalTestConnection;
  authService.login = originalLogin;
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  await db.end();
});

test('health check confirms API and database are available', async () => {
  db.testConnection = async () => {};

  const response = await fetch(`${baseUrl}/api/health`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.database, 'connected');
});

test('health check returns 503 when database connection is refused', async () => {
  db.testConnection = async () => {
    const error = new Error('database unavailable');
    error.code = 'ECONNREFUSED';
    throw error;
  };

  const response = await fetch(`${baseUrl}/api/health`);
  const body = await response.json();

  assert.equal(response.status, 503);
  assert.equal(body.error.code, 'DATABASE_UNAVAILABLE');
});

test('login rejects invalid request payloads before calling the service', async () => {
  loginCalls = 0;
  authService.login = async () => {
    loginCalls += 1;
    return {};
  };

  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'invalid-email' }),
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error.code, 'VALIDATION_ERROR');
  assert.equal(loginCalls, 0);
});

test('login rate limiter blocks repeated attempts from the same client', async () => {
  authService.login = async ({ email }) => {
    loginCalls += 1;
    return { usuario: { email } };
  };

  const statuses = [];
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `user${attempt}@example.com`, senha: 'invalid' }),
    });
    statuses.push(response.status);
  }

  assert.ok(statuses.includes(429));
  assert.ok(statuses.includes(200));
});

test('role authorization rejects a user outside the permitted roles', () => {
  let receivedError;
  authorizeRoles('ADMIN')(
    { user: { nivel_acesso: 'vendedor' } },
    {},
    (error) => {
      receivedError = error;
    }
  );

  assert.equal(receivedError.statusCode, 403);
  assert.equal(receivedError.code, 'FORBIDDEN');
});

test('management authorization schema rejects unsupported actions', () => {
  const result = managementSchemas.authorize.safeParse({
    body: {
      identificador: 'manager@example.com',
      senha: 'secret',
      acao: 'delete_everything',
    },
    query: {},
    params: {},
  });

  assert.equal(result.success, false);
});

test('database migrations are recorded and not executed twice', async () => {
  const applied = new Set();
  const executedStatements = [];
  const connection = {
    async query(sql, values = []) {
      if (sql.includes('SELECT filename FROM schema_migrations')) {
        return [[...applied].map((filename) => ({ filename }))];
      }

      if (sql.includes('INSERT INTO schema_migrations')) {
        applied.add(values[0]);
        return [{ affectedRows: 1 }];
      }

      if (!sql.includes('CREATE TABLE IF NOT EXISTS schema_migrations')) {
        executedStatements.push(sql);
      }

      return [[]];
    },
  };

  const firstRun = await runMigrations(connection);
  const executionCountAfterFirstRun = executedStatements.length;
  const secondRun = await runMigrations(connection);

  assert.equal(firstRun.length, 2);
  assert.deepEqual(secondRun, firstRun);
  assert.equal(executedStatements.length, executionCountAfterFirstRun);
});
