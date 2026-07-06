import { pool } from '../database/connection.js';

export async function listCoupons(req, res) {
  try {
    const result = await pool.query('SELECT * FROM coupons ORDER BY created_at DESC');
    res.json({ success: true, coupons: result.rows });
  } catch (err) {
    console.error('Erro ao listar cupons:', err);
    res.status(500).json({ success: false, message: 'Erro ao listar cupons.' });
  }
}

export async function getCouponById(req, res) {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM coupons WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Cupom não encontrado.' });
    }
    res.json({ success: true, coupon: result.rows[0] });
  } catch (err) {
    console.error('Erro ao buscar cupom:', err);
    res.status(500).json({ success: false, message: 'Erro ao buscar cupom.' });
  }
}

export async function createCoupon(req, res) {
  try {
    const { code, discount_type, discount_value, min_order_amount, max_uses, expires_at, is_active } = req.body;

    if (!code || !discount_type || discount_value === undefined || discount_value === null) {
      return res.status(400).json({ success: false, message: 'Código, tipo e valor do desconto são obrigatórios.' });
    }

    if (!['fixed', 'percentage'].includes(discount_type)) {
      return res.status(400).json({ success: false, message: 'Tipo de desconto deve ser "fixed" ou "percentage".' });
    }

    if (Number(discount_value) <= 0) {
      return res.status(400).json({ success: false, message: 'Valor do desconto deve ser maior que zero.' });
    }

    if (discount_type === 'percentage' && Number(discount_value) > 100) {
      return res.status(400).json({ success: false, message: 'Desconto percentual não pode ser maior que 100%.' });
    }

    const existing = await pool.query('SELECT id FROM coupons WHERE code = $1', [code.toUpperCase()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Já existe um cupom com este código.' });
    }

    const result = await pool.query(`
      INSERT INTO coupons (code, discount_type, discount_value, min_order_amount, max_uses, expires_at, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      code.toUpperCase(),
      discount_type,
      discount_value,
      min_order_amount || null,
      max_uses || null,
      expires_at || null,
      is_active !== undefined ? (is_active ? 1 : 0) : 1
    ]);

    res.status(201).json({ success: true, coupon: result.rows[0] });
  } catch (err) {
    console.error('Erro ao criar cupom:', err);
    res.status(500).json({ success: false, message: 'Erro ao criar cupom.' });
  }
}

export async function updateCoupon(req, res) {
  try {
    const { id } = req.params;
    const { code, discount_type, discount_value, min_order_amount, max_uses, expires_at, is_active } = req.body;

    const existing = await pool.query('SELECT * FROM coupons WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Cupom não encontrado.' });
    }

    if (code) {
      const duplicate = await pool.query('SELECT id FROM coupons WHERE code = $1 AND id != $2', [code.toUpperCase(), id]);
      if (duplicate.rows.length > 0) {
        return res.status(409).json({ success: false, message: 'Já existe outro cupom com este código.' });
      }
    }

    if (discount_type && !['fixed', 'percentage'].includes(discount_type)) {
      return res.status(400).json({ success: false, message: 'Tipo de desconto deve ser "fixed" ou "percentage".' });
    }

    const result = await pool.query(`
      UPDATE coupons
      SET code = COALESCE($1, code),
          discount_type = COALESCE($2, discount_type),
          discount_value = COALESCE($3, discount_value),
          min_order_amount = $4,
          max_uses = $5,
          expires_at = $6,
          is_active = $7,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `, [
      code ? code.toUpperCase() : null,
      discount_type || null,
      discount_value !== undefined ? discount_value : null,
      min_order_amount !== undefined ? min_order_amount : null,
      max_uses !== undefined ? max_uses : null,
      expires_at !== undefined ? expires_at : null,
      is_active !== undefined ? (is_active ? 1 : 0) : null,
      id
    ]);

    res.json({ success: true, coupon: result.rows[0] });
  } catch (err) {
    console.error('Erro ao atualizar cupom:', err);
    res.status(500).json({ success: false, message: 'Erro ao atualizar cupom.' });
  }
}

export async function deleteCoupon(req, res) {
  try {
    const { id } = req.params;
    const existing = await pool.query('SELECT * FROM coupons WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Cupom não encontrado.' });
    }

    await pool.query('DELETE FROM coupons WHERE id = $1', [id]);
    res.json({ success: true, message: 'Cupom excluído.' });
  } catch (err) {
    console.error('Erro ao excluir cupom:', err);
    res.status(500).json({ success: false, message: 'Erro ao excluir cupom.' });
  }
}

export async function validateCoupon(req, res) {
  try {
    const { code, subtotal } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: 'Código do cupom é obrigatório.' });
    }

    const result = await pool.query('SELECT * FROM coupons WHERE code = $1', [code.toUpperCase()]);
    const coupon = result.rows[0];

    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Cupom não encontrado.' });
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

    if (coupon.min_order_amount && subtotal !== undefined && Number(subtotal) < Number(coupon.min_order_amount)) {
      return res.status(400).json({
        success: false,
        message: `Pedido mínimo de ${Number(coupon.min_order_amount).toFixed(2).replace('.', ',')} para usar este cupom.`
      });
    }

    let discountValue = 0;
    if (coupon.discount_type === 'fixed') {
      discountValue = Number(coupon.discount_value);
      if (subtotal !== undefined && discountValue > Number(subtotal)) {
        discountValue = Number(subtotal);
      }
    } else if (coupon.discount_type === 'percentage') {
      discountValue = (Number(coupon.discount_value) / 100) * (subtotal !== undefined ? Number(subtotal) : 0);
    }

    res.json({
      success: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: Number(coupon.discount_value),
        discount_calculated: Math.round(discountValue * 100) / 100,
        min_order_amount: coupon.min_order_amount ? Number(coupon.min_order_amount) : null
      }
    });
  } catch (err) {
    console.error('Erro ao validar cupom:', err);
    res.status(500).json({ success: false, message: 'Erro ao validar cupom.' });
  }
}
