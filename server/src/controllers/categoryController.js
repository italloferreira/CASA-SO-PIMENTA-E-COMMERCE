import { pool } from '../database/connection.js';

export async function listCategories(req, res) {
  const result = await pool.query(`
    SELECT * FROM categories
    WHERE is_active = 1
    ORDER BY name ASC
  `);

  res.json(result.rows);
}

export async function createCategory(req, res) {
  const { name, slug, color } = req.body;

  if (!name || !slug) {
    return res.status(400).json({
      message: 'Nome e slug são obrigatórios.'
    });
  }

  const result = await pool.query(`
    INSERT INTO categories (name, slug, color)
    VALUES ($1, $2, $3)
    RETURNING id
  `, [name, slug, color || null]);

  res.status(201).json({
    id: result.rows[0].id,
    name,
    slug,
    color
  });
}

export async function updateCategory(req, res) {
  const { id } = req.params;
  const { name, slug, color, is_active } = req.body;

  const result = await pool.query(`
    UPDATE categories
    SET name = $1, slug = $2, color = $3, is_active = $4, updated_at = CURRENT_TIMESTAMP
    WHERE id = $5
  `, [name, slug, color || null, is_active ? 1 : 0, id]);

  if (result.rowCount === 0) {
    return res.status(404).json({
      message: 'Categoria não encontrada.'
    });
  }

  res.json({
    message: 'Categoria atualizada com sucesso.'
  });
}

export async function deleteCategory(req, res) {
  const { id } = req.params;

  const result = await pool.query(`
    UPDATE categories
    SET is_active = 0, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
  `, [id]);

  if (result.rowCount === 0) {
    return res.status(404).json({
      message: 'Categoria não encontrada.'
    });
  }

  res.json({
    message: 'Categoria desativada com sucesso.'
  });
}
