(function () {
  var API = window.API_BASE_URL || 'http://localhost:3333';
  var allItems = [];
  var currentIndex = 0;
  var filteredItems = [];

  function escHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function carregarGaleria() {
    var grid = document.getElementById('galeriaGrid');
    var loading = document.getElementById('galeriaLoading');
    loading.style.display = 'block';

    fetch(API + '/api/products/gallery')
      .then(function (r) {
        if (!r.ok) throw new Error('Erro ao carregar galeria.');
        return r.json();
      })
      .then(function (items) {
        allItems = items;
        loading.style.display = 'none';
        renderizarFiltros();
        renderizarGrid(items);
      })
      .catch(function () {
        loading.textContent = 'Erro ao carregar galeria. Tente novamente mais tarde.';
      });
  }

  function renderizarFiltros() {
    var container = document.getElementById('galeriaFiltros');
    var categorias = {};
    allItems.forEach(function (item) {
      if (item.category_slug && !categorias[item.category_slug]) {
        categorias[item.category_slug] = item.category_name || item.category_slug;
      }
    });

    var html = '<button class="galeria-filtro ativo" data-categoria="">Todas</button>';
    var slugs = Object.keys(categorias).sort();
    slugs.forEach(function (slug) {
      html += '<button class="galeria-filtro" data-categoria="' + escHtml(slug) + '">' + escHtml(categorias[slug]) + '</button>';
    });
    container.innerHTML = html;

    container.querySelectorAll('.galeria-filtro').forEach(function (btn) {
      btn.addEventListener('click', function () {
        container.querySelectorAll('.galeria-filtro').forEach(function (b) { b.classList.remove('ativo'); });
        this.classList.add('ativo');
        var categoria = this.dataset.categoria;
        var items = categoria ? allItems.filter(function (i) { return i.category_slug === categoria; }) : allItems;
        renderizarGrid(items);
      });
    });
  }

  function renderizarGrid(items) {
    filteredItems = items;
    var grid = document.getElementById('galeriaGrid');

    if (items.length === 0) {
      grid.innerHTML = '<div class="galeria-vazio">Nenhum produto encontrado.</div>';
      return;
    }

    var html = '';
    items.forEach(function (item, i) {
      html += '<div class="galeria-item" data-index="' + i + '">' +
        '<img src="' + imgUrl(item.image_url) + '" alt="' + escHtml(item.name) + '" loading="lazy">' +
        '<div class="galeria-overlay">' +
          '<span class="galeria-nome">' + escHtml(item.name) + '</span>' +
        '</div>' +
      '</div>';
    });
    grid.innerHTML = html;

    grid.querySelectorAll('.galeria-item').forEach(function (el) {
      el.addEventListener('click', function () {
        var idx = parseInt(this.dataset.index);
        abrirLightbox(idx);
      });
    });
  }

  function abrirLightbox(index) {
    if (filteredItems.length === 0) return;
    currentIndex = index;
    var item = filteredItems[currentIndex];
    var overlay = document.getElementById('lightboxOverlay');

    document.getElementById('lightboxImg').src = imgUrl(item.image_url);
    document.getElementById('lightboxImg').alt = item.name || '';
    document.getElementById('lightboxName').textContent = item.name || '';
    document.getElementById('lightboxLink').href = '/site/pages/produtos/detalhe/index.html?slug=' + item.slug;

    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    atualizarNavegacao();
  }

  function fecharLightbox() {
    document.getElementById('lightboxOverlay').style.display = 'none';
    document.body.style.overflow = '';
  }

  function navegar(dir) {
    var newIndex = currentIndex + dir;
    if (newIndex < 0) newIndex = filteredItems.length - 1;
    if (newIndex >= filteredItems.length) newIndex = 0;
    abrirLightbox(newIndex);
  }

  function atualizarNavegacao() {
    var prev = document.getElementById('lightboxPrev');
    var next = document.getElementById('lightboxNext');
    prev.style.display = filteredItems.length > 1 ? '' : 'none';
    next.style.display = filteredItems.length > 1 ? '' : 'none';
  }

  document.addEventListener('DOMContentLoaded', function () {
    carregarGaleria();

    document.getElementById('lightboxClose').addEventListener('click', fecharLightbox);
    document.getElementById('lightboxOverlay').addEventListener('click', function (e) {
      if (e.target === this || e.target.classList.contains('lightbox-content')) {
        fecharLightbox();
      }
    });
    document.getElementById('lightboxPrev').addEventListener('click', function () { navegar(-1); });
    document.getElementById('lightboxNext').addEventListener('click', function () { navegar(1); });

    document.addEventListener('keydown', function (e) {
      var overlay = document.getElementById('lightboxOverlay');
      if (overlay.style.display !== 'flex') return;
      if (e.key === 'Escape') fecharLightbox();
      if (e.key === 'ArrowLeft') navegar(-1);
      if (e.key === 'ArrowRight') navegar(1);
    });
  });
})();