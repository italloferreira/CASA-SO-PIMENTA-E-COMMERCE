import { protectRoute, showToast } from './admin-auth.js';
import { apiRequest } from '../../../../assets/js/api.js';

protectRoute();

const METRICS = [
  { key: 'produtos', icon: '▦', label: 'Produtos cadastrados', color: 'var(--color-primary)', link: '/site/pages/admin/produtos/index.html' },
  { key: 'estoqueBaixo', icon: '⚠', label: 'Produtos sem estoque', color: 'var(--color-warning)', link: '/site/pages/admin/produtos/index.html' },
  { key: 'pedidosPendentes', icon: '≡', label: 'Aguardando confirmação', color: 'var(--color-danger)', link: '/site/pages/admin/pedidos/index.html' },
  { key: 'pedidosHoje', icon: '◷', label: 'Pedidos do dia', color: 'var(--color-info)', link: '/site/pages/admin/pedidos/index.html' },
  { key: 'faturamento', icon: 'R$', label: 'Receita do mês', color: 'var(--color-success)', link: '/site/pages/admin/pedidos/index.html' },
  { key: 'kits', icon: '❏', label: 'Kits ativos', color: 'var(--color-primary)', link: '/site/pages/admin/kits/index.html' },
  { key: 'banners', icon: '◫', label: 'Banners no ar', color: 'var(--color-info)', link: '/site/pages/admin/banners/index.html' },
  { key: 'clientes', icon: '◎', label: 'Clientes cadastrados', color: 'var(--color-text-secondary)', link: '/site/pages/admin/clientes/index.html' }
];

function renderMetricCards(data) {
  const container = document.getElementById('metricCards');
  if (!container) return;

  container.innerHTML = '';
  METRICS.forEach(function (m) {
    const raw = data[m.key];
    const val = m.key === 'faturamento'
      ? 'R$ ' + Number(raw).toFixed(2).replace('.', ',')
      : raw !== undefined ? raw : (m.value || 0);
    const card = document.createElement('a');
    card.href = m.link;
    card.className = 'metric-card';
    card.style.display = 'block';
    card.style.textDecoration = 'none';
    card.innerHTML =
      '<div class="metric-border" style="background:' + m.color + '"></div>' +
      '<span class="metric-icon">' + m.icon + '</span>' +
      '<div class="metric-value">' + val + '</div>' +
      '<div class="metric-label">' + m.label + '</div>';
    container.appendChild(card);
  });
}

function renderRecentOrders(orders) {
  const container = document.getElementById('recentOrders');
  if (!container) return;

  if (orders.length === 0) {
    container.innerHTML = '<div class="table-container"><div class="empty-state"><span class="empty-icon">≡</span><p>Nenhum pedido ainda.</p></div></div>';
    return;
  }

  const statusMap = { pending: 'Pendente', confirmed: 'Confirmado', shipped: 'Enviado', delivered: 'Entregue', cancelled: 'Cancelado' };
  const badgeClass = { pending: 'badge-warning', confirmed: 'badge-info', shipped: 'badge-info', delivered: 'badge-success', cancelled: 'badge-danger' };

  let html = '<table class="admin-table"><thead><tr><th>#ID</th><th>Cliente</th><th>Total</th><th>Status</th><th>Data</th><th class="col-hide-tablet">Ações</th></tr></thead><tbody>';
  orders.forEach(function (o) {
    const total = Number(o.total).toFixed(2).replace('.', ',');
    const data = new Date(o.created_at).toLocaleDateString('pt-BR');
    html += '<tr>' +
      '<td data-label="#ID">' + o.id + '</td>' +
      '<td data-label="Cliente">' + o.customer_name + '</td>' +
      '<td data-label="Total">R$ ' + total + '</td>' +
      '<td data-label="Status"><span class="badge ' + (badgeClass[o.status] || 'badge-neutral') + '">' + (statusMap[o.status] || o.status) + '</span></td>' +
      '<td data-label="Data">' + data + '</td>' +
      '<td data-label="Ações"><a href="/site/pages/admin/pedidos/index.html?id=' + o.id + '" class="btn btn-sm btn-secondary">Ver</a></td>' +
      '</tr>';
  });
  html += '</tbody></table>';
  container.innerHTML = html;
}

function renderLowStock(products) {
  const container = document.getElementById('lowStockTable');
  if (!container) return;

  if (products.length === 0) {
    container.innerHTML = '<div class="table-container"><p style="padding:20px;text-align:center;color:var(--color-text-muted);">Nenhum produto sem estoque.</p></div>';
    return;
  }

  let html = '<table class="admin-table"><thead><tr><th>Nome</th><th>Estoque</th><th>Ações</th></tr></thead><tbody>';
  products.forEach(function (p) {
    html += '<tr>' +
      '<td data-label="Nome">' + p.name + '</td>' +
      '<td data-label="Estoque"><span class="badge badge-danger">Sem estoque</span></td>' +
      '<td data-label="Ações"><a href="/site/pages/admin/produtos/index.html" class="btn btn-sm btn-secondary">Editar</a></td>' +
      '</tr>';
  });
  html += '</tbody></table>';
  container.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', async function () {
  try {
    const res = await apiRequest('GET', '/api/dashboard');
    if (!res.success) throw new Error(res.message);

    renderMetricCards(res.data);
    renderRecentOrders(res.data.pedidosRecentes);
    renderLowStock(res.data.estoqueCritico);
  } catch (err) {
    document.getElementById('metricCards').innerHTML = '<div class="error-banner">Não foi possível conectar ao servidor. Verifique se o backend está rodando na porta 3333.</div>';
  }
});
