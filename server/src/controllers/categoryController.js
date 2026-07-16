import { pool } from '../database/connection.js';

export async function listCategories(req, res) {
  try {
    const result = await pool.query(`
      SELECT * FROM categories
      WHERE is_active = 1
      ORDER BY name ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao listar categorias:', err);
    res.status(500).json({ message: 'Erro ao listar categorias.' });
  }
}

export async function createCategory(req, res) {
  try {
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
  } catch (err) {
    console.error('Erro ao criar categoria:', err);
    res.status(500).json({ message: 'Erro ao criar categoria.' });
  }
}

export async function updateCategory(req, res) {
  try {
    const { id } = req.params;
    const { name, slug, color, is_active } = req.body;

    const result = await pool.query(`
      UPDATE categories
      SET name = COALESCE($1, name),
          slug = COALESCE($2, slug),
          color = $3,
          is_active = $4,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
    `, [
      name || null,
      slug || null,
      color !== undefined ? (color || null) : undefined,
      is_active !== undefined ? (is_active ? 1 : 0) : undefined,
      id
    ]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: 'Categoria não encontrada.'
      });
    }

    res.json({
      message: 'Categoria atualizada com sucesso.'
    });
  } catch (err) {
    console.error('Erro ao atualizar categoria:', err);
    res.status(500).json({ message: 'Erro ao atualizar categoria.' });
  }
}

export async function deleteCategory(req, res) {
  try {
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
  } catch (err) {
    console.error('Erro ao desativar categoria:', err);
    res.status(500).json({ message: 'Erro ao desativar categoria.' });
  }
}
