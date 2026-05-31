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
  const { name, slug } = req.body;

  if (!name || !slug) {
    return res.status(400).json({
      message: 'Nome e slug são obrigatórios.'
    });
  }

  const result = await pool.query(`
    INSERT INTO categories (name, slug)
    VALUES ($1, $2)
    RETURNING id
  `, [name, slug]);

  res.status(201).json({
    id: result.rows[0].id,
    name,
    slug
  });
}

export async function updateCategory(req, res) {
  const { id } = req.params;
  const { name, slug, is_active } = req.body;

  const result = await pool.query(`
    UPDATE categories
    SET name = $1, slug = $2, is_active = $3, updated_at = CURRENT_TIMESTAMP
    WHERE id = $4
  `, [name, slug, is_active ? 1 : 0, id]);

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
