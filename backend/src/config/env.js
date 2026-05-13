require('dotenv').config();

const env = {
  port: process.env.PORT || 3006,

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '123456789',
    database: process.env.DB_NAME || 'burger_flow_2_0',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'burgerflow_secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },
};

module.exports = env;