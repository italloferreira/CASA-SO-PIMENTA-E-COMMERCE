/* produto.js — página de detalhe do produto */

document.addEventListener('DOMContentLoaded', function () {
  const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxfFXuucaeoyeuldS2XKsfoZYtcmLmRyctnDbKhDWNr1sDA-spHwo59hvKlDKw96xvp/exec';

  const params = new URLSearchParams(window.location.search);
  const produtoId = params.get('id');
  const categoria = params.get('categoria');

  const container = document.getElementById('produto-detalhe');

  if (!produtoId || !categoria) {
    container.innerHTML = '<p class="erro-produto">Produto não encontrado.</p>';
    return;
  }

  function renderizarProduto(produto) {
    const valorFormatado = Number(produto.valor).toFixed(2).replace('.', ',');
    document.title = `Casa Só Pimenta / ${produto.nome}`;

    container.innerHTML = `
      <div class="produto-detalhe-card">
        <div class="produto-detalhe-img">
          <img src="${produto.img}" alt="${produto.nome}">
        </div>

        <div class="produto-detalhe-info">
          <span class="produto-categoria">${categoria}</span>
          <h1>${produto.nome}</h1>

          <p class="produto-preco">R$ ${valorFormatado}</p>

          <div class="produto-descricao">
            <h3>Descrição</h3>
            <p>${produto.descricao || 'Produto natural de alta qualidade, selecionado com cuidado pela Casa Só Pimenta.'}</p>
          </div>

          ${produto.ingredientes && produto.ingredientes.length > 0 ? `
          <div class="produto-ingredientes">
            <h3>Ingredientes</h3>
            <ul>
              ${produto.ingredientes.map(ing => `<li>${ing}</li>`).join('')}
            </ul>
          </div>
          ` : ''}

          <div class="produto-acoes">
            <div class="produto-quantidade">
              <button onclick="decrementarQtd()">−</button>
              <span id="qtdSelecionada">1</span>
              <button onclick="incrementarQtd()">+</button>
            </div>

            <button class="btn-add-carrinho" onclick="adicionarAoCarrinhoDetalhe()">
              <img src="/site/imgs/icones/carrinho.png" alt="Carrinho">
              Adicionar ao carrinho
            </button>
          </div>

          <a href="javascript:history.back()" class="btn-voltar">← Voltar</a>
        </div>
      </div>
    `;

    /* guarda produto no escopo global para usar nos botões */
    window._produtoAtual = produto;
  }

  function carregarProduto(lista) {
    const produto = lista.find(p => String(p.id) === String(produtoId));
    if (!produto) {
      container.innerHTML = '<p class="erro-produto">Produto não encontrado.</p>';
      return;
    }
    renderizarProduto(produto);
  }

  /* tenta cache primeiro */
  const chaveCache = `produtos_${categoria}`;
  const chaveTempo = `produtos_${categoria}_tempo`;
  const tempoAgora = Date.now();
  const tempoValidade = 5 * 60 * 1000;

  const cacheSalvo = localStorage.getItem(chaveCache);
  const tempoSalvo = localStorage.getItem(chaveTempo);

  if (cacheSalvo && tempoSalvo && (tempoAgora - Number(tempoSalvo) < tempoValidade)) {
    const dados = JSON.parse(cacheSalvo);
    carregarProduto(dados.produtos);
    return;
  }

  container.innerHTML = '<p class="carregando-produto">Carregando produto...</p>';

  fetch(`${WEB_APP_URL}?categoria=${encodeURIComponent(categoria)}`)
    .then(r => r.json())
    .then(dados => {
      localStorage.setItem(chaveCache, JSON.stringify(dados));
      localStorage.setItem(chaveTempo, String(tempoAgora));
      carregarProduto(dados.produtos);
    })
    .catch(err => {
      console.error('Erro ao carregar produto:', err);
      container.innerHTML = '<p class="erro-produto">Não foi possível carregar o produto.</p>';
    });
});

/* controle de quantidade */
window.incrementarQtd = function () {
  const el = document.getElementById('qtdSelecionada');
  el.textContent = Number(el.textContent) + 1;
};

window.decrementarQtd = function () {
  const el = document.getElementById('qtdSelecionada');
  const atual = Number(el.textContent);
  if (atual > 1) el.textContent = atual - 1;
};

window.adicionarAoCarrinhoDetalhe = function () {
  const produto = window._produtoAtual;
  if (!produto) return;

  const qtd = Number(document.getElementById('qtdSelecionada').textContent);

  let carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];
  const existente = carrinho.find(item => item.id == produto.id);

  if (existente) {
    existente.quantidade += qtd;
  } else {
    carrinho.push({
      id: produto.id,
      nome: produto.nome,
      valor: Number(produto.valor),
      img: produto.img,
      quantidade: qtd
    });
  }

  localStorage.setItem('carrinho', JSON.stringify(carrinho));
  atualizarBadgeCarrinho();

  /* feedback visual */
  const btn = document.querySelector('.btn-add-carrinho');
  const textoOriginal = btn.innerHTML;
  btn.innerHTML = '✓ Adicionado!';
  btn.style.background = '#2e7d32';
  btn.style.color = 'white';
  setTimeout(() => {
    btn.innerHTML = textoOriginal;
    btn.style.background = '';
    btn.style.color = '';
  }, 1500);
};
