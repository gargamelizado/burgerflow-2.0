/**
 * @file db.js
 * @description Configuracao do pool MySQL e criacao inicial do database.
 * @author BurgerFlow
 */

// Importa driver MySQL com suporte a promises/async-await.
import mysql from 'mysql2/promise.js';
// Importa ambiente normalizado e validador obrigatorio.
import { env, validateEnv } from './env.js';

// Interrompe o boot se faltar configuracao de banco.
validateEnv();

// Cria o banco fisico quando ele ainda nao existe.
export async function ensureDatabaseExists() {
  // Conecta sem selecionar database para poder criar o schema.
  const connection = await mysql.createConnection({
    host: env.DB_HOST,
    user: env.DB_USER,
    password: env.DB_PASSWORD
  });

  try {
    // Escapa crases no nome do banco para reduzir risco de SQL invalido.
    const databaseName = env.DB_NAME.replace(/`/g, '``');
    // Cria o database se ele ainda nao existir.
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\``);
  } finally {
    // Fecha a conexao temporaria mesmo se der erro.
    await connection.end();
  }
}

// Pool compartilhado usado pelas rotas da API.
const pool = mysql.createPool({
  // Host do MySQL.
  host: env.DB_HOST,
  // Usuario do MySQL.
  user: env.DB_USER,
  // Senha do MySQL.
  password: env.DB_PASSWORD,
  // Banco principal da aplicacao.
  database: env.DB_NAME,
  // Mantem chamadas aguardando conexao em vez de falhar imediatamente.
  waitForConnections: true,
  // Limita conexoes simultaneas para proteger o banco.
  connectionLimit: 10,
  // Sem limite de fila interna do mysql2.
  queueLimit: 0
});

// Exporta o pool para services/rotas.
export default pool;
