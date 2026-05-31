import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

const url = new URL(process.env.SUPABASE_DB_URL);

const pool = new Pool({
  host: url.hostname,
  port: Number(url.port || 5432),
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: url.pathname.replace(/^\//, ''),
  ssl: {
    rejectUnauthorized: false
  },
  max: 10
});

pool.on('error', (err) => {
  console.error('Erro inesperado no pool do banco:', err);
});

export { pool };
