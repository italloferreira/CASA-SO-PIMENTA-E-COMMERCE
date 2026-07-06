document.addEventListener('DOMContentLoaded', function () {
  const produtosSection = document.querySelector('.produtos-section');
  if (!produtosSection) return;

  const categoria = produtosSection.dataset.categoria;
  const API_URL = (window.API_BASE_URL || 'http://localhost:3333') + '/api/products?category=' + encodeURIComponent(categoria);

  const chaveCache = 'produtos_v2_' + categoria + '_cache';
  const chaveTempo = 'produtos_v2_' + categoria + '_timestamp';
  const tempoAgora = Date.now();
  const tempoValidade = 5 * 60 * 1000;

  var todosProdutos = [];

  function renderizarProdutos(produtos) {
    produtosSection.innerHTML = '';

    if (produtos.length === 0) {
      produtosSection.innerHTML = '<p>Nenhum produto encontrado.</p>';
      return;
    }

    produtos.forEach(function (produto) {
      var venda = produto.compare_price || produto.price;
      var valorFormatado = Number(venda).toFixed(2).replace('.', ',');
      const imgSrc = produto.image_url
        ? (window.API_BASE_URL || 'http://localhost:3333') + produto.image_url
        : '/site/imgs/logo.jpeg';
      const precoHtml = produto.compare_price
        ? '<span style="text-decoration:line-through;color:#999;font-size:12px;">R$ ' + Number(produto.price).toFixed(2).replace('.', ',') + '</span><br><strong style="color:#c53b22;">R$ ' + valorFormatado + '</strong>'
        : 'R$ ' + valorFormatado;

      produtosSection.innerHTML += `
        <div class="cartao">
          <img src="${imgSrc}" alt="${produto.name}" loading="lazy">
          <h3>${produto.name}</h3>
          <p>${precoHtml}</p>
          <div>
            <button onclick='addCarrinho(${JSON.stringify({
              id: produto.id,
              nome: produto.name,
              valor: venda,
              img: imgSrc,
              tipo: "produto"
            })})'>
              <img src="/site/imgs/icones/carrinho.png" alt="Adicionar ao carrinho">
            </button>
            <button onclick="window.location.href='/site/pages/produtos/detalhe/index.html?id=${produto.id}&categoria=${categoria}'">Ver produto</button>
          </div>
        </div>
      `;
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

  const cacheSalvo = localStorage.getItem(chaveCache);
  const tempoSalvo = localStorage.getItem(chaveTempo);

  if (cacheSalvo && tempoSalvo && (tempoAgora - Number(tempoSalvo) < tempoValidade)) {
    todosProdutos = JSON.parse(cacheSalvo);
    renderizarProdutos(todosProdutos);
    return;
  }

  produtosSection.innerHTML = '<p>Carregando produtos...</p>';

  fetch(API_URL)
    .then(function (resposta) {
      return resposta.json();
    })
    .then(function (produtos) {
      todosProdutos = produtos;
      localStorage.setItem(chaveCache, JSON.stringify(produtos));
      localStorage.setItem(chaveTempo, String(tempoAgora));
      renderizarProdutos(produtos);
    })
    .catch(function () {
      produtosSection.innerHTML = '<p>Não foi possível carregar os produtos.</p>';
    });

  var inputPesquisa = document.querySelector('.pesquisa');
  if (inputPesquisa) {
    inputPesquisa.addEventListener('input', function () {
      filterProducts(this.value);
    });
  }
});
