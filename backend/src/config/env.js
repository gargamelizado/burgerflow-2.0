const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const dbSocketPath = process.env.DB_SOCKET?.trim() || undefined;
const dbPortValue = Number(process.env.DB_PORT || 3306);

const env = {
  port: process.env.PORT || 3006,

  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number.isNaN(dbPortValue) ? 3306 : dbPortValue,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'burger_flow_2_0',
    socketPath: dbSocketPath,
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'burgerflow_secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },
};

module.exports = env;