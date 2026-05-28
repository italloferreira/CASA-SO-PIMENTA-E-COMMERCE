import { protectRoute, showToast } from '../assets/js/admin-auth.js';

protectRoute();

var STORAGE_KEY = 'csp_admin_coupons';
var coupons = [];
var deleteTargetIndex = null;

function loadCoupons() {
  try {
    coupons = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch (e) { coupons = []; }
  renderCoupons();
}

function saveCoupons() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(coupons));
  renderCoupons();
}

function renderCoupons() {
  var container = document.getElementById('tableContainer');
  var search = (document.getElementById('searchInput').value || '').toLowerCase().trim();

  var filtered = coupons.filter(function (c) {
    return !search || c.code.toLowerCase().includes(search);
  });

  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-state"><span class="empty-icon">◈</span><p>Nenhum cupom encontrado.</p></div>';
    return;
  }

  var rows = filtered.map(function (c, idx) {
    var realIndex = coupons.indexOf(c);
    var discount = Number(c.discount).toFixed(2).replace('.', ',');
    var expires = c.expires ? new Date(c.expires + 'T23:59:59').toLocaleDateString('pt-BR') : '—';
    var expired = c.expires && new Date(c.expires + 'T23:59:59') < new Date();
    var activeBadge = c.active && !expired ? '<span class="badge badge-success">Ativo</span>' : '<span class="badge badge-danger">' + (expired ? 'Expirado' : 'Inativo') + '</span>';
    return '<tr>' +
      '<td data-label="Código"><strong>' + c.code + '</strong></td>' +
      '<td data-label="Desconto">R$ ' + discount + '</td>' +
      '<td data-label="Mínimo">' + (c.min_order ? 'R$ ' + Number(c.min_order).toFixed(2).replace('.', ',') : '—') + '</td>' +
      '<td data-label="Validade">' + expires + '</td>' +
      '<td data-label="Status">' + activeBadge + '</td>' +
      '<td data-label="Ações">' +
        '<button class="btn btn-sm btn-secondary" onclick="window.editCupom(' + realIndex + ')">✎</button> ' +
        '<button class="btn btn-sm btn-danger" onclick="window.confirmDelete(' + realIndex + ')">✕</button>' +
      '</td>' +
      '</tr>';
  }).join('');

  container.innerHTML =
    '<table class="admin-table"><thead><tr>' +
    '<th>Código</th><th>Desconto</th><th>Mínimo</th><th>Validade</th><th>Status</th><th>Ações</th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table>';
}

function openModal(index) {
  document.getElementById('modalOverlay').classList.add('active');
  document.getElementById('modal').classList.add('active');

  if (index !== undefined && index >= 0) {
    var c = coupons[index];
    document.getElementById('modalTitle').textContent = 'Editar Cupom';
    document.getElementById('cupomIndex').value = index;
    document.getElementById('cupomCode').value = c.code;
    document.getElementById('cupomDiscount').value = c.discount;
    document.getElementById('cupomMinOrder').value = c.min_order || '';
    document.getElementById('cupomExpires').value = c.expires || '';
    document.getElementById('cupomActive').checked = c.active !== false;
  } else {
    document.getElementById('modalTitle').textContent = 'Novo Cupom';
    document.getElementById('cupomForm').reset();
    document.getElementById('cupomIndex').value = '';
    document.getElementById('cupomActive').checked = true;
  }
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('active');
  document.getElementById('modal').classList.remove('active');
}

window.editCupom = function (index) { openModal(index); };
window.confirmDelete = function (index) {
  deleteTargetIndex = index;
  var c = coupons[index];
  document.getElementById('confirmMessage').textContent = 'Excluir cupom "' + (c ? c.code : '') + '"?';
  document.getElementById('confirmOverlay').classList.add('active');
  document.getElementById('confirmModal').classList.add('active');
};

document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('searchInput').addEventListener('input', function () {
    clearTimeout(this._timer);
    this._timer = setTimeout(renderCoupons, 300);
  });

  document.getElementById('btnNovoCupom').addEventListener('click', function () { openModal(undefined); });

  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalCancel').addEventListener('click', closeModal);
  document.getElementById('modalOverlay').addEventListener('click', closeModal);

  document.getElementById('cupomForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var index = document.getElementById('cupomIndex').value;
    var payload = {
      code: document.getElementById('cupomCode').value.trim().toUpperCase(),
      discount: Number(document.getElementById('cupomDiscount').value),
      min_order: document.getElementById('cupomMinOrder').value ? Number(document.getElementById('cupomMinOrder').value) : null,
      expires: document.getElementById('cupomExpires').value || null,
      active: document.getElementById('cupomActive').checked
    };

    if (!payload.code || !payload.discount) {
      showToast('Preencha código e desconto.', 'error');
      return;
    }

    if (index !== '' && index >= 0) {
      coupons[index] = payload;
      showToast('Cupom atualizado!');
    } else {
      if (coupons.some(function (c) { return c.code === payload.code; })) {
        showToast('Já existe um cupom com este código.', 'error');
        return;
      }
      coupons.push(payload);
      showToast('Cupom criado!');
    }

    saveCoupons();
    closeModal();
  });

  document.getElementById('confirmCancel').addEventListener('click', function () {
    document.getElementById('confirmOverlay').classList.remove('active');
    document.getElementById('confirmModal').classList.remove('active');
  });
  document.getElementById('confirmOverlay').addEventListener('click', function () {
    document.getElementById('confirmOverlay').classList.remove('active');
    document.getElementById('confirmModal').classList.remove('active');
  });
  document.getElementById('confirmDelete').addEventListener('click', function () {
    if (deleteTargetIndex !== null) {
      coupons.splice(deleteTargetIndex, 1);
      saveCoupons();
      showToast('Cupom excluído!');
      document.getElementById('confirmOverlay').classList.remove('active');
      document.getElementById('confirmModal').classList.remove('active');
      deleteTargetIndex = null;
    }
  });

  loadCoupons();
});
