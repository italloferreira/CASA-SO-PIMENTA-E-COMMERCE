import { pool } from '../database/connection.js';

export async function listBanners(req, res) {
  try {
    const result = await pool.query(`
      SELECT * FROM banners
      WHERE is_active = 1
      ORDER BY position ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao listar banners:', err);
    res.status(500).json({ message: 'Erro ao listar banners.' });
  }
}

export async function createBanner(req, res) {
  try {
    const { title, subtitle, image_url, link_url, position } = req.body;

    if (!title || !image_url) {
      return res.status(400).json({
        message: 'Título e imagem são obrigatórios.'
      });
    }

    const result = await pool.query(`
      INSERT INTO banners (title, subtitle, image_url, link_url, position)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [
      title,
      subtitle || null,
      image_url,
      link_url || null,
      position || 0
    ]);

    res.status(201).json({
      id: result.rows[0].id,
      message: 'Banner criado com sucesso.'
    });
  } catch (err) {
    console.error('Erro ao criar banner:', err);
    res.status(500).json({ message: 'Erro ao criar banner.' });
  }
}

export async function updateBanner(req, res) {
  try {
    const { id } = req.params;
    const { title, subtitle, image_url, link_url, position, is_active } = req.body;

    const result = await pool.query(`
      UPDATE banners
      SET
        title = COALESCE($1, title),
        subtitle = $2,
        image_url = COALESCE($3, image_url),
        link_url = $4,
        position = COALESCE($5, position),
        is_active = $6,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
    `, [
      title || null,
      subtitle !== undefined ? (subtitle || null) : undefined,
      image_url || null,
      link_url !== undefined ? (link_url || null) : undefined,
      position !== undefined ? position : undefined,
      is_active !== undefined ? (is_active ? 1 : 0) : undefined,
      id
    ]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: 'Banner não encontrado.'
      });
    }

    res.json({
      message: 'Banner atualizado com sucesso.'
    });
  } catch (err) {
    console.error('Erro ao atualizar banner:', err);
    res.status(500).json({ message: 'Erro ao atualizar banner.' });
  }
}

export async function deleteBanner(req, res) {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      UPDATE banners
      SET is_active = 0, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: 'Banner não encontrado.'
      });
    }

    res.json({
      message: 'Banner desativado com sucesso.'
    });
  } catch (err) {
    console.error('Erro ao desativar banner:', err);
    res.status(500).json({ message: 'Erro ao desativar banner.' });
  }
}
