/*produtos*/

document.addEventListener('DOMContentLoaded', function () {
  const produtosSection = document.querySelector('.produtos-section');
  if (!produtosSection) return;

  const categoria = produtosSection.dataset.categoria;
  const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxfFXuucaeoyeuldS2XKsfoZYtcmLmRyctnDbKhDWNr1sDA-spHwo59hvKlDKw96xvp/exec';

  const chaveCache = `produtos_${categoria}`;
  const chaveTempo = `produtos_${categoria}_tempo`;
  const tempoAgora = Date.now();
  const tempoValidade = 5 * 60 * 1000;

  function renderizarProdutos(produtos) {
    produtosSection.innerHTML = '';

    produtos.forEach(function (produto) {
      const valorFormatado = Number(produto.valor).toFixed(2).replace('.', ',');

      produtosSection.innerHTML += `
        <div class="cartao">
          <img src="${produto.img}" alt="${produto.nome}" loading="lazy">
          <h3>${produto.nome}</h3>
          <p>R$ ${valorFormatado}</p>
          <div>
            <button onclick='addCarrinho(${JSON.stringify(produto)})'>
              <img src="/site/imgs/icones/carrinho.png" alt="Adicionar ao carrinho">
            </button>
            <button>Ver produto</button>
          </div>
        </div>
      `;
    });
  }

  const cacheSalvo = localStorage.getItem(chaveCache);
  const tempoSalvo = localStorage.getItem(chaveTempo);

  if (cacheSalvo && tempoSalvo && (tempoAgora - Number(tempoSalvo) < tempoValidade)) {
    const dados = JSON.parse(cacheSalvo);
    renderizarProdutos(dados.produtos);
    return;
  }

  produtosSection.innerHTML = '<p>Carregando produtos...</p>';

  fetch(`${WEB_APP_URL}?categoria=${encodeURIComponent(categoria)}`)
    .then(function (resposta) {
      return resposta.json();
    })
    .then(function (dados) {
      localStorage.setItem(chaveCache, JSON.stringify(dados));
      localStorage.setItem(chaveTempo, String(tempoAgora));
      renderizarProdutos(dados.produtos);
    })
    .catch(function (erro) {
      console.error('Erro ao carregar produtos:', erro);
      produtosSection.innerHTML = '<p>Não foi possível carregar os produtos.</p>';
    });
});