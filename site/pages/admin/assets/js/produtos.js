import { protectRoute, showToast } from './admin-auth.js';
import { API_BASE, apiRequest } from '../../../../assets/js/api.js';

protectRoute();

let allProducts = [];
let categories = [];
let currentPage = 1;
const PER_PAGE = 10;
let deleteTargetId = null;

/* --- Transliterate slug --- */
function slugify(text) {
  const map = {
    'á':'a','à':'a','ã':'a','â':'a','ä':'a','é':'e','ê':'e','è':'e','ë':'e',
    'í':'i','ì':'i','î':'i','ï':'i','ó':'o','ò':'o','õ':'o','ô':'o','ö':'o',
    'ú':'u','ù':'u','û':'u','ü':'u','ç':'c','ñ':'n'
  };
  return text.toLowerCase().replace(/[áàãâäéèêëíìîïóòõôöúùûüçñ]/g, function (c) { return map[c] || c; }).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/* --- Fetch categories --- */
async function loadCategories() {
  try {
    categories = await apiRequest('GET', '/api/categories');
    const sel = document.getElementById('filterCategory');
    const selForm = document.getElementById('prodCategory');
    const opts = categories.map(function (c) {
      return '<option value="' + c.id + '">' + c.name + '</option>';
    }).join('');
    sel.innerHTML = '<option value="">Todas as categorias</option>' + opts;
    selForm.innerHTML = '<option value="">Selecione</option>' + opts;
  } catch (e) {
    showToast('Erro ao carregar categorias.', 'error');
  }
}

/* --- Render table --- */
function renderTable(products) {
  var container = document.getElementById('tableContainer');
  var start = (currentPage - 1) * PER_PAGE;
  var end = start + PER_PAGE;
  var pageItems = products.slice(start, end);
  var totalPages = Math.ceil(products.length / PER_PAGE) || 1;

  if (pageItems.length === 0) {
    container.innerHTML = '<div class="empty-state"><span class="empty-icon">▦</span><p>Nenhum produto encontrado.</p></div>';
    return;
  }

  var rows = pageItems.map(function (p) {
    var price = Number(p.price).toFixed(2).replace('.', ',');
    var compare = p.compare_price ? '<span style="text-decoration:line-through;color:var(--color-text-muted);font-size:12px;">R$ ' + Number(p.compare_price).toFixed(2).replace('.', ',') + '</span><br>' : '';
    var img = p.image_url ? '<img src="' + API_BASE + p.image_url + '" class="table-thumb" style="width:40px;height:40px;object-fit:cover;border-radius:4px;">' : '<span style="font-size:24px;opacity:0.3;">▦</span>';
    var activeBadge = p.active ? '<span class="badge badge-success">Ativo</span>' : '<span class="badge badge-danger">Inativo</span>';
    var featuredBadge = p.featured ? '<span class="badge badge-info">Destaque</span>' : '';
    return '<tr>' +
      '<td data-label="Imagem">' + img + '</td>' +
      '<td data-label="Nome"><strong>' + p.name + '</strong>' + (p.category_name ? '<br><small>' + p.category_name + '</small>' : '') + '</td>' +
      '<td data-label="Preço">R$ ' + price + '<br>' + compare + '</td>' +
      '<td data-label="Estoque">' + p.stock + '</td>' +
      '<td data-label="Status">' + activeBadge + ' ' + featuredBadge + '</td>' +
      '<td data-label="Ações">' +
        '<button class="btn btn-sm btn-secondary" onclick="window.editProduct(' + p.id + ')">✎</button> ' +
        '<button class="btn btn-sm btn-danger" onclick="window.confirmDelete(' + p.id + ')">✕</button>' +
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

  document.getElementById('prevPage').addEventListener('click', function () { if (currentPage > 1) { currentPage--; applyFilters(); } });
  document.getElementById('nextPage').addEventListener('click', function () { if (currentPage < totalPages) { currentPage++; applyFilters(); } });
}

/* --- Apply filters --- */
function applyFilters() {
  currentPage = 1;
  var search = document.getElementById('searchInput').value.toLowerCase().trim();
  var catId = document.getElementById('filterCategory').value;
  var active = document.getElementById('filterActive').value;

  var filtered = allProducts.filter(function (p) {
    if (search && !p.name.toLowerCase().includes(search) && (!p.category_name || !p.category_name.toLowerCase().includes(search))) return false;
    if (catId && String(p.category_id) !== catId) return false;
    if (active === 'active' && !p.active) return false;
    if (active === 'inactive' && p.active) return false;
    return true;
  });

  renderTable(filtered);
}

/* --- Load products --- */
async function loadProducts() {
  var container = document.getElementById('tableContainer');
  container.innerHTML = '<div class="skeleton skeleton-table"></div>';
  try {
    allProducts = await apiRequest('GET', '/api/products');
    applyFilters();
  } catch (e) {
    container.innerHTML = '<div class="error-banner">Erro ao carregar produtos. Verifique a conexão com o servidor.</div>';
  }
}

/* --- Drawer --- */
function openDrawer(product) {
  document.getElementById('drawerOverlay').classList.add('active');
  document.getElementById('drawer').classList.add('active');
  document.getElementById('drawerTitle').textContent = product ? 'Editar Produto' : 'Novo Produto';

  if (product) {
    document.getElementById('productId').value = product.id;
    document.getElementById('prodName').value = product.name || '';
    document.getElementById('prodSlug').value = product.slug || '';
    document.getElementById('prodCategory').value = product.category_id || '';
    document.getElementById('prodPrice').value = product.price || '';
    document.getElementById('prodComparePrice').value = product.compare_price || '';
    document.getElementById('prodStock').value = product.stock || 0;
    document.getElementById('prodDescription').value = product.description || '';
    document.getElementById('prodIngredients').value = product.ingredients || '';
    document.getElementById('prodActive').checked = product.active !== false;
    document.getElementById('prodFeatured').checked = product.featured === true;
    if (product.image_url) {
      document.getElementById('prodImageUrl').value = product.image_url;
      var preview = document.getElementById('prodImagePreview');
      preview.src = API_BASE + product.image_url;
      preview.style.display = 'block';
    } else {
      document.getElementById('prodImageUrl').value = '';
      document.getElementById('prodImagePreview').style.display = 'none';
    }
  } else {
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = '';
    document.getElementById('prodImageUrl').value = '';
    document.getElementById('prodImagePreview').style.display = 'none';
    document.getElementById('prodActive').checked = true;
    document.getElementById('prodFeatured').checked = false;
    document.getElementById('prodStock').value = 0;
  }
}

function closeDrawer() {
  document.getElementById('drawerOverlay').classList.remove('active');
  document.getElementById('drawer').classList.remove('active');
}

/* --- Auto-slug on name change --- */
document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('prodName').addEventListener('input', function () {
    var slugField = document.getElementById('prodSlug');
    if (!slugField.value || slugField.dataset.autofilled !== 'false') {
      slugField.value = slugify(this.value);
    }
  });
  document.getElementById('prodSlug').addEventListener('input', function () {
    this.dataset.autofilled = 'false';
  });
});

/* --- Image upload --- */
document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('prodImageInput').addEventListener('change', async function (e) {
    var file = e.target.files[0];
    if (!file) return;
    var formData = new FormData();
    formData.append('image', file);
    try {
      var result = await apiRequest('POST', '/api/uploads', formData, true);
      document.getElementById('prodImageUrl').value = result.image_url;
      var preview = document.getElementById('prodImagePreview');
      preview.src = API_BASE + result.image_url;
      preview.style.display = 'block';
    } catch (err) {
      showToast('Erro ao fazer upload da imagem.', 'error');
    }
  });
});

/* --- Form submit --- */
document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('productForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    var id = document.getElementById('productId').value;
    var payload = {
      name: document.getElementById('prodName').value.trim(),
      slug: document.getElementById('prodSlug').value.trim() || slugify(document.getElementById('prodName').value.trim()),
      category_id: Number(document.getElementById('prodCategory').value),
      price: Number(document.getElementById('prodPrice').value),
      compare_price: document.getElementById('prodComparePrice').value ? Number(document.getElementById('prodComparePrice').value) : null,
      stock: Number(document.getElementById('prodStock').value),
      description: document.getElementById('prodDescription').value.trim(),
      ingredients: document.getElementById('prodIngredients').value.trim(),
      image_url: document.getElementById('prodImageUrl').value || null,
      active: document.getElementById('prodActive').checked,
      featured: document.getElementById('prodFeatured').checked
    };

    if (!payload.name || !payload.category_id || !payload.price) {
      showToast('Preencha os campos obrigatórios.', 'error');
      return;
    }

    var btn = document.getElementById('btnSaveProduct');
    btn.textContent = 'Salvando...';
    btn.disabled = true;

    try {
      if (id) {
        await apiRequest('PUT', '/api/products/' + id, payload);
        showToast('Produto atualizado com sucesso!');
      } else {
        await apiRequest('POST', '/api/products', payload);
        showToast('Produto criado com sucesso!');
      }
      closeDrawer();
      await loadProducts();
    } catch (err) {
      showToast('Erro ao salvar produto.', 'error');
    } finally {
      btn.textContent = 'Salvar';
      btn.disabled = false;
    }
  });
});

/* --- Delete --- */
window.confirmDelete = function (id) {
  deleteTargetId = id;
  var p = allProducts.find(function (p) { return p.id === id; });
  document.getElementById('confirmMessage').textContent = 'Excluir "' + (p ? p.name : 'este produto') + '"? Esta ação não pode ser desfeita.';
  document.getElementById('confirmOverlay').classList.add('active');
  document.getElementById('confirmModal').classList.add('active');
};

window.editProduct = function (id) {
  var p = allProducts.find(function (p) { return p.id === id; });
  if (p) openDrawer(p);
};

/* --- Event listeners --- */
document.addEventListener('DOMContentLoaded', function () {
  /* Filters */
  document.getElementById('searchInput').addEventListener('input', function () {
    clearTimeout(this._timer);
    this._timer = setTimeout(applyFilters, 300);
  });
  document.getElementById('filterCategory').addEventListener('change', applyFilters);
  document.getElementById('filterActive').addEventListener('change', applyFilters);

  /* New product */
  document.getElementById('btnNovoProduto').addEventListener('click', function () { openDrawer(null); });

  /* Drawer close */
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
      await apiRequest('DELETE', '/api/products/' + deleteTargetId);
      showToast('Produto excluído com sucesso!');
      document.getElementById('confirmOverlay').classList.remove('active');
      document.getElementById('confirmModal').classList.remove('active');
      await loadProducts();
    } catch (err) {
      showToast('Erro ao excluir produto.', 'error');
    }
    deleteTargetId = null;
  });

  /* Init */
  loadCategories();
  loadProducts();
});
