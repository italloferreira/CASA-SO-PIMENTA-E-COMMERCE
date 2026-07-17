import { pool } from '../database/connection.js';

export async function getDashboard(req, res) {
  try {
    const results = await Promise.all([
      pool.query(`SELECT COUNT(*) AS total FROM products`),
      pool.query(`SELECT COUNT(*) AS total FROM products WHERE stock = false`),
      pool.query(`SELECT COUNT(*) AS total FROM orders WHERE status = 'pending'`),
      pool.query(`SELECT COUNT(*) AS total FROM orders WHERE (created_at AT TIME ZONE 'America/Sao_Paulo')::date = CURRENT_DATE`),
      pool.query(`SELECT COALESCE(SUM(total), 0) AS total FROM orders WHERE created_at >= date_trunc('month', NOW()) AND status NOT IN ('cancelled')`),
      pool.query(`SELECT COUNT(*) AS total FROM kits WHERE is_active = 1`),
      pool.query(`SELECT COUNT(*) AS total FROM banners WHERE is_active = 1`),
      pool.query(`SELECT COUNT(*) AS total FROM users WHERE role = 'customer'`),
      pool.query(`
        SELECT id, customer_name, total, status, created_at
        FROM orders
        ORDER BY created_at DESC
        LIMIT 5
      `),
      pool.query(`
        SELECT id, name, stock, category_id FROM products
        WHERE stock = false
        LIMIT 20
      `)
    ]);

    const [
      produtos,
      semEstoque,
      pedidosPendentes,
      pedidosHoje,
      faturamentoMes,
      kits,
      banners,
      clientes,
      recentOrders,
      outOfStock
    ] = results;

    res.json({
      success: true,
      data: {
        produtos: parseInt(produtos.rows[0].total),
        estoqueBaixo: parseInt(semEstoque.rows[0].total),
        pedidosPendentes: parseInt(pedidosPendentes.rows[0].total),
        pedidosHoje: parseInt(pedidosHoje.rows[0].total),
        faturamento: parseFloat(faturamentoMes.rows[0].total),
        kits: parseInt(kits.rows[0].total),
        banners: parseInt(banners.rows[0].total),
        clientes: parseInt(clientes.rows[0].total),
        pedidosRecentes: recentOrders.rows,
        estoqueCritico: outOfStock.rows
      }
    });
  } catch (err) {
    console.error('Erro ao carregar dashboard:', err);
    res.status(500).json({ success: false, message: 'Erro ao carregar dashboard.' });
  }
}
