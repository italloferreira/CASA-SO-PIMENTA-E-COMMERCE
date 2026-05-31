import { pool } from '../database/connection.js';

export async function listKits(req, res) {
  const result = await pool.query(`
    SELECT * FROM kits
    WHERE is_active = 1
    ORDER BY created_at DESC
  `);

  res.json(result.rows);
}

export async function getKitById(req, res) {
  const { id } = req.params;

  const kitResult = await pool.query(`
    SELECT * FROM kits WHERE id = $1
  `, [id]);

  const kit = kitResult.rows[0];

  if (!kit) {
    return res.status(404).json({
      message: 'Kit não encontrado.'
    });
  }

  const itemsResult = await pool.query(`
    SELECT * FROM kit_items
    WHERE kit_id = $1
    ORDER BY position ASC
  `, [id]);

  res.json({
    ...kit,
    items: itemsResult.rows
  });
}

export async function createKit(req, res) {
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

  const result = await pool.query(`
    INSERT INTO kits (name, slug, description, price, image_url, is_featured)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id
  `, [
    name,
    slug,
    description || null,
    Number(price),
    image_url || null,
    is_featured ? 1 : 0
  ]);

  res.status(201).json({
    id: result.rows[0].id,
    message: 'Kit criado com sucesso.'
  });
}

export async function updateKit(req, res) {
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

  const result = await pool.query(`
    UPDATE kits
    SET
      name = $1,
      slug = $2,
      description = $3,
      price = $4,
      image_url = $5,
      is_active = $6,
      is_featured = $7,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $8
  `, [
    name,
    slug,
    description || null,
    Number(price),
    image_url || null,
    is_active ? 1 : 0,
    is_featured ? 1 : 0,
    id
  ]);

  if (result.rowCount === 0) {
    return res.status(404).json({
      message: 'Kit não encontrado.'
    });
  }

  res.json({
    message: 'Kit atualizado com sucesso.'
  });
}

export async function addKitItem(req, res) {
  const { id } = req.params;

  const {
    product_id,
    custom_name,
    quantity,
    unit,
    position
  } = req.body;

  const result = await pool.query(`
    INSERT INTO kit_items (kit_id, product_id, custom_name, quantity, unit, position)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id
  `, [
    id,
    product_id || null,
    custom_name || null,
    quantity || null,
    unit || null,
    position || 0
  ]);

  res.status(201).json({
    id: result.rows[0].id,
    message: 'Item adicionado ao kit.'
  });
}

export async function deleteKit(req, res) {
  const { id } = req.params;

  const result = await pool.query(`
    UPDATE kits
    SET is_active = 0, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
  `, [id]);

  if (result.rowCount === 0) {
    return res.status(404).json({
      message: 'Kit não encontrado.'
    });
  }

  res.json({
    message: 'Kit desativado com sucesso.'
  });
}
