import { protectRoute, showToast } from './admin-auth.js';
import { API_BASE, apiRequest } from '../../../../assets/js/api.js';

protectRoute();

let allOrders = [];
let currentPage = 1;
const PER_PAGE = 10;

const STATUS_MAP = {
  pending: 'Pendente', confirmed: 'Confirmado', shipped: 'Enviado',
  delivered: 'Entregue', cancelled: 'Cancelado'
};
const BADGE_CLASS = {
  pending: 'badge-warning', confirmed: 'badge-info', shipped: 'badge-info',
  delivered: 'badge-success', cancelled: 'badge-danger'
};

/* --- Load --- */
async function loadOrders() {
  var container = document.getElementById('tableContainer');
  container.innerHTML = '<div class="skeleton skeleton-table"></div>';
  try {
    allOrders = await apiRequest('GET', '/api/orders');
    renderOrders();
  } catch (e) {
    container.innerHTML = '<div class="error-banner">Erro ao carregar pedidos.</div>';
  }
}

/* --- Render --- */
function renderOrders() {
  var container = document.getElementById('tableContainer');
  var search = (document.getElementById('searchInput').value || '').toLowerCase().trim();
  var dateStart = document.getElementById('filterDateStart').value;
  var dateEnd = document.getElementById('filterDateEnd').value;
  var statusFilter = document.getElementById('filterStatus').value;

  var filtered = allOrders.filter(function (o) {
    if (search && !String(o.id).includes(search) && (!o.customer_name || !o.customer_name.toLowerCase().includes(search))) return false;
    if (dateStart && new Date(o.created_at) < new Date(dateStart + 'T00:00:00')) return false;
    if (dateEnd) {
      var endDate = new Date(dateEnd + 'T23:59:59');
      if (new Date(o.created_at) > endDate) return false;
    }
    if (statusFilter && o.status !== statusFilter) return false;
    return true;
  });

  var start = (currentPage - 1) * PER_PAGE;
  var end = start + PER_PAGE;
  var pageItems = filtered.slice(start, end);
  var totalPages = Math.ceil(filtered.length / PER_PAGE) || 1;

  if (pageItems.length === 0) {
    container.innerHTML = '<div class="empty-state"><span class="empty-icon">≡</span><p>Nenhum pedido encontrado.</p></div>';
    return;
  }

  var rows = pageItems.map(function (o) {
    var total = Number(o.total).toFixed(2).replace('.', ',');
    var data = new Date(o.created_at).toLocaleDateString('pt-BR');
    var whatsappLink = o.whatsapp ? 'https://wa.me/55' + o.whatsapp.replace(/\D/g, '') : '';

    return '<tr>' +
      '<td data-label="#ID"><strong>#' + o.id + '</strong></td>' +
      '<td data-label="Cliente">' + o.customer_name + '<br><small style="color:var(--color-text-muted)">' + o.customer_email + '</small></td>' +
      '<td data-label="Total">R$ ' + total + '</td>' +
      '<td data-label="Status">' +
        '<select class="form-input order-status-select" data-order-id="' + o.id + '" style="padding:4px 8px;font-size:12px;width:auto;">' +
          Object.keys(STATUS_MAP).map(function (s) {
            return '<option value="' + s + '" ' + (o.status === s ? 'selected' : '') + '>' + STATUS_MAP[s] + '</option>';
          }).join('') +
        '</select>' +
      '</td>' +
      '<td data-label="Data">' + data + '</td>' +
      '<td data-label="Ações">' +
        '<button class="btn btn-sm btn-secondary" onclick="window.openDetail(' + o.id + ')">Ver</button> ' +
        (whatsappLink ? '<a href="' + whatsappLink + '" target="_blank" class="btn btn-sm btn-secondary" style="background:#25D366;color:#fff;">📱</a>' : '') +
      '</td>' +
      '</tr>';
  }).join('');

  container.innerHTML =
    '<table class="admin-table"><thead><tr>' +
    '<th>#ID</th><th>Cliente</th><th>Total</th><th>Status</th><th>Data</th><th>Ações</th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table>' +
    '<div class="pagination">' +
    '<button class="btn btn-sm btn-secondary" id="prevPage" ' + (currentPage <= 1 ? 'disabled' : '') + '>← Anterior</button> ' +
    '<span class="pagination-info">' + currentPage + ' de ' + totalPages + '</span> ' +
    '<button class="btn btn-sm btn-secondary" id="nextPage" ' + (currentPage >= totalPages ? 'disabled' : '') + '>Próxima →</button>' +
    '</div>';

  document.getElementById('prevPage').addEventListener('click', function () { if (currentPage > 1) { currentPage--; renderOrders(); } });
  document.getElementById('nextPage').addEventListener('click', function () { if (currentPage < totalPages) { currentPage++; renderOrders(); } });

  /* Inline status change */
  container.querySelectorAll('.order-status-select').forEach(function (sel) {
    sel.addEventListener('change', async function () {
      var orderId = Number(this.dataset.orderId);
      var newStatus = this.value;
      try {
        await apiRequest('PATCH', '/api/orders/' + orderId, { status: newStatus });
        showToast('Status do pedido #' + orderId + ' atualizado para ' + STATUS_MAP[newStatus] + '!');
        var order = allOrders.find(function (o) { return o.id === orderId; });
        if (order) order.status = newStatus;
      } catch (err) {
        showToast('Erro ao atualizar status.', 'error');
        this.value = allOrders.find(function (o) { return o.id === orderId; })?.status || 'pending';
      }
    });
  });
}

/* --- Detail drawer --- */
window.openDetail = function (orderId) {
  var o = allOrders.find(function (o) { return o.id === orderId; });
  if (!o) { showToast('Pedido não encontrado.', 'error'); return; }

  document.getElementById('drawerOverlay').classList.add('active');
  document.getElementById('drawer').classList.add('active');
  document.getElementById('drawerTitle').textContent = 'Pedido #' + o.id;

  var total = Number(o.total).toFixed(2).replace('.', ',');
  var data = new Date(o.created_at).toLocaleString('pt-BR');
  var whatsappLink = o.whatsapp ? 'https://wa.me/55' + o.whatsapp.replace(/\D/g, '') : '';

  var itemsHtml = '';
  if (o.items && o.items.length > 0) {
    itemsHtml = '<div style="margin-top:16px;"><h4 style="margin-bottom:8px;">Itens</h4>';
    o.items.forEach(function (item) {
      var itemPrice = Number(item.price).toFixed(2).replace('.', ',');
      itemsHtml += '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--color-border);font-size:var(--font-size-sm);">' +
        '<span>' + item.product_name + ' x' + item.quantity + '</span>' +
        '<span>R$ ' + itemPrice + '</span>' +
        '</div>';
    });
    itemsHtml += '</div>';
  }

  document.getElementById('orderDetailBody').innerHTML =
    '<div style="display:grid;gap:12px;">' +
      '<div><strong>Cliente:</strong> ' + o.customer_name + '</div>' +
      '<div><strong>E-mail:</strong> ' + o.customer_email + '</div>' +
      '<div><strong>Telefone:</strong> ' + (o.whatsapp || '—') + ' ' +
        (whatsappLink ? '<a href="' + whatsappLink + '" target="_blank" class="btn btn-sm btn-secondary" style="background:#25D366;color:#fff;">Conversar no WhatsApp</a>' : '') +
      '</div>' +
      '<div><strong>Endereço:</strong><br>' + (o.address || '—') + '</div>' +
      '<div><strong>Forma de pagamento:</strong> ' + (o.payment_method || '—') + '</div>' +
      '<div><strong>Data:</strong> ' + data + '</div>' +
      '<div><strong>Total:</strong> R$ ' + total + '</div>' +
      '<div><strong>Status:</strong> ' +
        '<select class="form-input" id="detailStatusSelect" style="padding:4px 8px;font-size:12px;width:auto;margin-left:8px;">' +
          Object.keys(STATUS_MAP).map(function (s) {
            return '<option value="' + s + '" ' + (o.status === s ? 'selected' : '') + '>' + STATUS_MAP[s] + '</option>';
          }).join('') +
        '</select>' +
        '<button class="btn btn-sm btn-primary" id="detailStatusBtn" style="margin-left:8px;">Salvar</button>' +
      '</div>' +
      itemsHtml +
    '</div>';

  document.getElementById('detailStatusBtn').addEventListener('click', async function () {
    var newStatus = document.getElementById('detailStatusSelect').value;
    try {
      await apiRequest('PATCH', '/api/orders/' + o.id, { status: newStatus });
      o.status = newStatus;
      showToast('Status atualizado!');
      renderOrders();
    } catch (err) {
      showToast('Erro ao atualizar status.', 'error');
    }
  });
};

function closeDrawer() {
  document.getElementById('drawerOverlay').classList.remove('active');
  document.getElementById('drawer').classList.remove('active');
}

/* --- Event listeners --- */
document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('searchInput').addEventListener('input', function () {
    clearTimeout(this._timer);
    this._timer = setTimeout(function () { currentPage = 1; renderOrders(); }, 300);
  });
  document.getElementById('filterDateStart').addEventListener('change', function () { currentPage = 1; renderOrders(); });
  document.getElementById('filterDateEnd').addEventListener('change', function () { currentPage = 1; renderOrders(); });
  document.getElementById('filterStatus').addEventListener('change', function () { currentPage = 1; renderOrders(); });

  document.getElementById('drawerClose').addEventListener('click', closeDrawer);
  document.getElementById('drawerOverlay').addEventListener('click', closeDrawer);

  loadOrders();
});
