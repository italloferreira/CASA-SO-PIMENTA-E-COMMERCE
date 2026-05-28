document.addEventListener('DOMContentLoaded', function () {
  const produtosSection = document.querySelector('.produtos-section');
  if (!produtosSection) return;

  const categoria = produtosSection.dataset.categoria;
  const API_URL = 'http://localhost:3333/api/products?category=' + encodeURIComponent(categoria);

  const chaveCache = 'produtos_' + categoria + '_cache';
  const chaveTempo = 'produtos_' + categoria + '_timestamp';
  const tempoAgora = Date.now();
  const tempoValidade = 5 * 60 * 1000;

  function renderizarProdutos(produtos) {
    produtosSection.innerHTML = '';

    if (produtos.length === 0) {
      produtosSection.innerHTML = '<p>Nenhum produto encontrado nesta categoria.</p>';
      return;
    }

    produtos.forEach(function (produto) {
      const valorFormatado = Number(produto.price).toFixed(2).replace('.', ',');
      const imgSrc = produto.image_url
        ? 'http://localhost:3333' + produto.image_url
        : '/site/imgs/logo.jpeg';

      produtosSection.innerHTML += `
        <div class="cartao">
          <img src="${imgSrc}" alt="${produto.name}" loading="lazy">
          <h3>${produto.name}</h3>
          <p>R$ ${valorFormatado}</p>
          <div>
            <button onclick='addCarrinho(${JSON.stringify({
              id: produto.id,
              nome: produto.name,
              valor: produto.price,
              img: imgSrc
            })})'>
              <img src="/site/imgs/icones/carrinho.png" alt="Adicionar ao carrinho">
            </button>
            <button onclick="window.location.href='/site/pages/produtos/detalhe/index.html?id=${produto.id}&categoria=${categoria}'">Ver produto</button>
          </div>
        </div>
      `;
    });
  }

  const cacheSalvo = localStorage.getItem(chaveCache);
  const tempoSalvo = localStorage.getItem(chaveTempo);

  if (cacheSalvo && tempoSalvo && (tempoAgora - Number(tempoSalvo) < tempoValidade)) {
    const dados = JSON.parse(cacheSalvo);
    renderizarProdutos(dados);
    return;
  }

  produtosSection.innerHTML = '<p>Carregando produtos...</p>';

  fetch(API_URL)
    .then(function (resposta) {
      return resposta.json();
    })
    .then(function (produtos) {
      localStorage.setItem(chaveCache, JSON.stringify(produtos));
      localStorage.setItem(chaveTempo, String(tempoAgora));
      renderizarProdutos(produtos);
    })
    .catch(function () {
      produtosSection.innerHTML = '<p>Não foi possível carregar os produtos.</p>';
    });
});
