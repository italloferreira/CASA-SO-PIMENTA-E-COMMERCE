import sgMail from '@sendgrid/mail';
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
import { adminNewOrderEmail, customerOrderConfirmationEmail } from '../utils/emailTemplates.js';
import { pool } from '../database/connection.js';
import { canTransition, isValidStatusForType } from '../config/orderStatusMachine.js';
import crypto from 'crypto';

function generatePickupCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function createOrder(req, res) {
  const {
    customer_name,
    customer_email,
    customer_phone,
    delivery_type,
    cep, address, number, neighborhood, complement,
    city, state,
    items,
    delivery_fee,
    box_amount,
    shipping_service,
    shipping_amount,
    total_weight,
    selected_box,
    notes,
    payment_method,
    coupon_code
  } = req.body;

  if (!customer_name || !customer_phone || !items || items.length === 0) {
    return res.status(400).json({
      message: 'Dados do cliente e itens são obrigatórios.'
    });
  }

  if (delivery_type === 'delivery' && !cep) {
    return res.status(400).json({
      message: 'CEP é obrigatório para entrega.'
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

      const salePrice = product.compare_price ? Number(product.compare_price) : Number(product.price);
      const total = salePrice * item.quantity;
      subtotal += total;

      orderItems.push({
        product_id: product.id,
        kit_id: null,
        item_name: product.name,
        unit_price: salePrice,
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
  let total = subtotal + deliveryFeeValue;
  let couponData = null;
  let couponDiscount = 0;

  if (coupon_code) {
    const couponResult = await pool.query('SELECT * FROM coupons WHERE code = $1', [coupon_code.toUpperCase()]);
    const coupon = couponResult.rows[0];

    if (!coupon) {
      return res.status(400).json({ success: false, message: 'Cupom não encontrado.' });
    }

    if (!coupon.is_active) {
      return res.status(400).json({ success: false, message: 'Este cupom está inativo.' });
    }

    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return res.status(400).json({ success: false, message: 'Este cupom expirou.' });
    }

    if (coupon.max_uses && coupon.times_used >= coupon.max_uses) {
      return res.status(400).json({ success: false, message: 'Este cupom atingiu o limite de usos.' });
    }

    if (coupon.min_order_amount && subtotal < Number(coupon.min_order_amount)) {
      return res.status(400).json({
        success: false,
        message: `Pedido mínimo de ${Number(coupon.min_order_amount).toFixed(2).replace('.', ',')} para usar este cupom.`
      });
    }

    if (coupon.discount_type === 'fixed') {
      couponDiscount = Number(coupon.discount_value);
      if (couponDiscount > subtotal) couponDiscount = subtotal;
    } else if (coupon.discount_type === 'percentage') {
      couponDiscount = (Number(coupon.discount_value) / 100) * subtotal;
    }

    couponDiscount = Math.round(couponDiscount * 100) / 100;
    total = total - couponDiscount;
    if (total < 0) total = 0;

    couponData = { id: coupon.id, code: coupon.code, discount: couponDiscount };
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const orderResult = await client.query(`
      INSERT INTO orders (
        user_id, customer_name, customer_email, customer_phone,
        delivery_type, cep, address, number, neighborhood, complement,
        city, state,
        subtotal, delivery_fee, total,
        total_weight, selected_box, shipping_service,
        shipping_amount, box_amount,
        notes, payment_method,
        coupon_id, coupon_code, coupon_discount
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
              $11, $12, $13, $14, $15,
              $16, $17, $18, $19, $20, $21, $22,
              $23, $24, $25)
      RETURNING id, total, subtotal, delivery_fee, status,
                payment_method, delivery_type, created_at,
                coupon_code, coupon_discount
    `, [
      req.user?.id || null,
      customer_name,
      customer_email || null,
      customer_phone,
      delivery_type || 'delivery',
      delivery_type === 'delivery' ? (cep || null) : null,
      delivery_type === 'delivery' ? (address || null) : null,
      delivery_type === 'delivery' ? (number || null) : null,
      delivery_type === 'delivery' ? (neighborhood || null) : null,
      delivery_type === 'delivery' ? (complement || null) : null,
      delivery_type === 'delivery' ? (city || null) : null,
      delivery_type === 'delivery' ? (state || null) : null,
      subtotal,
      deliveryFeeValue,
      total,
      total_weight || null,
      selected_box || null,
      shipping_service || null,
      shipping_amount || null,
      box_amount || null,
      notes || null,
      payment_method || 'pix',
      couponData ? couponData.id : null,
      couponData ? couponData.code : null,
      couponData ? couponData.discount : 0
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

    if (couponData) {
      await client.query(`
        UPDATE coupons SET times_used = times_used + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1
      `, [couponData.id]);
    }

    await client.query('COMMIT');

    const orderData = orderResult.rows[0];

    /* ── Notificações por email ── */
    try {
      const adminEmailResult = await pool.query(`SELECT value FROM settings WHERE key = 'contact_email'`);
      const adminEmail = adminEmailResult.rows[0]?.value || process.env.SENDGRID_FROM?.match(/<(.+)>/)?.[1];

      const orderForEmail = {
        id: orderData.id,
        customer_name,
        customer_email: customer_email || '',
        customer_phone,
        address, number, neighborhood, city, state, cep,
        delivery_type: orderData.delivery_type,
        payment_method: orderData.payment_method || 'pix',
        items: orderItems,
        subtotal: Number(orderData.subtotal),
        delivery_fee: Number(orderData.delivery_fee),
        total: Number(orderData.total),
        coupon_code: orderData.coupon_code,
        coupon_discount: orderData.coupon_discount ? Number(orderData.coupon_discount) : 0
      };

      const fromAddr = process.env.SENDGRID_FROM || '"Casa Só Pimenta" <casasopimenta@gmail.com>';

      if (adminEmail) {
        await sgMail.send({
          to: adminEmail,
          from: fromAddr,
          subject: 'Novo pedido #' + orderData.id + ' — Casa Só Pimenta',
          html: adminNewOrderEmail(orderForEmail)
        });
      }

      if (customer_email) {
        await sgMail.send({
          to: customer_email,
          from: fromAddr,
          subject: 'Pedido #' + orderData.id + ' confirmado! — Casa Só Pimenta',
          html: customerOrderConfirmationEmail(orderForEmail)
        });
      }
    } catch (emailErr) {
      console.error('Erro ao enviar email de notificação:', emailErr.message);
    }

    res.status(201).json({
      success: true,
      order: {
        id: orderData.id,
        total: Number(orderData.total),
        subtotal: Number(orderData.subtotal),
        delivery_fee: Number(orderData.delivery_fee),
        status: orderData.status,
        payment_method: orderData.payment_method,
        delivery_type: orderData.delivery_type,
        created_at: orderData.created_at,
        customer_name,
        customer_email,
        customer_phone,
        cep,
        address,
        city,
        state,
        coupon_code: orderData.coupon_code,
        coupon_discount: orderData.coupon_discount ? Number(orderData.coupon_discount) : 0
      }
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
  const { delivery_type, status } = req.query;
  let query = 'SELECT * FROM orders';
  const params = [];
  const conditions = [];

  if (delivery_type) {
    params.push(delivery_type);
    conditions.push(`delivery_type = $${params.length}`);
  }

  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY created_at DESC';

  const result = await pool.query(query, params);
  res.json(result.rows);
}

export async function getOrderById(req, res) {
  const { id } = req.params;

  const orderResult = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
  const order = orderResult.rows[0];

  if (!order) {
    return res.status(404).json({ message: 'Pedido não encontrado.' });
  }

  const itemsResult = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [id]);

  res.json({ ...order, items: itemsResult.rows });
}

export async function getMyOrders(req, res) {
  const userId = req.user.id;

  const orderResult = await pool.query(`
    SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC
  `, [userId]);

  const orders = [];

  for (const row of orderResult.rows) {
    const itemsResult = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [row.id]);
    orders.push({ ...row, items: itemsResult.rows });
  }

  const pickupCodes = {};
  for (const order of orders) {
    if (order.delivery_type === 'pickup' && order.pickup_code) {
      pickupCodes[order.id] = order.pickup_code;
    }
    delete order.pickup_code;
  }

  res.json({ orders, pickupCodes });
}

export async function updateOrderStatus(req, res) {
  const { id } = req.params;
  const { status: newStatus } = req.body;

  const orderResult = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
  const order = orderResult.rows[0];

  if (!order) {
    return res.status(404).json({ message: 'Pedido não encontrado.' });
  }

  const currentStatus = order.status;
  const deliveryType = order.delivery_type;

  if (!canTransition(currentStatus, newStatus, deliveryType)) {
    return res.status(400).json({
      message: `Transição de "${currentStatus}" para "${newStatus}" não é permitida para ${deliveryType === 'pickup' ? 'retirada' : 'entrega'}.`
    });
  }

  if (newStatus === 'withdrawn') {
    return res.status(400).json({
      message: 'Confirmação de retirada deve ser feita com validação do código de retirada.'
    });
  }

  if (deliveryType === 'pickup' && newStatus === 'ready_for_pickup') {
    const pickupCode = generatePickupCode();

    await pool.query(`
      UPDATE orders
      SET status = $1, pickup_code = $2, pickup_code_generated_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [newStatus, pickupCode, id]);

    console.log(`Pedido #${id} pronto para retirada. Código: ${pickupCode}`);

    return res.json({
      message: 'Pedido marcado como pronto para retirada.',
      pickup_code: pickupCode
    });
  }

  await pool.query(`
    UPDATE orders
    SET status = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
  `, [newStatus, id]);

  res.json({ message: 'Status do pedido atualizado.' });
}

export async function confirmPickup(req, res) {
  const { id } = req.params;
  const { pickup_code } = req.body;

  if (!pickup_code) {
    return res.status(400).json({ message: 'Código de retirada é obrigatório.' });
  }

  const orderResult = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
  const order = orderResult.rows[0];

  if (!order) {
    return res.status(404).json({ message: 'Pedido não encontrado.' });
  }

  if (order.delivery_type !== 'pickup') {
    return res.status(400).json({ message: 'Este pedido não é do tipo retirada.' });
  }

  if (order.status !== 'ready_for_pickup') {
    return res.status(400).json({
      message: `Pedido está "${order.status}". Só é possível retirar pedidos "pronto para retirada".`
    });
  }

  if (!order.pickup_code) {
    return res.status(400).json({ message: 'Este pedido não possui código de retirada.' });
  }

  if (order.pickup_code !== pickup_code) {
    console.log(`Tentativa de retirada inválida para pedido #${id}: código incorreto.`);
    return res.status(400).json({ message: 'Código de retirada inválido.' });
  }

  await pool.query(`
    UPDATE orders
    SET status = 'withdrawn', pickup_code = NULL,
        pickup_code_generated_at = NULL,
        withdrawn_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
  `, [id]);

  console.log(`Pedido #${id} retirado com sucesso pelo admin.`);

  res.json({ message: 'Retirada confirmada com sucesso.' });
}
