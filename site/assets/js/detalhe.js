/* detalhe.js — página de detalhe do produto */

import { renderizarCarrinho, atualizarBadgeCarrinho, salvarCarrinho } from './carrinho.js';

document.addEventListener('DOMContentLoaded', function () {
  const params = new URLSearchParams(window.location.search);
  const produtoId = params.get('id');
  const categoria = params.get('categoria');

  const container = document.getElementById('produto-detalhe');

  if (!produtoId) {
    container.innerHTML = '<p class="erro-produto">Produto não encontrado.</p>';
    return;
  }

  function renderizarProduto(produto) {
    const valorFormatado = Number(produto.price).toFixed(2).replace('.', ',');
    document.title = 'Casa Só Pimenta / ' + produto.name;

    const imgSrc = produto.image_url
      ? 'http://localhost:3333' + produto.image_url
      : '/site/imgs/logo.jpeg';

    const ingredientes = produto.ingredients
      ? produto.ingredients.split(',').map(function (i) { return i.trim(); })
      : [];

    container.innerHTML = `
      <div class="produto-detalhe-card">
        <div class="produto-detalhe-img">
          <img src="${imgSrc}" alt="${produto.name}">
        </div>

        <div class="produto-detalhe-info">
          <span class="produto-categoria">${produto.category_name || categoria}</span>
          <h1>${produto.name}</h1>

          <p class="produto-preco">R$ ${valorFormatado}</p>

          <div class="produto-descricao">
            <h3>Descrição</h3>
            <p>${produto.description || 'Produto natural de alta qualidade, selecionado com cuidado pela Casa Só Pimenta.'}</p>
          </div>

          ${ingredientes.length > 0 ? `
          <div class="produto-ingredientes">
            <h3>Ingredientes</h3>
            <ul>
              ${ingredientes.map(function (ing) { return '<li>' + ing + '</li>'; }).join('')}
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

    window._produtoAtual = {
      id: produto.id,
      nome: produto.name,
      valor: produto.price,
      img: imgSrc
    };
  }

  const chaveCache = 'produto_' + produtoId + '_cache';
  const chaveTempo = 'produto_' + produtoId + '_timestamp';
  const tempoAgora = Date.now();
  const tempoValidade = 5 * 60 * 1000;

  const cacheSalvo = localStorage.getItem(chaveCache);
  const tempoSalvo = localStorage.getItem(chaveTempo);

  if (cacheSalvo && tempoSalvo && (tempoAgora - Number(tempoSalvo) < tempoValidade)) {
    renderizarProduto(JSON.parse(cacheSalvo));
    return;
  }

  container.innerHTML = '<p class="carregando-produto">Carregando produto...</p>';

  fetch('http://localhost:3333/api/products/' + produtoId)
    .then(function (r) { return r.json(); })
    .then(function (produto) {
      localStorage.setItem(chaveCache, JSON.stringify(produto));
      localStorage.setItem(chaveTempo, String(tempoAgora));
      renderizarProduto(produto);
    })
    .catch(function () {
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
      valor: produto.valor,
      img: produto.img,
      quantidade: qtd
    });
  }

  salvarCarrinho(carrinho);
  renderizarCarrinho();
  atualizarBadgeCarrinho();

  const btn = document.querySelector('.btn-add-carrinho');
  const textoOriginal = btn.innerHTML;
  btn.innerHTML = '✓ Adicionado!';
  btn.style.background = '#2e7d32';
  btn.style.color = 'white';
  setTimeout(function () {
    btn.innerHTML = textoOriginal;
    btn.style.background = '';
    btn.style.color = '';
  }, 1500);
};
