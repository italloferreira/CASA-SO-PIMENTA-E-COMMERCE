import { db } from './connection.js';
import bcrypt from 'bcryptjs';

export function seedDatabase() {
  const categories = [
    ['Pimentas', 'pimentas'],
    ['Temperos', 'temperos'],
    ['Farinhas', 'farinhas'],
    ['Castanhas', 'castanhas'],
    ['Outros', 'outros'],
    ['Kits', 'kits']
  ];

  const adminExists = db.prepare(`
  SELECT id
  FROM users
  WHERE email = ?
`).get('admin@casasopimenta.com');

if (!adminExists) {
  const hashedPassword = bcrypt.hashSync('admin123', 10);

  db.prepare(`
    INSERT INTO users (name, email, password, role)
    VALUES (?, ?, ?, ?)
  `).run(
    'Administrador',
    'admin@casasopimenta.com',
    hashedPassword,
    'admin'
  );
}

  const insertCategory = db.prepare(`
    INSERT OR IGNORE INTO categories (name, slug)
    VALUES (?, ?)
  `);

  for (const category of categories) {
    insertCategory.run(category);
  }
}