import { pool } from '../database/connection.js';
import crypto from 'crypto';

function getCartToken(req) {
  if (req.user) return null;
  let token = req.cookies?.csp_cart_token;
  if (!token) {
    token = crypto.randomUUID();
  }
  return token;
}

function setCartCookie(res, token) {
  if (token) {
    res.cookie('csp_cart_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });
  }
}

async function getOrCreateCart(client, userId, cartToken) {
  let result;

  if (userId) {
    result = await client.query(
      'SELECT id FROM carts WHERE user_id = $1',
      [userId]
    );
    if (result.rows.length > 0) {
      return result.rows[0].id;
    }
    const insert = await client.query(
      'INSERT INTO carts (user_id) VALUES ($1) RETURNING id',
      [userId]
    );
    return insert.rows[0].id;
  }

  if (cartToken) {
    result = await client.query(
      'SELECT id FROM carts WHERE cart_token = $1',
      [cartToken]
    );
    if (result.rows.length > 0) {
      return result.rows[0].id;
    }
    const insert = await client.query(
      'INSERT INTO carts (cart_token) VALUES ($1) RETURNING id',
      [cartToken]
    );
    return insert.rows[0].id;
  }

  return null;
}

async function enrichCartItems(client, cartId) {
  const result = await client.query(`
    SELECT
      ci.id,
      ci.cart_id,
      ci.product_id,
      ci.kit_id,
      ci.quantity,
      ci.created_at,
      ci.updated_at,
      p.name AS product_name,
      p.slug AS product_slug,
      p.price AS product_price,
      p.compare_price AS product_compare_price,
      p.image_url AS product_image,
      p.stock AS product_stock,
      k.name AS kit_name,
      k.slug AS kit_slug,
      k.price AS kit_price,
      k.image_url AS kit_image,
      k.stock AS kit_stock
    FROM cart_items ci
    LEFT JOIN products p ON p.id = ci.product_id
    LEFT JOIN kits k ON k.id = ci.kit_id
    WHERE ci.cart_id = $1
    ORDER BY ci.created_at ASC
  `, [cartId]);

  return result.rows.map(function (item) {
    const isProduct = !!item.product_id;
    const name = isProduct ? item.product_name : item.kit_name;
    const slug = isProduct ? item.product_slug : item.kit_slug;
    const price = isProduct ? Number(item.product_price) : Number(item.kit_price);
    const image = isProduct ? item.product_image : item.kit_image;
    const inStock = isProduct ? item.product_stock : item.kit_stock;

    return {
      id: item.id,
      cart_id: item.cart_id,
      product_id: item.product_id,
      kit_id: item.kit_id,
      quantity: item.quantity,
      name,
      slug,
      unit_price: price,
      total: price * item.quantity,
      image,
      in_stock: inStock,
      type: isProduct ? 'product' : 'kit',
      created_at: item.created_at,
      updated_at: item.updated_at
    };
  });
}

export async function getCart(req, res) {
  try {
    const client = await pool.connect();
    try {
      const userId = req.user?.id || null;
      const cartToken = getCartToken(req);
      const cartId = await getOrCreateCart(client, userId, cartToken);

      if (!cartId) {
        return res.json({ success: true, cart: { items: [], subtotal: 0, total_items: 0 } });
      }

      setCartCookie(res, cartToken);

      const items = await enrichCartItems(client, cartId);
      const subtotal = items.reduce(function (sum, item) { return sum + item.total; }, 0);
      const totalItems = items.reduce(function (sum, item) { return sum + item.quantity; }, 0);

      res.json({
        success: true,
        cart: {
          id: cartId,
          items,
          subtotal: Math.round(subtotal * 100) / 100,
          total_items: totalItems
        }
      });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Erro getCart:', err);
    res.status(500).json({ message: 'Erro ao buscar carrinho.' });
  }
}

export async function addItem(req, res) {
  try {
    const { product_id, kit_id, quantity } = req.body;

    if (!product_id && !kit_id) {
      return res.status(400).json({ message: 'product_id ou kit_id e obrigatorio.' });
    }
    if (product_id && kit_id) {
      return res.status(400).json({ message: 'Envie product_id ou kit_id, nao ambos.' });
    }

    const qty = Math.max(parseInt(quantity) || 1, 1);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const userId = req.user?.id || null;
      const cartToken = getCartToken(req);
      const cartId = await getOrCreateCart(client, userId, cartToken);
      setCartCookie(res, cartToken);

      if (product_id) {
        const prodResult = await client.query(
          'SELECT id, name, stock FROM products WHERE id = $1 AND is_active = 1',
          [product_id]
        );
        if (prodResult.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ message: 'Produto nao encontrado ou inativo.' });
        }
        if (!prodResult.rows[0].stock) {
          await client.query('ROLLBACK');
          return res.status(400).json({ message: 'Produto fora de estoque.' });
        }
      }

      if (kit_id) {
        const kitResult = await client.query(
          'SELECT id, name, stock FROM kits WHERE id = $1 AND is_active = 1',
          [kit_id]
        );
        if (kitResult.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ message: 'Kit nao encontrado ou inativo.' });
        }
        if (!kitResult.rows[0].stock) {
          await client.query('ROLLBACK');
          return res.status(400).json({ message: 'Kit fora de estoque.' });
        }
      }

      const existingItem = await client.query(
        'SELECT id, quantity FROM cart_items WHERE cart_id = $1 AND (product_id = $2 OR kit_id = $3)',
        [cartId, product_id || null, kit_id || null]
      );

      let cartItemId;
      let newQuantity;

      if (existingItem.rows.length > 0) {
        newQuantity = existingItem.rows[0].quantity + qty;
        await client.query(
          'UPDATE cart_items SET quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [newQuantity, existingItem.rows[0].id]
        );
        cartItemId = existingItem.rows[0].id;
      } else {
        const insertResult = await client.query(
          'INSERT INTO cart_items (cart_id, product_id, kit_id, quantity) VALUES ($1, $2, $3, $4) RETURNING id',
          [cartId, product_id || null, kit_id || null, qty]
        );
        cartItemId = insertResult.rows[0].id;
        newQuantity = qty;
      }

      await client.query('COMMIT');

      const items = await enrichCartItems(client, cartId);
      const subtotal = items.reduce(function (sum, item) { return sum + item.total; }, 0);
      const totalItems = items.reduce(function (sum, item) { return sum + item.quantity; }, 0);

      res.json({
        success: true,
        message: 'Item adicionado ao carrinho.',
        cart_item_id: cartItemId,
        quantity: newQuantity,
        cart: {
          id: cartId,
          items,
          subtotal: Math.round(subtotal * 100) / 100,
          total_items: totalItems
        }
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Erro addItem:', err);
    res.status(500).json({ message: 'Erro ao adicionar item ao carrinho.' });
  }
}

export async function updateItem(req, res) {
  try {
    const { id } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 0) {
      return res.status(400).json({ message: 'Quantidade invalida.' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const itemResult = await client.query(
        'SELECT ci.*, c.user_id, c.cart_token FROM cart_items ci JOIN carts c ON c.id = ci.cart_id WHERE ci.id = $1',
        [id]
      );

      if (itemResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Item nao encontrado no carrinho.' });
      }

      const item = itemResult.rows[0];

      if (req.user) {
        if (item.user_id && item.user_id !== req.user.id && req.user.role !== 'admin') {
          await client.query('ROLLBACK');
          return res.status(403).json({ message: 'Acesso negado.' });
        }
      } else {
        const cartToken = req.cookies?.csp_cart_token;
        if (item.cart_token !== cartToken) {
          await client.query('ROLLBACK');
          return res.status(403).json({ message: 'Acesso negado.' });
        }
      }

      if (quantity === 0) {
        await client.query('DELETE FROM cart_items WHERE id = $1', [id]);
        await client.query('COMMIT');

        const items = await enrichCartItems(client, item.cart_id);
        const subtotal = items.reduce(function (sum, i) { return sum + i.total; }, 0);
        const totalItems = items.reduce(function (sum, i) { return sum + i.quantity; }, 0);

        return res.json({
          success: true,
          message: 'Item removido do carrinho.',
          cart: { id: item.cart_id, items, subtotal: Math.round(subtotal * 100) / 100, total_items: totalItems }
        });
      }

      await client.query(
        'UPDATE cart_items SET quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [quantity, id]
      );

      await client.query('COMMIT');

      const items = await enrichCartItems(client, item.cart_id);
      const subtotal = items.reduce(function (sum, i) { return sum + i.total; }, 0);
      const totalItems = items.reduce(function (sum, i) { return sum + i.quantity; }, 0);

      res.json({
        success: true,
        message: 'Quantidade atualizada.',
        cart: { id: item.cart_id, items, subtotal: Math.round(subtotal * 100) / 100, total_items: totalItems }
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Erro updateItem:', err);
    res.status(500).json({ message: 'Erro ao atualizar item.' });
  }
}

export async function removeItem(req, res) {
  try {
    const { id } = req.params;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const itemResult = await client.query(
        'SELECT ci.*, c.user_id, c.cart_token FROM cart_items ci JOIN carts c ON c.id = ci.cart_id WHERE ci.id = $1',
        [id]
      );

      if (itemResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Item nao encontrado.' });
      }

      const item = itemResult.rows[0];

      if (req.user) {
        if (item.user_id && item.user_id !== req.user.id && req.user.role !== 'admin') {
          await client.query('ROLLBACK');
          return res.status(403).json({ message: 'Acesso negado.' });
        }
      } else {
        const cartToken = req.cookies?.csp_cart_token;
        if (item.cart_token !== cartToken) {
          await client.query('ROLLBACK');
          return res.status(403).json({ message: 'Acesso negado.' });
        }
      }

      await client.query('DELETE FROM cart_items WHERE id = $1', [id]);
      await client.query('COMMIT');

      const items = await enrichCartItems(client, item.cart_id);
      const subtotal = items.reduce(function (sum, i) { return sum + i.total; }, 0);
      const totalItems = items.reduce(function (sum, i) { return sum + i.quantity; }, 0);

      res.json({
        success: true,
        message: 'Item removido.',
        cart: { id: item.cart_id, items, subtotal: Math.round(subtotal * 100) / 100, total_items: totalItems }
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Erro removeItem:', err);
    res.status(500).json({ message: 'Erro ao remover item.' });
  }
}

export async function clearCart(req, res) {
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const userId = req.user?.id || null;
      const cartToken = getCartToken(req);
      const cartId = await getOrCreateCart(client, userId, cartToken);

      if (cartId) {
        await client.query('DELETE FROM cart_items WHERE cart_id = $1', [cartId]);
      }

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Carrinho esvaziado.',
        cart: { id: cartId, items: [], subtotal: 0, total_items: 0 }
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Erro clearCart:', err);
    res.status(500).json({ message: 'Erro ao esvaziar carrinho.' });
  }
}

export async function mergeGuestCart(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Login obrigatorio.' });
    }

    const guestToken = req.cookies?.csp_cart_token;
    if (!guestToken) {
      return res.json({ success: true, message: 'Nenhum carrinho de visitante para migrar.' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const guestCartResult = await client.query(
        'SELECT id FROM carts WHERE cart_token = $1',
        [guestToken]
      );

      if (guestCartResult.rows.length === 0) {
        await client.query('COMMIT');
        return res.json({ success: true, message: 'Nenhum carrinho de visitante encontrado.' });
      }

      const guestCartId = guestCartResult.rows[0].id;
      const userCartId = await getOrCreateCart(client, req.user.id, null);

      const guestItems = await client.query(
        'SELECT product_id, kit_id, quantity FROM cart_items WHERE cart_id = $1',
        [guestCartId]
      );

      for (const gItem of guestItems.rows) {
        const existing = await client.query(
          'SELECT id, quantity FROM cart_items WHERE cart_id = $1 AND (product_id = $2 OR kit_id = $3)',
          [userCartId, gItem.product_id || null, gItem.kit_id || null]
        );

        if (existing.rows.length > 0) {
          await client.query(
            'UPDATE cart_items SET quantity = quantity + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [gItem.quantity, existing.rows[0].id]
          );
        } else {
          await client.query(
            'INSERT INTO cart_items (cart_id, product_id, kit_id, quantity) VALUES ($1, $2, $3, $4)',
            [userCartId, gItem.product_id, gItem.kit_id, gItem.quantity]
          );
        }
      }

      await client.query('DELETE FROM cart_items WHERE cart_id = $1', [guestCartId]);
      await client.query('DELETE FROM carts WHERE id = $1', [guestCartId]);

      await client.query('COMMIT');

      res.clearCookie('csp_cart_token');

      const items = await enrichCartItems(client, userCartId);
      const subtotal = items.reduce(function (sum, i) { return sum + i.total; }, 0);
      const totalItems = items.reduce(function (sum, i) { return sum + i.quantity; }, 0);

      res.json({
        success: true,
        message: 'Carrinho do visitante migrado com sucesso.',
        cart: { id: userCartId, items, subtotal: Math.round(subtotal * 100) / 100, total_items: totalItems }
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Erro mergeGuestCart:', err);
    res.status(500).json({ message: 'Erro ao migrar carrinho.' });
  }
}
