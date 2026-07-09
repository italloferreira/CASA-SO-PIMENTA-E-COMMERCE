document.addEventListener('DOMContentLoaded', function () {
  const produtosSection = document.querySelector('.produtos-section');
  if (!produtosSection) return;

  const categoria = produtosSection.dataset.categoria;
  const API_BASE = window.API_BASE_URL || 'http://localhost:3333';

  var todosProdutos = [];
  var total = 0;
  var loading = false;
  var allLoaded = false;
  var sentinel = null;
  var observer = null;

  function estaDisponivel(produto) {
    return produto.stock > 0 && produto.is_active !== 0;
  }

  function cartaoHtml(produto) {
    var venda = produto.compare_price || produto.price;
    var valorFormatado = Number(venda).toFixed(2).replace('.', ',');
    const imgSrc = imgUrl(produto.image_url);
    const precoHtml = produto.compare_price
      ? '<span style="text-decoration:line-through;color:#999;font-size:12px;">R$ ' + Number(produto.price).toFixed(2).replace('.', ',') + '</span><br><strong style="color:#c53b22;">R$ ' + valorFormatado + '</strong>'
      : 'R$ ' + valorFormatado;

    var disponivel = estaDisponivel(produto);

    return '<div class="cartao' + (disponivel ? '' : ' indisponivel') + '">' +
      (disponivel ? '' : '<div class="overlay-indisponivel"><span>Indisponível</span></div>') +
      '<img src="' + imgSrc + '" alt="' + produto.name + '" loading="lazy">' +
      '<h3>' + produto.name + '</h3>' +
      '<p>' + precoHtml + '</p>' +
      '<div>' +
        '<button' + (disponivel ? ' onclick=\'addCarrinho(' + JSON.stringify({ id: produto.id, nome: produto.name, valor: venda, img: imgSrc, tipo: "produto" }) + ')\'' : ' disabled') + '>' +
          '<img src="/site/imgs/icones/carrinho.png" alt="Adicionar ao carrinho">' +
        '</button>' +
        '<button' + (disponivel ? ' onclick="window.location.href=\'/site/pages/produtos/detalhe/index.html?id=' + produto.id + '&categoria=' + categoria + '\'"' : ' disabled') + '>Ver produto</button>' +
      '</div>' +
    '</div>';
  }

  function atualizarSentinel() {
    if (sentinel) sentinel.remove();
    if (observer) observer.disconnect();

    if (allLoaded) return;

    sentinel = document.createElement('div');
    sentinel.className = 'sentinel';
    sentinel.textContent = 'Carregando mais...';
    sentinel.style.cssText = 'text-align:center;padding:20px;color:#999;';
    produtosSection.appendChild(sentinel);

    observer = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting && !loading && !allLoaded) {
        carregarPagina();
      }
    }, { rootMargin: '300px' });
    observer.observe(sentinel);
  }

  function renderizarProdutos(produtos) {
    produtosSection.innerHTML = '';

    if (produtos.length === 0) {
      produtosSection.innerHTML = '<p>Nenhum produto encontrado.</p>';
      return;
    }

    produtos.forEach(function (p) {
      produtosSection.innerHTML += cartaoHtml(p);
    });
  }

  function carregarPagina() {
    if (loading || allLoaded) return;
    loading = true;

    if (todosProdutos.length === 0) {
      produtosSection.innerHTML = '<p>Carregando produtos...</p>';
    }

    fetch(API_BASE + '/api/products?category=' + encodeURIComponent(categoria) + '&limit=20&offset=' + todosProdutos.length)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        todosProdutos = todosProdutos.concat(data.products);
        total = data.total;
        allLoaded = todosProdutos.length >= total;

        renderizarProdutos(todosProdutos);
        loading = false;
        atualizarSentinel();
      })
      .catch(function () {
        if (todosProdutos.length === 0) {
          produtosSection.innerHTML = '<p>Não foi possível carregar os produtos.</p>';
        }
        loading = false;
        allLoaded = true;
      });
  }

  function filterProducts(term) {
    if (!term || term.trim().length === 0) {
      renderizarProdutos(todosProdutos);
      return;
    }
    var lower = term.trim().toLowerCase();
    var filtered = todosProdutos.filter(function (p) {
      return p.name.toLowerCase().indexOf(lower) !== -1
        || (p.description && p.description.toLowerCase().indexOf(lower) !== -1);
    });
    renderizarProdutos(filtered);
  }

  var inputPesquisa = document.querySelector('.pesquisa');
  if (inputPesquisa) {
    inputPesquisa.addEventListener('input', function () {
      filterProducts(this.value);
    });
  }

  carregarPagina();
});
