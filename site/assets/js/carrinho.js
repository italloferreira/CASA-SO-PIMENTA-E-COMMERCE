/* carrinho.js — carrinho local + checkout via API */

var API = window.API_BASE_URL || 'http://localhost:3333';

window.disponibilidadeCache = {};

window.carregarDisponibilidade = function (callback) {
  var carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];
  var ids = carrinho.filter(function (i) { return i.tipo !== 'kit'; }).map(function (i) { return i.id; });

  if (ids.length === 0) {
    if (callback) callback();
    return;
  }

  fetch(API + '/api/products/status?ids=' + ids.join(','))
    .then(function (r) { return r.json(); })
    .then(function (data) {
      window.disponibilidadeCache = data;
      if (callback) callback();
    })
    .catch(function () {
      if (callback) callback();
    });
};

function estaDisponivel(item) {
  if (item.tipo === 'kit') return true;
  var status = window.disponibilidadeCache[String(item.id)];
  if (!status) return true;
  return status.stock > 0 && status.is_active !== 0;
}

function getDadosUsuario() {
  var data = localStorage.getItem('csp_admin_user');
  return data ? JSON.parse(data) : null;
}

/* ── Helpers local ── */
function salvarCarrinho(carrinho) {
  localStorage.setItem('carrinho', JSON.stringify(carrinho));
}

/* ── Drawer do carrinho ── */
const abrirCarrinho   = document.getElementById('abrirCarrinho');
const fecharCarrinho  = document.getElementById('fecharCarrinho');
const campoCarrinho   = document.getElementById('campoCarrinho');
const carrinhoOverlay = document.getElementById('carrinhoOverlay');

if (abrirCarrinho) {
  abrirCarrinho.addEventListener('click', function (e) {
    e.preventDefault();
    campoCarrinho.classList.add('ativo');
    carrinhoOverlay.classList.add('ativo');
    document.body.style.overflow = 'hidden';

    if (!getDadosUsuario()) {
      var rodape = document.getElementById('carrinhoRodape');
      if (rodape) rodape.style.display = 'none';
      document.getElementById('produtoCarrinho').innerHTML =
        '<div class="carrinho-login-aviso">' +
          '<p>Faça login para acessar seu carrinho.</p>' +
          '<a href="/site/pages/login/index.html" class="btn-carrinho-login">Entrar / Cadastrar</a>' +
        '</div>';
    } else {
      var rodape = document.getElementById('carrinhoRodape');
      if (rodape) rodape.style.display = '';
      renderizarCarrinho();
      carregarDisponibilidade(function () { renderizarCarrinho(); });
    }
  });
}

if (fecharCarrinho) {
  fecharCarrinho.addEventListener('click', function () {
    campoCarrinho.classList.remove('ativo');
    carrinhoOverlay.classList.remove('ativo');
    document.body.style.overflow = 'auto';
  });
}

if (carrinhoOverlay) {
  carrinhoOverlay.addEventListener('click', function () {
    campoCarrinho.classList.remove('ativo');
    carrinhoOverlay.classList.remove('ativo');
    document.body.style.overflow = 'auto';
  });
}

/* ── Finalizar pedido ── */
function finalizarPedido() {
  const carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];

  if (carrinho.length === 0) {
    alert('Seu carrinho está vazio.');
    return;
  }

  const usuario = getDadosUsuario();

  if (!usuario) {
    window.location.href = '/site/pages/login/index.html?redirect=checkout';
    return;
  }

  window.location.href = '/site/pages/checkout/index.html';
}

/* ── Funções do carrinho ── */
window.addCarrinho = function (produto) {
  let carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];
  const existente = carrinho.find(item => item.id == produto.id);

  if (existente) {
    existente.quantidade += 1;
  } else {
    carrinho.push({
      id: produto.id,
      nome: produto.nome,
      valor: Number(produto.valor),
      img: produto.img,
      quantidade: 1,
      tipo: produto.tipo || 'produto'
    });
  }

  salvarCarrinho(carrinho);
  renderizarCarrinho();
  atualizarBadgeCarrinho();
};

window.aumentarQuantidade = function (id) {
  let carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];
  const item = carrinho.find(p => p.id == id);
  if (item) item.quantidade += 1;
  salvarCarrinho(carrinho);
  renderizarCarrinho();
};

window.diminuirQuantidade = function (id) {
  let carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];
  const item = carrinho.find(p => p.id == id);
  if (item) {
    item.quantidade -= 1;
    if (item.quantidade <= 0) carrinho = carrinho.filter(p => p.id != id);
  }
  salvarCarrinho(carrinho);
  renderizarCarrinho();
};

window.removerDoCarrinho = function (id) {
  let carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];
  carrinho = carrinho.filter(item => item.id != id);
  salvarCarrinho(carrinho);
  renderizarCarrinho();
  atualizarBadgeCarrinho();
};

window.renderizarCarrinho = function () {
  const produtoCarrinho = document.getElementById('produtoCarrinho');
  const totalCarrinho   = document.getElementById('totalCarrinho');

  if (!produtoCarrinho || !totalCarrinho) return;

  const carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];

  produtoCarrinho.innerHTML = '';

  if (carrinho.length === 0) {
    produtoCarrinho.innerHTML = '<p class="carrinho-vazio">Seu carrinho está vazio.</p>';
    totalCarrinho.textContent = 'R$ 0,00';
    return;
  }

  let totalGeral = 0;

  carrinho.forEach(function (item) {
    const valor = Number(item.valor);
    const subtotalNumero = valor * item.quantidade;
    totalGeral += subtotalNumero;

    const valorFormatado = valor.toFixed(2).replace('.', ',');
    const subtotal = subtotalNumero.toFixed(2).replace('.', ',');
    const disponivel = estaDisponivel(item);

    produtoCarrinho.innerHTML += `
      <div class="item-carrinho${disponivel ? '' : ' item-carrinho-indisponivel'}">
        ${disponivel ? '' : '<div class="overlay-indisponivel-carrinho"><span>Indisponível</span></div>'}
        <div class="item-carrinho-img">
          <img src="${item.img}" alt="${item.nome}">
        </div>
        <div class="item-carrinho-info">
          <h3>${item.nome}</h3>
          <p>R$ ${valorFormatado}</p>
          <div class="controle-qtd">
            <button onclick="diminuirQuantidade('${item.id}')"${disponivel ? '' : ' disabled'}>-</button>
            <span>${item.quantidade}</span>
            <button onclick="aumentarQuantidade('${item.id}')"${disponivel ? '' : ' disabled'}>+</button>
          </div>
          <p>Subtotal: R$ ${subtotal}</p>
          <button onclick="removerDoCarrinho('${item.id}')">
            <img class="removerImg" src="/site/imgs/icones/lixo.png">
          </button>
        </div>
      </div>
    `;
  });

  totalCarrinho.textContent = 'R$ ' + totalGeral.toFixed(2).replace('.', ',');
};

window.atualizarBadgeCarrinho = function () {
  const badge = document.getElementById('badgeCarrinho');
  if (!badge) return;
  const carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];
  let totalItens = 0;

  if (carrinho.length === 0) {
    badge.style.display = 'none';
  } else {
    badge.style.display = 'flex';
    carrinho.forEach(item => { totalItens += item.quantidade; });
    badge.textContent = totalItens;
  }
};

/* ── Inicialização ── */
document.addEventListener('DOMContentLoaded', function () {
  renderizarCarrinho();
  atualizarBadgeCarrinho();
  carregarDisponibilidade(function () { renderizarCarrinho(); });

  const btnFinalizar = document.getElementById('btnFinalizarPedido');
  if (btnFinalizar) {
    btnFinalizar.addEventListener('click', finalizarPedido);
  }
});

window.salvarCarrinho = salvarCarrinho;