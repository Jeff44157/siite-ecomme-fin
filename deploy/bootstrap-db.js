const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { dbConfig } = require('../db-config');

const dbName = process.env.DB_NAME || 'ecommerce';

async function main() {
  const pool = mysql.createPool(dbConfig(null, { multipleStatements: true }));

  const [tables] = await pool.query(
    'SELECT COUNT(*) AS n FROM information_schema.tables WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?',
    [dbName, 'users']
  );
  if (Number(tables[0].n) > 0) {
    console.log('Base déjà initialisée, import ignoré.');
    await pool.end();
    return;
  }

  const sql = fs.readFileSync(path.join(__dirname, '..', 'bd.sql'), 'utf8')
    .replace(/CREATE\s+DATABASE[\s\S]*?;/i, '')
    .replace(/USE\s+[^;]+;/i, '');

  await pool.query(sql);
  console.log('Schéma bd.sql importé.');
  await pool.end();
}

main().catch((err) => {
  console.error('Erreur import bd.sql :', err.code || err.message);
  process.exitCode = 1;
});
