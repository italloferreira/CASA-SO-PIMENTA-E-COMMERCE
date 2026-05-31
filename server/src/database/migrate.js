import Database from 'better-sqlite3';
import path from 'path';
import dotenv from 'dotenv';
import pkg from 'pg';

dotenv.config();

const { Pool } = pkg;

const sqlitePath = path.resolve('data', 'casa-so-pimenta.db');

const TABLES_IN_ORDER = [
  'categories',
  'products',
  'banners',
  'kits',
  'kit_items',
  'users',
  'carts',
  'cart_items',
  'orders',
  'order_items'
];

async function migrate() {
  if (!process.env.SUPABASE_DB_URL) {
    console.error('ERRO: SUPABASE_DB_URL não definida no .env');
    process.exit(1);
  }

  const sqlite = new Database(sqlitePath);
  const pgPool = new Pool({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false }
  });

  console.log('Lendo dados do SQLite...');

  const allData = {};
  for (const table of TABLES_IN_ORDER) {
    const rows = sqlite.prepare(`SELECT * FROM ${table}`).all();
    allData[table] = rows;
    console.log(`  ${table}: ${rows.length} registros`);
  }

  console.log('\nInserindo dados no PostgreSQL...');

  const client = await pgPool.connect();

  try {
    for (const table of TABLES_IN_ORDER) {
      const rows = allData[table];
      if (rows.length === 0) {
        console.log(`  ${table}: sem dados para migrar`);
        continue;
      }

      const columns = Object.keys(rows[0]);
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
      const colNames = columns.join(', ');

      let conflictClause = '';
      if (table === 'categories') {
        conflictClause = ' ON CONFLICT (slug) DO NOTHING';
      } else if (table === 'users') {
        conflictClause = ' ON CONFLICT (email) DO NOTHING';
      }

      const insertSQL = `INSERT INTO ${table} (${colNames}) VALUES (${placeholders})${conflictClause}`;

      for (const row of rows) {
        const values = columns.map(col => row[col]);
        try {
          await client.query(insertSQL, values);
        } catch (err) {
          console.error(`  ERRO ao inserir em ${table} (id=${row.id}):`, err.message);
        }
      }

      if (table !== 'categories' && table !== 'users') {
        const maxId = rows.reduce((max, r) => Math.max(max, r.id || 0), 0);
        if (maxId > 0) {
          await client.query(`
            SELECT setval('${table}_id_seq', $1, true)
          `, [maxId]);
        }
      }

      console.log(`  ${table}: ${rows.length} registros migrados`);
    }

    console.log('\nMigração concluída com sucesso!');
  } catch (err) {
    console.error('Erro durante a migração:', err);
    process.exit(1);
  } finally {
    client.release();
    sqlite.close();
    await pgPool.end();
  }
}

migrate();
