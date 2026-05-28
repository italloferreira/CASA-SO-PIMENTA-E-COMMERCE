import { db } from '../database/connection.js';

export function listProducts(req, res) {
  const { category } = req.query;

  let products;

  if (category) {
    products = db.prepare(`
      SELECT 
        products.*,
        categories.name AS category_name,
        categories.slug AS category_slug
      FROM products
      LEFT JOIN categories ON categories.id = products.category_id
      WHERE products.is_active = 1
      AND categories.slug = ?
      ORDER BY products.created_at DESC
    `).all(category);
  } else {
    products = db.prepare(`
      SELECT 
        products.*,
        categories.name AS category_name,
        categories.slug AS category_slug
      FROM products
      LEFT JOIN categories ON categories.id = products.category_id
      WHERE products.is_active = 1
      ORDER BY products.created_at DESC
    `).all();
  }

  res.json(products);
}

export function getProductById(req, res) {
  const { id } = req.params;

  const product = db.prepare(`
    SELECT 
      products.*,
      categories.name AS category_name,
      categories.slug AS category_slug
    FROM products
    LEFT JOIN categories ON categories.id = products.category_id
    WHERE products.id = ?
  `).get(id);

  if (!product) {
    return res.status(404).json({
      message: 'Produto não encontrado.'
    });
  }

  res.json(product);
}

export function createProduct(req, res) {
  const {
    category_id,
    name,
    slug,
    description,
    ingredients,
    price,
    stock,
    image_url,
    is_featured
  } = req.body;

  if (!name || !slug || price === undefined) {
    return res.status(400).json({
      message: 'Nome, slug e preço são obrigatórios.'
    });
  }

  const insert = db.prepare(`
    INSERT INTO products (
      category_id,
      name,
      slug,
      description,
      ingredients,
      price,
      stock,
      image_url,
      is_featured
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = insert.run(
    category_id || null,
    name,
    slug,
    description || null,
    ingredients || null,
    Number(price),
    Number(stock || 0),
    image_url || null,
    is_featured ? 1 : 0
  );

  res.status(201).json({
    id: result.lastInsertRowid,
    message: 'Produto criado com sucesso.'
  });
}

export function updateProduct(req, res) {
  const { id } = req.params;

  const {
    category_id,
    name,
    slug,
    description,
    ingredients,
    price,
    stock,
    image_url,
    is_active,
    is_featured
  } = req.body;

  const update = db.prepare(`
    UPDATE products
    SET
      category_id = ?,
      name = ?,
      slug = ?,
      description = ?,
      ingredients = ?,
      price = ?,
      stock = ?,
      image_url = ?,
      is_active = ?,
      is_featured = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  const result = update.run(
    category_id || null,
    name,
    slug,
    description || null,
    ingredients || null,
    Number(price),
    Number(stock || 0),
    image_url || null,
    is_active ? 1 : 0,
    is_featured ? 1 : 0,
    id
  );

  if (result.changes === 0) {
    return res.status(404).json({
      message: 'Produto não encontrado.'
    });
  }

  res.json({
    message: 'Produto atualizado com sucesso.'
  });
}

export function deleteProduct(req, res) {
  const { id } = req.params;

  const update = db.prepare(`
    UPDATE products
    SET is_active = 0, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  const result = update.run(id);

  if (result.changes === 0) {
    return res.status(404).json({
      message: 'Produto não encontrado.'
    });
  }

  res.json({
    message: 'Produto desativado com sucesso.'
  });
}