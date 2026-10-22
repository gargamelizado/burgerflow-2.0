const fs = require('fs');
const path = require('path');
const db = require('../config/db');

const migrationsDirectory = path.resolve(__dirname, '../../migrations');
const migrationFilePattern = /^\d{4}-\d{2}-\d{2}-[a-z0-9-]+\.sql$/i;

const runMigrations = async (connection = db) => {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename VARCHAR(255) NOT NULL PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  const [appliedRows] = await connection.query(
    'SELECT filename FROM schema_migrations'
  );
  const appliedMigrations = new Set(
    appliedRows.map(({ filename }) => filename)
  );
  const migrationFiles = fs
    .readdirSync(migrationsDirectory)
    .filter((filename) => migrationFilePattern.test(filename))
    .sort();

  for (const filename of migrationFiles) {
    if (appliedMigrations.has(filename)) {
      continue;
    }

    const migrationSql = fs
      .readFileSync(path.join(migrationsDirectory, filename), 'utf8')
      .replace(/^\s*--.*$/gm, '');
    const statements = migrationSql
      .split(';')
      .map((statement) => statement.trim())
      .filter(Boolean);

    try {
      for (const statement of statements) {
        await connection.query(statement);
      }

      await connection.query(
        'INSERT INTO schema_migrations (filename) VALUES (?)',
        [filename]
      );
      appliedMigrations.add(filename);
      console.log(`[DB_MIGRATION_APPLIED] ${filename}`);
    } catch (error) {
      throw new Error(`Falha ao aplicar migração ${filename}.`, {
        cause: error,
      });
    }
  }

  return [...appliedMigrations].sort();
};

module.exports = runMigrations;
