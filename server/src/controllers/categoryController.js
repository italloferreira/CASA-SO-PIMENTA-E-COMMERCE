import { db } from '../database/connection.js';

export function listCategories(req, res) {
  const categories = db.prepare(`
    SELECT *
    FROM categories
    WHERE is_active = 1
    ORDER BY name ASC
  `).all();

  res.json(categories);
}

export function createCategory(req, res) {
  const { name, slug } = req.body;

  if (!name || !slug) {
    return res.status(400).json({
      message: 'Nome e slug são obrigatórios.'
    });
  }

  const insert = db.prepare(`
    INSERT INTO categories (name, slug)
    VALUES (?, ?)
  `);

  const result = insert.run(name, slug);

  res.status(201).json({
    id: result.lastInsertRowid,
    name,
    slug
  });
}

export function updateCategory(req, res) {
  const { id } = req.params;
  const { name, slug, is_active } = req.body;

  const update = db.prepare(`
    UPDATE categories
    SET name = ?, slug = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  const result = update.run(name, slug, is_active ? 1 : 0, id);

  if (result.changes === 0) {
    return res.status(404).json({
      message: 'Categoria não encontrada.'
    });
  }

  res.json({
    message: 'Categoria atualizada com sucesso.'
  });
}

export function deleteCategory(req, res) {
  const { id } = req.params;

  const update = db.prepare(`
    UPDATE categories
    SET is_active = 0, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  const result = update.run(id);

  if (result.changes === 0) {
    return res.status(404).json({
      message: 'Categoria não encontrada.'
    });
  }

  res.json({
    message: 'Categoria desativada com sucesso.'
  });
}