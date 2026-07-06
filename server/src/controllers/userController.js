import { pool } from '../database/connection.js';

export async function listUsers(req, res) {
  try {
    const { search, page, limit } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const offset = (pageNum - 1) * limitNum;

    let whereClause = ' WHERE u.role = $1';
    let params = ['customer'];
    let paramIndex = 2;

    if (search) {
      whereClause += ` AND (u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const countResult = await pool.query(`
      SELECT COUNT(*) AS total FROM users u${whereClause}
    `, params);

    const total = parseInt(countResult.rows[0].total);

    const result = await pool.query(`
      SELECT u.id, u.name, u.email, u.phone, u.cep, u.address, u.city, u.state,
             u.role, u.created_at, u.updated_at,
             COALESCE(o.order_count, 0) AS order_count,
             COALESCE(o.total_spent, 0) AS total_spent,
             o.last_order_date
      FROM users u
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*) AS order_count,
          COALESCE(SUM(total), 0) AS total_spent,
          MAX(created_at) AS last_order_date
        FROM orders
        WHERE user_id = u.id
      ) o ON true
      ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, limitNum, offset]);

    res.json({
      success: true,
      users: result.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    console.error('Erro ao listar usuários:', err);
    res.status(500).json({ success: false, message: 'Erro ao listar usuários.' });
  }
}

export async function getUserById(req, res) {
  try {
    const { id } = req.params;

    const userResult = await pool.query(`
      SELECT id, name, email, phone, cep, address, city, state,
             role, created_at, updated_at
      FROM users WHERE id = $1
    `, [id]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    }

    const ordersResult = await pool.query(`
      SELECT id, total, status, payment_method, delivery_type, created_at
      FROM orders WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 50
    `, [id]);

    res.json({
      success: true,
      user: userResult.rows[0],
      orders: ordersResult.rows
    });
  } catch (err) {
    console.error('Erro ao buscar usuário:', err);
    res.status(500).json({ success: false, message: 'Erro ao buscar usuário.' });
  }
}

export async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const { name, email, phone, cep, address, city, state } = req.body;

    const result = await pool.query(`
      UPDATE users
      SET name = COALESCE($1, name),
          email = COALESCE($2, email),
          phone = COALESCE($3, phone),
          cep = COALESCE($4, cep),
          address = COALESCE($5, address),
          city = COALESCE($6, city),
          state = COALESCE($7, state),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING id, name, email, phone, cep, address, city, state, role, created_at, updated_at
    `, [name || null, email || null, phone || null, cep || null, address || null, city || null, state || null, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    }

    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error('Erro ao atualizar usuário:', err);
    res.status(500).json({ success: false, message: 'Erro ao atualizar usuário.' });
  }
}

export async function deleteUser(req, res) {
  try {
    const { id } = req.params;

    const orderCheck = await pool.query('SELECT COUNT(*) AS count FROM orders WHERE user_id = $1', [id]);
    if (parseInt(orderCheck.rows[0].count) > 0) {
      await pool.query('UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', ['disabled', id]);
      return res.json({ success: true, message: 'Usuário possui pedidos. Foi desativado.' });
    }

    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ success: true, message: 'Usuário excluído.' });
  } catch (err) {
    console.error('Erro ao excluir usuário:', err);
    res.status(500).json({ success: false, message: 'Erro ao excluir usuário.' });
  }
}
