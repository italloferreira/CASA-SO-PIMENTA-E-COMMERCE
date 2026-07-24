import dotenv from 'dotenv';
import pkg from 'pg';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

dotenv.config();

const { Pool } = pkg;

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

async function readSQLiteData(sqlitePath) {
  const Database = (await import('better-sqlite3')).default;
  const sqlite = new Database(sqlitePath);

  const allData = {};
  for (const table of TABLES_IN_ORDER) {
    const rows = sqlite.prepare(`SELECT * FROM ${table}`).all();
    allData[table] = rows;
    console.log(`  ${table}: ${rows.length} registros`);
  }

  sqlite.close();
  return allData;
}

function readJSONFallback(jsonPath) {
  if (!existsSync(jsonPath)) {
    console.error(`Arquivo nao encontrado: ${jsonPath}`);
    process.exit(1);
  }
  const raw = readFileSync(jsonPath, 'utf-8');
  return JSON.parse(raw);
}

async function migrate() {
  if (!process.env.SUPABASE_DB_URL) {
    console.error('ERRO: SUPABASE_DB_URL não definida no .env');
    process.exit(1);
  }

  const pgPool = new Pool({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false }
  });

  const sqlitePath = path.resolve('data', 'casa-so-pimenta.db');
  const jsonPath = path.resolve('data', 'export.json');

  let allData;

  if (existsSync(sqlitePath)) {
    console.log('Lendo dados do SQLite...');
    try {
      allData = await readSQLiteData(sqlitePath);
    } catch (err) {
      console.error('Erro ao ler SQLite (better-sqlite3 nao instalado?):', err.message);
      console.log('Tentando fallback para JSON...');
      allData = readJSONFallback(jsonPath);
    }
  } else if (existsSync(jsonPath)) {
    console.log('SQLite nao encontrado. Lendo dados do JSON...');
    allData = readJSONFallback(jsonPath);
  } else {
    console.error('Nenhum arquivo de dados encontrado (SQLite ou JSON). Nada a migrar.');
    process.exit(1);
  }

  console.log('\nInserindo dados no PostgreSQL...');

  const client = await pgPool.connect();

  try {
    for (const table of TABLES_IN_ORDER) {
      const rows = allData[table];
      if (!rows || rows.length === 0) {
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
          await client.query(`SELECT setval('${table}_id_seq', $1, true)`, [maxId]);
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
    await pgPool.end();
  }
}

migrate();
