import { pool } from './connection.js';
import bcrypt from 'bcryptjs';

export async function seedDatabase() {
  const categories = [
    ['Pimentas', 'pimentas'],
    ['Temperos', 'temperos'],
    ['Farinhas', 'farinhas'],
    ['Castanhas', 'castanhas'],
    ['Outros', 'outros'],
    ['Kits', 'kits']
  ];

  const adminExists = await pool.query(`
    SELECT id FROM users WHERE email = $1
  `, ['admin@casasopimenta.com']);

  if (adminExists.rows.length === 0) {
    const hashedPassword = await bcrypt.hash('admin123', 10);

    await pool.query(`
      INSERT INTO users (name, email, password, role)
      VALUES ($1, $2, $3, $4)
    `, [
      'Administrador',
      'admin@casasopimenta.com',
      hashedPassword,
      'admin'
    ]);
  }

  for (const category of categories) {
    await pool.query(`
      INSERT INTO categories (name, slug)
      VALUES ($1, $2)
      ON CONFLICT (slug) DO NOTHING
    `, category);
  }
}
