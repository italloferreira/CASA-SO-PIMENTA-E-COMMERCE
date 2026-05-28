import { db } from '../database/connection.js';

export function listBanners(req, res) {
  const banners = db.prepare(`
    SELECT *
    FROM banners
    WHERE is_active = 1
    ORDER BY position ASC
  `).all();

  res.json(banners);
}

export function createBanner(req, res) {
  const { title, subtitle, image_url, link_url, position } = req.body;

  if (!title || !image_url) {
    return res.status(400).json({
      message: 'Título e imagem são obrigatórios.'
    });
  }

  const insert = db.prepare(`
    INSERT INTO banners (title, subtitle, image_url, link_url, position)
    VALUES (?, ?, ?, ?, ?)
  `);

  const result = insert.run(
    title,
    subtitle || null,
    image_url,
    link_url || null,
    position || 0
  );

  res.status(201).json({
    id: result.lastInsertRowid,
    message: 'Banner criado com sucesso.'
  });
}

export function updateBanner(req, res) {
  const { id } = req.params;
  const { title, subtitle, image_url, link_url, position, is_active } = req.body;

  const update = db.prepare(`
    UPDATE banners
    SET
      title = ?,
      subtitle = ?,
      image_url = ?,
      link_url = ?,
      position = ?,
      is_active = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  const result = update.run(
    title,
    subtitle || null,
    image_url,
    link_url || null,
    position || 0,
    is_active ? 1 : 0,
    id
  );

  if (result.changes === 0) {
    return res.status(404).json({
      message: 'Banner não encontrado.'
    });
  }

  res.json({
    message: 'Banner atualizado com sucesso.'
  });
}

export function deleteBanner(req, res) {
  const { id } = req.params;

  const update = db.prepare(`
    UPDATE banners
    SET is_active = 0, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  const result = update.run(id);

  if (result.changes === 0) {
    return res.status(404).json({
      message: 'Banner não encontrado.'
    });
  }

  res.json({
    message: 'Banner desativado com sucesso.'
  });
}