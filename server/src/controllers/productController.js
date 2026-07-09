import { pool } from '../database/connection.js';

export async function listProducts(req, res) {
  const { category, featured, limit, offset } = req.query;
  const isAdmin = req.user?.role === 'admin';

  let conditions = [];
  let params = [];
  let paramIndex = 1;

  if (category) {
    conditions.push(`categories.slug = $${paramIndex++}`);
    params.push(category);
  }

  if (featured === 'true') {
    conditions.push(`products.is_featured = 1`);
  }

  if (!isAdmin) {
    conditions.push(`products.is_active = 1`);
  }

  const whereClause = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';

  const limitVal = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
  const offsetVal = Math.max(parseInt(offset) || 0, 0);

  const countResult = await pool.query(`
    SELECT COUNT(*) AS total
    FROM products
    LEFT JOIN categories ON categories.id = products.category_id
    ${whereClause}
  `, params);

  const total = parseInt(countResult.rows[0].total);

  const query = `
    SELECT
      products.*,
      categories.name AS category_name,
      categories.slug AS category_slug
    FROM products
    LEFT JOIN categories ON categories.id = products.category_id
    ${whereClause}
    ORDER BY products.created_at DESC
    LIMIT $${paramIndex++} OFFSET $${paramIndex++}
  `;

  const result = await pool.query(query, [...params, limitVal, offsetVal]);
  res.json({ products: result.rows, total });
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
    compare_price,
    stock,
    weight,
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
      price, compare_price, stock, weight, image_url, is_active, is_featured
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING id
  `, [
    category_id || null,
    name,
    slug,
    description || null,
    ingredients || null,
    Number(price),
    compare_price ? Number(compare_price) : null,
    Number(stock || 0),
    Number(weight || 0),
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
    compare_price,
    stock,
    weight,
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
      compare_price = $7,
      stock = $8,
      weight = $9,
      image_url = $10,
      is_active = $11,
      is_featured = $12,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $13
  `, [
    category_id || null,
    name,
    slug,
    description || null,
    ingredients || null,
    Number(price),
    compare_price ? Number(compare_price) : null,
    Number(stock || 0),
    Number(weight || 0),
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

export async function searchProducts(req, res) {
  const { q } = req.query;

  if (!q || q.trim().length === 0) {
    return res.status(400).json({ message: 'Termo de busca é obrigatório.' });
  }

  const searchTerm = `%${q.trim()}%`;

  const result = await pool.query(`
    SELECT
      products.*,
      categories.name AS category_name,
      categories.slug AS category_slug
    FROM products
    LEFT JOIN categories ON categories.id = products.category_id
    WHERE products.is_active = 1
    AND (
      products.name ILIKE $1
      OR products.description ILIKE $1
      OR products.ingredients ILIKE $1
      OR categories.name ILIKE $1
    )
    ORDER BY products.created_at DESC
  `, [searchTerm]);

  res.json(result.rows);
}

export async function deleteProduct(req, res) {
  const { id } = req.params;

  const product = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
  if (product.rows.length === 0) {
    return res.status(404).json({ message: 'Produto não encontrado.' });
  }

  const orderRefs = await pool.query(
    'SELECT COUNT(*) AS count FROM order_items WHERE product_id = $1', [id]
  );

  if (Number(orderRefs.rows[0].count) > 0) {
    await pool.query(`
      UPDATE products SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = $1
    `, [id]);
    return res.json({
      message: 'Produto possui pedidos vinculados. Foi desativado em vez de excluído.'
    });
  }

  await pool.query('DELETE FROM cart_items WHERE product_id = $1', [id]);
  await pool.query('DELETE FROM kit_items WHERE product_id = $1', [id]);
  await pool.query('DELETE FROM products WHERE id = $1', [id]);

  res.json({ message: 'Produto excluído permanentemente.' });
}
