import { protectRoute, showToast } from './admin-auth.js';
import { API_BASE, apiRequest } from '../../../../assets/js/api.js';

protectRoute();

let allKits = [];
let allProducts = [];
let kitItems = [];
let deleteTargetId = null;
let currentPage = 1;
const PER_PAGE = 10;

/* --- Load kits --- */
async function loadKits() {
  var container = document.getElementById('tableContainer');
  container.innerHTML = '<div class="skeleton skeleton-table"></div>';
  try {
    const [kits, products] = await Promise.all([
      apiRequest('GET', '/api/kits'),
      apiRequest('GET', '/api/products')
    ]);
    allKits = kits;
    allProducts = products;
    renderKits();
  } catch (e) {
    container.innerHTML = '<div class="error-banner">Erro ao carregar kits.</div>';
  }
}

/* --- Render --- */
function renderKits() {
  var container = document.getElementById('tableContainer');
  var search = (document.getElementById('searchInput').value || '').toLowerCase().trim();

  var filtered = allKits.filter(function (k) {
    return !search || k.name.toLowerCase().includes(search);
  });

  var start = (currentPage - 1) * PER_PAGE;
  var end = start + PER_PAGE;
  var pageItems = filtered.slice(start, end);
  var totalPages = Math.ceil(filtered.length / PER_PAGE) || 1;

  if (pageItems.length === 0) {
    container.innerHTML = '<div class="empty-state"><span class="empty-icon">❏</span><p>Nenhum kit encontrado.</p></div>';
    return;
  }

  var rows = pageItems.map(function (k) {
    var price = Number(k.price).toFixed(2).replace('.', ',');
    var img = k.image_url ? '<img src="' + API_BASE + k.image_url + '" class="table-thumb" style="width:40px;height:40px;object-fit:cover;border-radius:4px;">' : '<span style="font-size:24px;opacity:0.3;">❏</span>';
    var badge = k.active ? '<span class="badge badge-success">Ativo</span>' : '<span class="badge badge-danger">Inativo</span>';
    return '<tr>' +
      '<td data-label="Imagem">' + img + '</td>' +
      '<td data-label="Nome"><strong>' + k.name + '</strong></td>' +
      '<td data-label="Preço">R$ ' + price + '</td>' +
      '<td data-label="Estoque">' + k.stock + '</td>' +
      '<td data-label="Status">' + badge + '</td>' +
      '<td data-label="Ações">' +
        '<button class="btn btn-sm btn-secondary" onclick="window.editKit(' + k.id + ')">✎</button> ' +
        '<button class="btn btn-sm btn-danger" onclick="window.confirmDelete(' + k.id + ')">✕</button>' +
      '</td>' +
      '</tr>';
  }).join('');

  container.innerHTML =
    '<table class="admin-table"><thead><tr>' +
    '<th>Imagem</th><th>Nome</th><th>Preço</th><th>Estoque</th><th>Status</th><th>Ações</th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table>' +
    '<div class="pagination">' +
    '<button class="btn btn-sm btn-secondary" id="prevPage" ' + (currentPage <= 1 ? 'disabled' : '') + '>← Anterior</button> ' +
    '<span class="pagination-info">' + currentPage + ' de ' + totalPages + '</span> ' +
    '<button class="btn btn-sm btn-secondary" id="nextPage" ' + (currentPage >= totalPages ? 'disabled' : '') + '>Próxima →</button>' +
    '</div>';

  document.getElementById('prevPage').addEventListener('click', function () { if (currentPage > 1) { currentPage--; renderKits(); } });
  document.getElementById('nextPage').addEventListener('click', function () { if (currentPage < totalPages) { currentPage++; renderKits(); } });
}

/* --- Drawer --- */
function openDrawer(kit) {
  document.getElementById('drawerOverlay').classList.add('active');
  document.getElementById('drawer').classList.add('active');
  document.getElementById('drawerTitle').textContent = kit ? 'Editar Kit' : 'Novo Kit';
  kitItems = [];

  if (kit) {
    document.getElementById('kitId').value = kit.id;
    document.getElementById('kitName').value = kit.name || '';
    document.getElementById('kitPrice').value = kit.price || '';
    document.getElementById('kitStock').value = kit.stock || 0;
    document.getElementById('kitDescription').value = kit.description || '';
    document.getElementById('kitActive').checked = kit.active !== false;
    if (kit.image_url) {
      document.getElementById('kitImageUrl').value = kit.image_url;
      var preview = document.getElementById('kitImagePreview');
      preview.src = API_BASE + kit.image_url;
      preview.style.display = 'block';
    } else {
      document.getElementById('kitImageUrl').value = '';
      document.getElementById('kitImagePreview').style.display = 'none';
    }
    if (kit.items) {
      kitItems = kit.items.map(function (i) { return { id: i.product_id, name: i.product_name || 'Produto #' + i.product_id }; });
    }
    renderKitItems();
  } else {
    document.getElementById('kitForm').reset();
    document.getElementById('kitId').value = '';
    document.getElementById('kitImageUrl').value = '';
    document.getElementById('kitImagePreview').style.display = 'none';
    document.getElementById('kitActive').checked = true;
    document.getElementById('kitStock').value = 0;
    kitItems = [];
    renderKitItems();
    document.getElementById('acResults').style.display = 'none';
  }
}

function closeDrawer() {
  document.getElementById('drawerOverlay').classList.remove('active');
  document.getElementById('drawer').classList.remove('active');
}

/* --- Kit items --- */
function renderKitItems() {
  var list = document.getElementById('kitItemList');
  if (kitItems.length === 0) {
    list.innerHTML = '<p style="color:var(--color-text-muted);font-size:var(--font-size-sm);margin-top:8px;">Nenhum produto adicionado ao kit.</p>';
    return;
  }
  list.innerHTML = kitItems.map(function (item, index) {
    return '<div class="kit-item-row">' +
      '<span class="item-name">' + item.name + '</span>' +
      '<button type="button" class="btn-remove-item" data-index="' + index + '">✕</button>' +
      '</div>';
  }).join('');

  list.querySelectorAll('.btn-remove-item').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var idx = parseInt(this.dataset.index);
      kitItems.splice(idx, 1);
      renderKitItems();
    });
  });
}

/* --- Autocomplete --- */
document.addEventListener('DOMContentLoaded', function () {
  var searchInput = document.getElementById('kitProductSearch');
  var acResults = document.getElementById('acResults');

  searchInput.addEventListener('input', function () {
    clearTimeout(this._timer);
    this._timer = setTimeout(function () {
      var q = searchInput.value.toLowerCase().trim();
      if (!q) { acResults.style.display = 'none'; return; }
      var matches = allProducts.filter(function (p) {
        return p.name.toLowerCase().includes(q) && !kitItems.some(function (ki) { return ki.id === p.id; });
      }).slice(0, 10);

      if (matches.length === 0) { acResults.style.display = 'none'; return; }

      acResults.innerHTML = matches.map(function (p) {
        return '<div class="ac-item" data-id="' + p.id + '" data-name="' + p.name + '">' + p.name + '</div>';
      }).join('');
      acResults.style.display = 'block';

      acResults.querySelectorAll('.ac-item').forEach(function (item) {
        item.addEventListener('click', function () {
          var id = Number(this.dataset.id);
          var name = this.dataset.name;
          if (!kitItems.some(function (ki) { return ki.id === id; })) {
            kitItems.push({ id: id, name: name });
            renderKitItems();
          }
          searchInput.value = '';
          acResults.style.display = 'none';
        });
      });
    }, 300);
  });

  document.addEventListener('click', function (e) {
    if (!e.target.closest('.product-autocomplete')) {
      acResults.style.display = 'none';
    }
  });
});

/* --- Image upload --- */
document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('kitImageInput').addEventListener('change', async function (e) {
    var file = e.target.files[0];
    if (!file) return;
    var formData = new FormData();
    formData.append('image', file);
    try {
      var result = await apiRequest('POST', '/api/uploads', formData, true);
      document.getElementById('kitImageUrl').value = result.image_url;
      var preview = document.getElementById('kitImagePreview');
      preview.src = API_BASE + result.image_url;
      preview.style.display = 'block';
    } catch (err) {
      showToast('Erro ao fazer upload.', 'error');
    }
  });
});

/* --- Form submit --- */
document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('kitForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    var id = document.getElementById('kitId').value;
    var payload = {
      name: document.getElementById('kitName').value.trim(),
      price: Number(document.getElementById('kitPrice').value),
      stock: Number(document.getElementById('kitStock').value),
      description: document.getElementById('kitDescription').value.trim(),
      image_url: document.getElementById('kitImageUrl').value || null,
      active: document.getElementById('kitActive').checked
    };

    if (!payload.name || !payload.price) {
      showToast('Preencha nome e preço.', 'error');
      return;
    }

    var btn = document.getElementById('btnSaveKit');
    btn.textContent = 'Salvando...';
    btn.disabled = true;

    try {
      var kitResult;
      if (id) {
        kitResult = await apiRequest('PUT', '/api/kits/' + id, payload);
        showToast('Kit atualizado!');
      } else {
        kitResult = await apiRequest('POST', '/api/kits', payload);
        id = kitResult.id;
        showToast('Kit criado!');
      }

      if (kitItems.length > 0) {
        await Promise.all(kitItems.map(function (item) {
          return apiRequest('POST', '/api/kits/' + id + '/items', { product_id: item.id });
        }));
      }

      closeDrawer();
      await loadKits();
    } catch (err) {
      showToast('Erro ao salvar kit.', 'error');
    } finally {
      btn.textContent = 'Salvar';
      btn.disabled = false;
    }
  });
});

/* --- Delete --- */
window.confirmDelete = function (id) {
  deleteTargetId = id;
  var k = allKits.find(function (k) { return k.id === id; });
  document.getElementById('confirmMessage').textContent = 'Excluir kit "' + (k ? k.name : '') + '"?';
  document.getElementById('confirmOverlay').classList.add('active');
  document.getElementById('confirmModal').classList.add('active');
};

window.editKit = function (id) {
  var k = allKits.find(function (k) { return k.id === id; });
  if (k) openDrawer(k);
};

/* --- Event listeners --- */
document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('searchInput').addEventListener('input', function () {
    clearTimeout(this._timer);
    this._timer = setTimeout(function () { currentPage = 1; renderKits(); }, 300);
  });

  document.getElementById('btnNovoKit').addEventListener('click', function () { openDrawer(null); });

  document.getElementById('drawerClose').addEventListener('click', closeDrawer);
  document.getElementById('drawerCancel').addEventListener('click', closeDrawer);
  document.getElementById('drawerOverlay').addEventListener('click', closeDrawer);

  document.getElementById('confirmCancel').addEventListener('click', function () {
    document.getElementById('confirmOverlay').classList.remove('active');
    document.getElementById('confirmModal').classList.remove('active');
  });
  document.getElementById('confirmOverlay').addEventListener('click', function () {
    document.getElementById('confirmOverlay').classList.remove('active');
    document.getElementById('confirmModal').classList.remove('active');
  });
  document.getElementById('confirmDelete').addEventListener('click', async function () {
    if (!deleteTargetId) return;
    try {
      await apiRequest('DELETE', '/api/kits/' + deleteTargetId);
      showToast('Kit excluído!');
      document.getElementById('confirmOverlay').classList.remove('active');
      document.getElementById('confirmModal').classList.remove('active');
      await loadKits();
    } catch (err) {
      showToast('Erro ao excluir kit.', 'error');
    }
    deleteTargetId = null;
  });

  loadKits();
});
