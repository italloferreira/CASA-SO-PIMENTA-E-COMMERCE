import { db } from '../database/connection.js';

export function listKits(req, res) {
  const kits = db.prepare(`
    SELECT *
    FROM kits
    WHERE is_active = 1
    ORDER BY created_at DESC
  `).all();

  res.json(kits);
}

export function getKitById(req, res) {
  const { id } = req.params;

  const kit = db.prepare(`
    SELECT *
    FROM kits
    WHERE id = ?
  `).get(id);

  if (!kit) {
    return res.status(404).json({
      message: 'Kit não encontrado.'
    });
  }

  const items = db.prepare(`
    SELECT *
    FROM kit_items
    WHERE kit_id = ?
    ORDER BY position ASC
  `).all(id);

  res.json({
    ...kit,
    items
  });
}

export function createKit(req, res) {
  const {
    name,
    slug,
    description,
    price,
    image_url,
    is_featured
  } = req.body;

  if (!name || !slug || price === undefined) {
    return res.status(400).json({
      message: 'Nome, slug e preço são obrigatórios.'
    });
  }

  const insert = db.prepare(`
    INSERT INTO kits (
      name,
      slug,
      description,
      price,
      image_url,
      is_featured
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const result = insert.run(
    name,
    slug,
    description || null,
    Number(price),
    image_url || null,
    is_featured ? 1 : 0
  );

  res.status(201).json({
    id: result.lastInsertRowid,
    message: 'Kit criado com sucesso.'
  });
}

export function updateKit(req, res) {
  const { id } = req.params;

  const {
    name,
    slug,
    description,
    price,
    image_url,
    is_active,
    is_featured
  } = req.body;

  const update = db.prepare(`
    UPDATE kits
    SET
      name = ?,
      slug = ?,
      description = ?,
      price = ?,
      image_url = ?,
      is_active = ?,
      is_featured = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  const result = update.run(
    name,
    slug,
    description || null,
    Number(price),
    image_url || null,
    is_active ? 1 : 0,
    is_featured ? 1 : 0,
    id
  );

  if (result.changes === 0) {
    return res.status(404).json({
      message: 'Kit não encontrado.'
    });
  }

  res.json({
    message: 'Kit atualizado com sucesso.'
  });
}

export function addKitItem(req, res) {
  const { id } = req.params;

  const {
    product_id,
    custom_name,
    quantity,
    unit,
    position
  } = req.body;

  const insert = db.prepare(`
    INSERT INTO kit_items (
      kit_id,
      product_id,
      custom_name,
      quantity,
      unit,
      position
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const result = insert.run(
    id,
    product_id || null,
    custom_name || null,
    quantity || null,
    unit || null,
    position || 0
  );

  res.status(201).json({
    id: result.lastInsertRowid,
    message: 'Item adicionado ao kit.'
  });
}

export function deleteKit(req, res) {
  const { id } = req.params;

  const update = db.prepare(`
    UPDATE kits
    SET is_active = 0, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  const result = update.run(id);

  if (result.changes === 0) {
    return res.status(404).json({
      message: 'Kit não encontrado.'
    });
  }

  res.json({
    message: 'Kit desativado com sucesso.'
  });
}