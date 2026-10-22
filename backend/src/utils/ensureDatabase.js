const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const env = require('../config/env');

const mysqlStartupTimeoutMs = 45000;
const mysqlRetryIntervalMs = 1000;
const connectionFailureCodes = new Set([
  'ECONNREFUSED',
  'ETIMEDOUT',
  'EHOSTUNREACH',
]);
let startupPromise;

const isDatabaseConnectionUnavailable = (error) =>
  connectionFailureCodes.has(error?.code);

const isLocalMysql = () => {
  const host = String(env.db.host).toLowerCase();

  return (
    !env.db.socketPath &&
    env.db.port === 3306 &&
    ['127.0.0.1', 'localhost', '::1'].includes(host)
  );
};

const startPortableMysql = () => {
  if (process.platform !== 'win32' || !isLocalMysql()) {
    throw new Error(
      `Não foi possível conectar ao MySQL configurado em ${env.db.host}:${env.db.port}. ` +
        'A inicialização automática é suportada apenas para o MySQL portátil local na porta 3306.'
    );
  }

  const localAppData =
    process.env.LOCALAPPDATA ||
    path.join(os.homedir(), 'AppData', 'Local');
  const installDirectory =
    process.env.BURGERFLOW_MYSQL_DIR ||
    path.join(
      localAppData,
      'Programs',
      'BurgerFlow',
      'MySQL',
      'mysql-8.4.9-winx64'
    );
  const serverPath = path.join(installDirectory, 'bin', 'mysqld.exe');
  const configPath = path.join(localAppData, 'BurgerFlow', 'my.ini');

  if (!fs.existsSync(serverPath) || !fs.existsSync(configPath)) {
    throw new Error(
      `MySQL não está disponível em ${installDirectory}. ` +
        'Instale o MySQL portátil ou defina BURGERFLOW_MYSQL_DIR com a pasta de instalação.'
    );
  }

  const server = spawn(serverPath, [`--defaults-file=${configPath}`], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  });

  server.once('error', (error) => {
    console.error('[MYSQL_START_ERROR] Falha ao iniciar o MySQL portátil:', error);
  });
  server.unref();
};

const waitForDatabase = async (testConnection) => {
  const deadline = Date.now() + mysqlStartupTimeoutMs;
  let lastError;

  while (Date.now() < deadline) {
    try {
      await testConnection();
      return;
    } catch (error) {
      lastError = error;

      if (
        error.code !== 'ECONNREFUSED' &&
        error.code !== 'ETIMEDOUT' &&
        error.code !== 'EHOSTUNREACH'
      ) {
        throw error;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, mysqlRetryIntervalMs));
  }

  throw new Error(
    `O MySQL não ficou disponível após ${mysqlStartupTimeoutMs / 1000} segundos.`,
    { cause: lastError }
  );
};

const startDatabase = async (testConnection) => {
  try {
    await testConnection();
    return;
  } catch (error) {
    if (!isDatabaseConnectionUnavailable(error)) {
      throw error;
    }
  }

  startPortableMysql();
  await waitForDatabase(testConnection);
};

const ensureDatabase = (testConnection) => {
  if (!startupPromise) {
    startupPromise = startDatabase(testConnection).finally(() => {
      startupPromise = undefined;
    });
  }

  return startupPromise;
};

module.exports = {
  ensureDatabase,
  isDatabaseConnectionUnavailable,
};
