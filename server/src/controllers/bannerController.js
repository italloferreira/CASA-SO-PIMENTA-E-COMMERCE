import { pool } from '../database/connection.js';

export async function listBanners(req, res) {
  const result = await pool.query(`
    SELECT * FROM banners
    WHERE is_active = 1
    ORDER BY position ASC
  `);

  res.json(result.rows);
}

export async function createBanner(req, res) {
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
}

export async function updateBanner(req, res) {
  const { id } = req.params;
  const { title, subtitle, image_url, link_url, position, is_active } = req.body;

  const result = await pool.query(`
    UPDATE banners
    SET
      title = $1,
      subtitle = $2,
      image_url = $3,
      link_url = $4,
      position = $5,
      is_active = $6,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $7
  `, [
    title,
    subtitle || null,
    image_url,
    link_url || null,
    position || 0,
    is_active ? 1 : 0,
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
}

export async function deleteBanner(req, res) {
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
}
