require('dotenv').config();

const app = require('./app');
const db = require('./config/db');
const runMigrations = require('./database/migrate');
const {
  ensureDatabase,
  isDatabaseConnectionUnavailable,
} = require('./utils/ensureDatabase');

const PORT = process.env.PORT || 3006;
const databaseMonitorIntervalMs = 10000;

const monitorDatabase = async () => {
  try {
    await db.testConnection();
  } catch (error) {
    if (!isDatabaseConnectionUnavailable(error)) {
      console.error('[MYSQL_HEALTH_ERROR] Falha ao verificar o MySQL:', error);
      return;
    }

    console.error(
      '[MYSQL_UNAVAILABLE] Conexão com MySQL perdida; tentando reiniciar o banco.'
    );

    try {
      await ensureDatabase(() => db.testConnection());
      console.log('[MYSQL_RECOVERED] Conexão com MySQL restabelecida.');
    } catch (recoveryError) {
      console.error(
        '[MYSQL_RECOVERY_ERROR] Não foi possível restabelecer o MySQL:',
        recoveryError
      );
    }
  }
};

const startDatabaseMonitor = () => {
  const monitor = setInterval(() => {
    void monitorDatabase();
  }, databaseMonitorIntervalMs);

  monitor.unref();
};

async function startServer() {
  try {
    await ensureDatabase(() => db.testConnection());
    await runMigrations();
    app.listen(PORT, () => {
      console.log(`BurgerFlow API rodando na porta ${PORT}`);
      startDatabaseMonitor();
    });
  } catch (error) {
    console.error('Falha ao iniciar a API ou conectar no banco de dados:', error);
    process.exit(1);
  }
}

startServer();