import { pool } from '../database/connection.js';

export async function createOrder(req, res) {
  const {
    customer_name,
    customer_email,
    customer_phone,
    cep,
    address,
    city,
    state,
    items,
    delivery_fee,
    notes
  } = req.body;

  if (!customer_name || !customer_phone || !items || items.length === 0) {
    return res.status(400).json({
      message: 'Dados do cliente e itens são obrigatórios.'
    });
  }

  let subtotal = 0;
  const orderItems = [];

  for (const item of items) {
    let product = null;
    let kit = null;

    if (item.product_id) {
      const productResult = await pool.query(`
        SELECT * FROM products
        WHERE id = $1 AND is_active = 1
      `, [item.product_id]);

      product = productResult.rows[0];

      if (!product) {
        return res.status(400).json({
          message: `Produto ${item.product_id} não encontrado.`
        });
      }

      const total = Number(product.price) * item.quantity;
      subtotal += total;

      orderItems.push({
        product_id: product.id,
        kit_id: null,
        item_name: product.name,
        unit_price: Number(product.price),
        quantity: item.quantity,
        total
      });
    }

    if (item.kit_id) {
      const kitResult = await pool.query(`
        SELECT * FROM kits
        WHERE id = $1 AND is_active = 1
      `, [item.kit_id]);

      kit = kitResult.rows[0];

      if (!kit) {
        return res.status(400).json({
          message: `Kit ${item.kit_id} não encontrado.`
        });
      }

      const total = Number(kit.price) * item.quantity;
      subtotal += total;

      orderItems.push({
        product_id: null,
        kit_id: kit.id,
        item_name: kit.name,
        unit_price: Number(kit.price),
        quantity: item.quantity,
        total
      });
    }
  }

  const deliveryFeeValue = Number(delivery_fee || 0);
  const total = subtotal + deliveryFeeValue;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const orderResult = await client.query(`
      INSERT INTO orders (
        user_id, customer_name, customer_email, customer_phone,
        cep, address, city, state,
        subtotal, delivery_fee, total, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id
    `, [
      req.user?.id || null,
      customer_name,
      customer_email || null,
      customer_phone,
      cep || null,
      address || null,
      city || null,
      state || null,
      subtotal,
      deliveryFeeValue,
      total,
      notes || null
    ]);

    const orderId = orderResult.rows[0].id;

    for (const orderItem of orderItems) {
      await client.query(`
        INSERT INTO order_items (order_id, product_id, kit_id, item_name, unit_price, quantity, total)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        orderId,
        orderItem.product_id,
        orderItem.kit_id,
        orderItem.item_name,
        orderItem.unit_price,
        orderItem.quantity,
        orderItem.total
      ]);
    }

    await client.query('COMMIT');

    res.status(201).json({
      id: orderId,
      message: 'Pedido criado com sucesso.',
      subtotal,
      delivery_fee: deliveryFeeValue,
      total
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao criar pedido:', err);
    res.status(500).json({
      message: 'Erro ao criar pedido.'
    });
  } finally {
    client.release();
  }
}

export async function listOrders(req, res) {
  const result = await pool.query(`
    SELECT * FROM orders
    ORDER BY created_at DESC
  `);

  res.json(result.rows);
}

export async function getOrderById(req, res) {
  const { id } = req.params;

  const orderResult = await pool.query(`
    SELECT * FROM orders WHERE id = $1
  `, [id]);

  const order = orderResult.rows[0];

  if (!order) {
    return res.status(404).json({
      message: 'Pedido não encontrado.'
    });
  }

  const itemsResult = await pool.query(`
    SELECT * FROM order_items WHERE order_id = $1
  `, [id]);

  res.json({
    ...order,
    items: itemsResult.rows
  });
}

export async function updateOrderStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;

  const result = await pool.query(`
    UPDATE orders
    SET status = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
  `, [status, id]);

  if (result.rowCount === 0) {
    return res.status(404).json({
      message: 'Pedido não encontrado.'
    });
  }

  res.json({
    message: 'Status do pedido atualizado.'
  });
}
