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

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (adminEmail && adminPassword) {
    const adminExists = await pool.query(`
      SELECT id, role FROM users WHERE email = $1
    `, [adminEmail]);

    if (adminExists.rows.length === 0) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);

      await pool.query(`
        INSERT INTO users (name, email, password, role)
        VALUES ($1, $2, $3, $4)
      `, [
        'Administrador',
        adminEmail,
        hashedPassword,
        'admin'
      ]);

      console.log('Admin criado com sucesso:', adminEmail);
    } else if (adminExists.rows[0].role !== 'admin') {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);

      await pool.query(`
        UPDATE users SET password = $1, role = $2, updated_at = CURRENT_TIMESTAMP
        WHERE email = $3
      `, [hashedPassword, 'admin', adminEmail]);

      console.log('Admin atualizado (role + senha):', adminEmail);
    }
  } else {
    console.log('ADMIN_EMAIL/ADMIN_PASSWORD não definidos no .env. Seed de admin ignorado.');
  }

  for (const category of categories) {
    await pool.query(`
      INSERT INTO categories (name, slug)
      VALUES ($1, $2)
      ON CONFLICT (slug) DO NOTHING
    `, category);
  }
}
