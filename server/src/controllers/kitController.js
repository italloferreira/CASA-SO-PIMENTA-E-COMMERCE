import { pool } from '../database/connection.js';

export async function listKits(req, res) {
  const { active } = req.query;

  let sql = `
    SELECT k.*,
      COALESCE(
        json_agg(
          json_build_object(
            'id', ki.id,
            'product_id', ki.product_id,
            'custom_name', ki.custom_name,
            'quantity', ki.quantity,
            'unit', ki.unit,
            'position', ki.position
          ) ORDER BY ki.position
        ) FILTER (WHERE ki.id IS NOT NULL),
        '[]'::json
      ) AS items
    FROM kits k
    LEFT JOIN kit_items ki ON ki.kit_id = k.id
  `;
  const params = [];

  if (active === 'true') {
    sql += ' WHERE k.is_active = 1';
  }

  sql += ' GROUP BY k.id ORDER BY k.created_at DESC';

  const result = await pool.query(sql, params);
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
    stock,
    image_url,
    active,
    is_active,
    is_featured
  } = req.body;

  if (!name || price === undefined) {
    return res.status(400).json({
      message: 'Nome e preço são obrigatórios.'
    });
  }

  const finalSlug = slug || name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') + '-' + Date.now();

  const finalActive = active !== undefined ? active : (is_active !== undefined ? is_active : true);

  const result = await pool.query(`
    INSERT INTO kits (name, slug, description, price, stock, image_url, is_active, is_featured)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id
  `, [
    name,
    finalSlug,
    description || null,
    Number(price),
    stock === true || stock === 1 || stock === '1' || stock === 'true',
    image_url || null,
    finalActive ? 1 : 0,
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
    stock,
    image_url,
    active,
    is_active,
    is_featured
  } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Nome é obrigatório.' });
  }

  const finalActive = active !== undefined ? active : (is_active !== undefined ? is_active : true);

  const result = await pool.query(`
    UPDATE kits
    SET
      name = $1,
      slug = COALESCE(NULLIF($2, ''), slug),
      description = $3,
      price = $4,
      stock = $5,
      image_url = $6,
      is_active = $7,
      is_featured = $8,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $9
  `, [
    name,
    slug || '',
    description || null,
    Number(price),
    stock === true || stock === 1 || stock === '1' || stock === 'true',
    image_url || null,
    finalActive ? 1 : 0,
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

export async function deleteKitItems(req, res) {
  const { id } = req.params;

  await pool.query(`
    DELETE FROM kit_items WHERE kit_id = $1
  `, [id]);

  res.json({
    message: 'Itens do kit removidos com sucesso.'
  });
}

export async function getKitsStatus(req, res) {
  const { ids } = req.query;

  if (!ids) {
    return res.json({});
  }

  const idList = ids.split(',').map(Number).filter(function (n) { return !isNaN(n) && n > 0; });

  if (idList.length === 0) {
    return res.json({});
  }

  const placeholders = idList.map(function (_, i) { return '$' + (i + 1); }).join(',');
  const result = await pool.query(
    `SELECT id, stock, is_active FROM kits WHERE id IN (${placeholders})`,
    idList
  );

  var statusMap = {};
  result.rows.forEach(function (row) {
    statusMap[String(row.id)] = { stock: !!row.stock, is_active: row.is_active };
  });

  res.json(statusMap);
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
