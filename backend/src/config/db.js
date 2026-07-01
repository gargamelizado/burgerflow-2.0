const mysql = require('mysql2/promise');
const env = require('./env');

const poolOptions = {
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

if (env.db.socketPath) {
  poolOptions.socketPath = env.db.socketPath;
} else {
  poolOptions.host = env.db.host;
  poolOptions.port = env.db.port;
}

const pool = mysql.createPool(poolOptions);

pool.testConnection = async () => {
  await pool.query('SELECT 1');
};

module.exports = pool;