import { db } from '../database/connection.js';

export function createOrder(req, res) {
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
      product = db.prepare(`
        SELECT *
        FROM products
        WHERE id = ? AND is_active = 1
      `).get(item.product_id);

      if (!product) {
        return res.status(400).json({
          message: `Produto ${item.product_id} não encontrado.`
        });
      }

      const total = product.price * item.quantity;
      subtotal += total;

      orderItems.push({
        product_id: product.id,
        kit_id: null,
        item_name: product.name,
        unit_price: product.price,
        quantity: item.quantity,
        total
      });
    }

    if (item.kit_id) {
      kit = db.prepare(`
        SELECT *
        FROM kits
        WHERE id = ? AND is_active = 1
      `).get(item.kit_id);

      if (!kit) {
        return res.status(400).json({
          message: `Kit ${item.kit_id} não encontrado.`
        });
      }

      const total = kit.price * item.quantity;
      subtotal += total;

      orderItems.push({
        product_id: null,
        kit_id: kit.id,
        item_name: kit.name,
        unit_price: kit.price,
        quantity: item.quantity,
        total
      });
    }
  }

  const deliveryFeeValue = Number(delivery_fee || 0);
  const total = subtotal + deliveryFeeValue;

  const transaction = db.transaction(() => {
    const orderResult = db.prepare(`
      INSERT INTO orders (
        user_id,
        customer_name,
        customer_email,
        customer_phone,
        cep,
        address,
        city,
        state,
        subtotal,
        delivery_fee,
        total,
        notes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
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
    );

    const orderId = orderResult.lastInsertRowid;

    const insertItem = db.prepare(`
      INSERT INTO order_items (
        order_id,
        product_id,
        kit_id,
        item_name,
        unit_price,
        quantity,
        total
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const orderItem of orderItems) {
      insertItem.run(
        orderId,
        orderItem.product_id,
        orderItem.kit_id,
        orderItem.item_name,
        orderItem.unit_price,
        orderItem.quantity,
        orderItem.total
      );
    }

    return orderId;
  });

  const orderId = transaction();

  res.status(201).json({
    id: orderId,
    message: 'Pedido criado com sucesso.',
    subtotal,
    delivery_fee: deliveryFeeValue,
    total
  });
}

export function listOrders(req, res) {
  const orders = db.prepare(`
    SELECT *
    FROM orders
    ORDER BY created_at DESC
  `).all();

  res.json(orders);
}

export function getOrderById(req, res) {
  const { id } = req.params;

  const order = db.prepare(`
    SELECT *
    FROM orders
    WHERE id = ?
  `).get(id);

  if (!order) {
    return res.status(404).json({
      message: 'Pedido não encontrado.'
    });
  }

  const items = db.prepare(`
    SELECT *
    FROM order_items
    WHERE order_id = ?
  `).all(id);

  res.json({
    ...order,
    items
  });
}

export function updateOrderStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;

  const update = db.prepare(`
    UPDATE orders
    SET status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  const result = update.run(status, id);

  if (result.changes === 0) {
    return res.status(404).json({
      message: 'Pedido não encontrado.'
    });
  }

  res.json({
    message: 'Status do pedido atualizado.'
  });
}