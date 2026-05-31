import { pool } from '../database/connection.js';

export async function listProducts(req, res) {
  const { category } = req.query;

  let result;

  if (category) {
    result = await pool.query(`
      SELECT
        products.*,
        categories.name AS category_name,
        categories.slug AS category_slug
      FROM products
      LEFT JOIN categories ON categories.id = products.category_id
      WHERE products.is_active = 1
      AND categories.slug = $1
      ORDER BY products.created_at DESC
    `, [category]);
  } else {
    result = await pool.query(`
      SELECT
        products.*,
        categories.name AS category_name,
        categories.slug AS category_slug
      FROM products
      LEFT JOIN categories ON categories.id = products.category_id
      WHERE products.is_active = 1
      ORDER BY products.created_at DESC
    `);
  }

  res.json(result.rows);
}

export async function getProductById(req, res) {
  const { id } = req.params;

  const result = await pool.query(`
    SELECT
      products.*,
      categories.name AS category_name,
      categories.slug AS category_slug
    FROM products
    LEFT JOIN categories ON categories.id = products.category_id
    WHERE products.id = $1
  `, [id]);

  const product = result.rows[0];

  if (!product) {
    return res.status(404).json({
      message: 'Produto não encontrado.'
    });
  }

  res.json(product);
}

export async function createProduct(req, res) {
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

  if (!name || !slug || price === undefined) {
    return res.status(400).json({
      message: 'Nome, slug e preço são obrigatórios.'
    });
  }

  const result = await pool.query(`
    INSERT INTO products (
      category_id, name, slug, description, ingredients,
      price, stock, image_url, is_active, is_featured
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING id
  `, [
    category_id || null,
    name,
    slug,
    description || null,
    ingredients || null,
    Number(price),
    Number(stock || 0),
    image_url || null,
    is_active !== false ? 1 : 0,
    is_featured ? 1 : 0
  ]);

  res.status(201).json({
    id: result.rows[0].id,
    message: 'Produto criado com sucesso.'
  });
}

export async function updateProduct(req, res) {
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

  const result = await pool.query(`
    UPDATE products
    SET
      category_id = $1,
      name = $2,
      slug = $3,
      description = $4,
      ingredients = $5,
      price = $6,
      stock = $7,
      image_url = $8,
      is_active = $9,
      is_featured = $10,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $11
  `, [
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
  ]);

  if (result.rowCount === 0) {
    return res.status(404).json({
      message: 'Produto não encontrado.'
    });
  }

  res.json({
    message: 'Produto atualizado com sucesso.'
  });
}

export async function deleteProduct(req, res) {
  const { id } = req.params;

  const result = await pool.query(`
    UPDATE products
    SET is_active = 0, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
  `, [id]);

  if (result.rowCount === 0) {
    return res.status(404).json({
      message: 'Produto não encontrado.'
    });
  }

  res.json({
    message: 'Produto desativado com sucesso.'
  });
}
