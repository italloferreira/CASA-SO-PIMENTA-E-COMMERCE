/* carrinho.js — com sincronização no Firestore */

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAyj29lNCOxeXt0RFhFfDfJIy8AY9_-Wu4",
  authDomain: "bdcasasopimenta.firebaseapp.com",
  projectId: "bdcasasopimenta",
  storageBucket: "bdcasasopimenta.firebasestorage.app",
  messagingSenderId: "956041780013",
  appId: "1:956041780013:web:0a2f9f138118b3639dd1a4"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let usuarioAtual = null;

/* ── Sincroniza carrinho com Firestore ── */
async function salvarCarrinhoNuvem(carrinho) {
  if (!usuarioAtual) return;
  try {
    await setDoc(doc(db, 'usuarios', usuarioAtual.uid), { carrinho }, { merge: true });
  } catch (err) {
    console.error('Erro ao salvar carrinho:', err);
  }
}

async function carregarCarrinhoNuvem() {
  if (!usuarioAtual) return;
  try {
    const snap = await getDoc(doc(db, 'usuarios', usuarioAtual.uid));
    if (snap.exists() && snap.data().carrinho) {
      const carrinhoNuvem = snap.data().carrinho;
      localStorage.setItem('carrinho', JSON.stringify(carrinhoNuvem));
      renderizarCarrinho();
      atualizarBadgeCarrinho();
    }
  } catch (err) {
    console.error('Erro ao carregar carrinho:', err);
  }
}

/* Observa login/logout */
onAuthStateChanged(auth, async function (user) {
  usuarioAtual = user;
  if (user) {
    await carregarCarrinhoNuvem();
  }
});

/* ── Helpers locais + nuvem ── */
function salvarCarrinho(carrinho) {
  localStorage.setItem('carrinho', JSON.stringify(carrinho));
  salvarCarrinhoNuvem(carrinho);
}

/* ── Drawer do carrinho ── */
const abrirCarrinho   = document.getElementById('abrirCarrinho');
const fecharCarrinho  = document.getElementById('fecharCarrinho');
const campoCarrinho   = document.getElementById('campoCarrinho');
const carrinhoOverlay = document.getElementById('carrinhoOverlay');

abrirCarrinho.addEventListener('click', function (e) {
  e.preventDefault();
  campoCarrinho.classList.add('ativo');
  carrinhoOverlay.classList.add('ativo');
  document.body.style.overflow = 'hidden';
});

fecharCarrinho.addEventListener('click', function () {
  campoCarrinho.classList.remove('ativo');
  carrinhoOverlay.classList.remove('ativo');
  document.body.style.overflow = 'auto';
});

carrinhoOverlay.addEventListener('click', function () {
  campoCarrinho.classList.remove('ativo');
  carrinhoOverlay.classList.remove('ativo');
  document.body.style.overflow = 'auto';
});

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
      quantidade: 1
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

    produtoCarrinho.innerHTML += `
      <div class="item-carrinho">
        <div class="item-carrinho-img">
          <img src="${item.img}" alt="${item.nome}">
        </div>
        <div class="item-carrinho-info">
          <h3>${item.nome}</h3>
          <p>R$ ${valorFormatado}</p>
          <div class="controle-qtd">
            <button onclick="diminuirQuantidade('${item.id}')">-</button>
            <span>${item.quantidade}</span>
            <button onclick="aumentarQuantidade('${item.id}')">+</button>
          </div>
          <p>Subtotal: R$ ${subtotal}</p>
          <button onclick="removerDoCarrinho('${item.id}')">
            <img class="removerImg" src="/site/imgs/icones/lixo.png">
          </button>
        </div>
      </div>
    `;
  });

  totalCarrinho.textContent = `R$ ${totalGeral.toFixed(2).replace('.', ',')}`;
};

window.atualizarBadgeCarrinho = function () {
  const badge = document.getElementById('badgeCarrinho');
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

  document.getElementById('btnFinalizarPedido').addEventListener('click', function () {
    const carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];
    if (carrinho.length === 0) {
      alert('Seu carrinho está vazio.');
      return;
    }
    alert('Pedido finalizado!');
  });
});