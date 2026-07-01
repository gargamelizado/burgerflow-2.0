require('dotenv').config();

const app = require('./app');
const db = require('./config/db');

const PORT = process.env.PORT || 3006;

async function startServer() {
  try {
    await db.testConnection();
    app.listen(PORT, () => {
      console.log(`BurgerFlow API rodando na porta ${PORT}`);
    });
  } catch (error) {
    console.error('Falha ao conectar no banco de dados:', error);
    process.exit(1);
  }
}

startServer();