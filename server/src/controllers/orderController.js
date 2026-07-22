import sgMail from '@sendgrid/mail';
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
import { adminNewOrderEmail, customerOrderConfirmationEmail } from '../utils/emailTemplates.js';
import { pool } from '../database/connection.js';
import { canTransition, isValidStatusForType } from '../config/orderStatusMachine.js';
import { selectBox } from '../config/boxes.js';
import { getAccessToken } from './melhorEnvioController.js';
import crypto from 'crypto';

function generatePickupCode() {
  return String(crypto.randomInt(100000, 999999));
}

const DEFAULT_WEIGHT_LIGHT = 0.1;
const DEFAULT_WEIGHT_HEAVY = 0.3;
const LIGHT_CATEGORIES = ['farinhas', 'castanhas', 'temperos'];

function getDefaultWeight(categorySlug) {
  if (categorySlug && LIGHT_CATEGORIES.includes(categorySlug.toLowerCase())) {
    return DEFAULT_WEIGHT_LIGHT;
  }
  return DEFAULT_WEIGHT_HEAVY;
}

const MELHOR_ENVIO_API = process.env.MELHOR_ENVIO_ENV === 'production'
  ? 'https://api.melhorenvio.com'
  : 'https://sandbox.melhorenvio.com.br';
const ORIGIN_CEP = (process.env.ORIGIN_CEP || '').replace(/\D/g, '');

async function recalculateShipping(items, destCep, client) {
  const dest = destCep.replace(/\D/g, '');
  if (dest.length !== 8 || !ORIGIN_CEP || ORIGIN_CEP.length !== 8) {
    return null;
  }

  const token = await getAccessToken();
  if (!token) return null;

  let totalWeight = 0;
  for (const item of items) {
    let unitWeight = 0;
    if (item.product_id) {
      const result = await client.query(`
        SELECT p.weight, c.slug as category_slug
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.id = $1
      `, [item.product_id]);
      if (result.rows[0]) {
        const stored = Number(result.rows[0].weight) || 0;
        unitWeight = stored > 0 ? stored : getDefaultWeight(result.rows[0].category_slug);
      }
    } else if (item.kit_id) {
      const kitItems = await client.query(`
        SELECT p.weight, c.slug as category_slug, ki.quantity
        FROM kit_items ki
        JOIN products p ON p.id = ki.product_id
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE ki.kit_id = $1
      `, [item.kit_id]);
      for (const ki of kitItems.rows) {
        const stored = Number(ki.weight) || 0;
        unitWeight += (stored > 0 ? stored : getDefaultWeight(ki.category_slug)) * (Number(ki.quantity) || 1);
      }
    }
    totalWeight += unitWeight * (item.quantity || 1);
  }

  const box = selectBox(Math.max(totalWeight, 0.1));

  try {
    const meResponse = await fetch(`${MELHOR_ENVIO_API}/api/v2/me/shipment/calculate`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'CasaSoPimenta (casasopimenta@gmail.com)'
      },
      body: JSON.stringify({
        from: { postal_code: ORIGIN_CEP },
        to: { postal_code: dest },
        package: {
          width: box.width,
          height: box.height,
          length: box.length,
          weight: Math.max(totalWeight, 0.1)
        },
        options: { receipt: false, own_hand: false },
        services: '1,2'
      })
    });

    if (!meResponse.ok) return null;

    const meData = await meResponse.json();
    let cheapest = null;

    for (const service of meData) {
      if (service.error) continue;
      const price = Number(service.price);
      if (!cheapest || price < cheapest.price) {
        cheapest = {
          service: service.id === 2 ? 'SEDEX' : 'PAC',
          price,
          delivery_time: Number(service.delivery_time) || 0
        };
      }
    }

    return cheapest ? cheapest.price : null;
  } catch (err) {
    console.error('Erro ao recalcular frete:', err.message);
    return null;
  }
}

const VALID_DELIVERY_TYPES = ['delivery', 'pickup', 'negotiate'];

export async function createOrder(req, res) {
  const {
    customer_name,
    customer_email,
    customer_phone,
    delivery_type,
    cep, address, number, neighborhood, complement,
    city, state,
    items,
    delivery_fee: _delivery_fee_raw,
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

  if (delivery_type && !VALID_DELIVERY_TYPES.includes(delivery_type)) {
    return res.status(400).json({
      message: 'Tipo de entrega inválido. Valores aceitos: delivery, pickup, negotiate.'
    });
  }

  const effectiveDeliveryType = delivery_type || 'delivery';

  if (effectiveDeliveryType === 'delivery' && !cep) {
    return res.status(400).json({
      message: 'CEP é obrigatório para entrega.'
    });
  }

  let subtotal = 0;
  const orderItems = [];

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (const item of items) {
      if (!item.product_id && !item.kit_id) {
        throw Object.assign(new Error('Cada item deve ter product_id ou kit_id.'), { status: 400 });
      }
      if (item.product_id && item.kit_id) {
        throw Object.assign(new Error('Item deve ter product_id ou kit_id, não ambos.'), { status: 400 });
      }

      if (item.product_id) {
        const productResult = await client.query(`
          SELECT * FROM products
          WHERE id = $1 AND is_active = 1
          FOR UPDATE
        `, [item.product_id]);

        const product = productResult.rows[0];

        if (!product) {
          throw Object.assign(new Error(`Produto ${item.product_id} não encontrado.`), { status: 400 });
        }

        if (!product.stock) {
          throw Object.assign(new Error(`O produto "${product.name}" está fora de estoque.`), { status: 400 });
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
        const kitResult = await client.query(`
          SELECT * FROM kits
          WHERE id = $1 AND is_active = 1
          FOR UPDATE
        `, [item.kit_id]);

        const kit = kitResult.rows[0];

        if (!kit) {
          throw Object.assign(new Error(`Kit ${item.kit_id} não encontrado.`), { status: 400 });
        }

        if (!kit.stock) {
          throw Object.assign(new Error(`O kit "${kit.name}" está fora de estoque.`), { status: 400 });
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

    let serverDeliveryFee = 0;
    if (effectiveDeliveryType === 'delivery') {
      const calculatedFee = await recalculateShipping(items, cep, client);
      if (calculatedFee === null) {
        throw Object.assign(new Error('Não foi possível calcular o frete. Tente novamente.'), { status: 400 });
      }
      serverDeliveryFee = calculatedFee;
    }
    const deliveryFeeValue = serverDeliveryFee;
    const boxAmountValue = 0;
    let total = subtotal + deliveryFeeValue;
    let couponData = null;
    let couponDiscount = 0;

    if (coupon_code) {
      const couponResult = await client.query('SELECT * FROM coupons WHERE code = $1 FOR UPDATE', [coupon_code.toUpperCase()]);
      const coupon = couponResult.rows[0];

      if (!coupon) {
        throw Object.assign(new Error('Cupom não encontrado.'), { status: 400, success: false });
      }

      if (!coupon.is_active) {
        throw Object.assign(new Error('Este cupom está inativo.'), { status: 400, success: false });
      }

      if (coupon.expires_at) {
        const expResult = await client.query('SELECT NOW() AS now_ts');
        const nowTs = expResult.rows[0].now_ts;
        if (new Date(coupon.expires_at) < nowTs) {
          throw Object.assign(new Error('Este cupom expirou.'), { status: 400, success: false });
        }
      }

      if (coupon.max_uses && coupon.times_used >= coupon.max_uses) {
        throw Object.assign(new Error('Este cupom atingiu o limite de usos.'), { status: 400, success: false });
      }

      if (coupon.min_order_amount && subtotal < Number(coupon.min_order_amount)) {
        throw Object.assign(
          new Error(`Pedido mínimo de ${Number(coupon.min_order_amount).toFixed(2).replace('.', ',')} para usar este cupom.`),
          { status: 400, success: false }
        );
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
      effectiveDeliveryType,
      effectiveDeliveryType === 'delivery' ? (cep || null) : null,
      effectiveDeliveryType === 'delivery' ? (address || null) : null,
      effectiveDeliveryType === 'delivery' ? (number || null) : null,
      effectiveDeliveryType === 'delivery' ? (neighborhood || null) : null,
      effectiveDeliveryType === 'delivery' ? (complement || null) : null,
      effectiveDeliveryType === 'delivery' ? (city || null) : null,
      effectiveDeliveryType === 'delivery' ? (state || null) : null,
      subtotal,
      deliveryFeeValue,
      total,
      total_weight || null,
      selected_box || null,
      shipping_service || null,
      shipping_amount || null,
      boxAmountValue || null,
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

    for (const orderItem of orderItems) {
      if (orderItem.product_id) {
        await client.query(
          'UPDATE products SET stock = false WHERE id = $1 AND stock = true',
          [orderItem.product_id]
        );
      }
      if (orderItem.kit_id) {
        await client.query(
          'UPDATE kits SET stock = false WHERE id = $1 AND stock = true',
          [orderItem.kit_id]
        );
      }
    }

    if (couponData) {
      await client.query(`
        UPDATE coupons SET times_used = times_used + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1
      `, [couponData.id]);
    }

    await client.query('COMMIT');

    const orderData = orderResult.rows[0];

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
    res.status(err.status || 500).json({
      success: err.success !== undefined ? err.success : undefined,
      message: err.message || 'Erro ao criar pedido.'
    });
  } finally {
    client.release();
  }
}

export async function listOrders(req, res) {
  try {
    const { delivery_type, status, limit, offset } = req.query;
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

    const limitVal = Math.min(Math.max(parseInt(limit) || 100, 1), 500);
    const offsetVal = Math.max(parseInt(offset) || 0, 0);

    params.push(limitVal);
    query += ` LIMIT $${params.length}`;
    params.push(offsetVal);
    query += ` OFFSET $${params.length}`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao listar pedidos:', err);
    res.status(500).json({ message: 'Erro ao listar pedidos.' });
  }
}

export async function getOrderById(req, res) {
  try {
    const { id } = req.params;

    const orderResult = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
    const order = orderResult.rows[0];

    if (!order) {
      return res.status(404).json({ message: 'Pedido não encontrado.' });
    }

    const itemsResult = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [id]);

    res.json({ ...order, items: itemsResult.rows });
  } catch (err) {
    console.error('Erro ao buscar pedido:', err);
    res.status(500).json({ message: 'Erro ao buscar pedido.' });
  }
}

export async function getMyOrders(req, res) {
  try {
    const userId = req.user.id;

    const ordersResult = await pool.query(`
      SELECT o.*,
        COALESCE(
          json_agg(
            CASE WHEN oi.id IS NOT NULL THEN
              json_build_object(
                'id', oi.id, 'order_id', oi.order_id, 'product_id', oi.product_id,
                'kit_id', oi.kit_id, 'item_name', oi.item_name, 'unit_price', oi.unit_price,
                'quantity', oi.quantity, 'total', oi.total
              )
            END
          ) FILTER (WHERE oi.id IS NOT NULL),
          '[]'
        ) as items
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE o.user_id = $1
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `, [userId]);

    const pickupCodes = {};
    for (const order of ordersResult.rows) {
      if (order.delivery_type === 'pickup' && order.pickup_code) {
        pickupCodes[order.id] = order.pickup_code;
      }
      delete order.pickup_code;
    }

    res.json({ orders: ordersResult.rows, pickupCodes });
  } catch (err) {
    console.error('Erro ao listar pedidos do usuário:', err);
    res.status(500).json({ message: 'Erro ao listar seus pedidos.' });
  }
}

export async function updateOrderStatus(req, res) {
  try {
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
  } catch (err) {
    console.error('Erro ao atualizar status do pedido:', err);
    res.status(500).json({ message: 'Erro ao atualizar status do pedido.' });
  }
}

export async function confirmPickup(req, res) {
  try {
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
  } catch (err) {
    console.error('Erro ao confirmar retirada:', err);
    res.status(500).json({ message: 'Erro ao confirmar retirada.' });
  }
}
