/* login.js — autenticação com Firebase */

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

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

/* ── Alterna entre login e cadastro ── */
window.toggleForm = function () {
  document.getElementById("login").classList.toggle("ativo");
  document.getElementById("cadastro").classList.toggle("ativo");
  limparErros();
};

/* ── Mostra mensagem de erro na tela ── */
function mostrarErro(secaoId, mensagem) {
  const secao = document.getElementById(secaoId);
  let erroEl = secao.querySelector(".erro-msg");
  if (!erroEl) {
    erroEl = document.createElement("p");
    erroEl.className = "erro-msg";
    secao.querySelector("form").appendChild(erroEl);
  }
  erroEl.textContent = mensagem;
}

function limparErros() {
  document.querySelectorAll(".erro-msg").forEach(el => el.textContent = "");
}

/* ── Traduz erros do Firebase para português ── */
function traduzirErro(code) {
  const erros = {
    "auth/invalid-email": "Email inválido.",
    "auth/user-not-found": "Nenhuma conta encontrada com esse email.",
    "auth/wrong-password": "Senha incorreta.",
    "auth/email-already-in-use": "Esse email já está cadastrado.",
    "auth/weak-password": "A senha precisa ter pelo menos 6 caracteres.",
    "auth/too-many-requests": "Muitas tentativas. Tente novamente mais tarde.",
    "auth/invalid-credential": "Email ou senha incorretos.",
  };
  return erros[code] || "Ocorreu um erro. Tente novamente.";
}

/* ── LOGIN ── */
document.addEventListener("DOMContentLoaded", function () {
  const btnLogin = document.querySelector("#login .btn");
  const btnCadastro = document.querySelector("#cadastro .btn");

  btnLogin.addEventListener("click", function (e) {
    e.preventDefault();
    limparErros();

    const email = document.getElementById("loginEmail").value.trim();
    const senha = document.getElementById("loginSenha").value;

    if (!email || !senha) {
      mostrarErro("login", "Preencha todos os campos.");
      return;
    }

    btnLogin.textContent = "Entrando...";
    btnLogin.disabled = true;

    signInWithEmailAndPassword(auth, email, senha)
      .then(() => {
        window.location.href = "/site/pages/index.html";
      })
      .catch(err => {
        mostrarErro("login", traduzirErro(err.code));
        btnLogin.textContent = "Entrar";
        btnLogin.disabled = false;
      });
  });

  /* ── CADASTRO ── */
  btnCadastro.addEventListener("click", function (e) {
    e.preventDefault();
    limparErros();

    const nome = document.getElementById("nome").value.trim();
    const email = document.getElementById("cadEmail").value.trim();
    const senha = document.getElementById("cadSenha").value;
    const confirmar = document.getElementById("confirmarSenha").value;

    if (!nome || !email || !senha || !confirmar) {
      mostrarErro("cadastro", "Preencha todos os campos.");
      return;
    }

    if (senha !== confirmar) {
      mostrarErro("cadastro", "As senhas não coincidem.");
      return;
    }

    btnCadastro.textContent = "Cadastrando...";
    btnCadastro.disabled = true;

    createUserWithEmailAndPassword(auth, email, senha)
      .then(credencial => {
        return updateProfile(credencial.user, { displayName: nome });
      })
      .then(() => {
        window.location.href = "/site/pages/index.html";
      })
      .catch(err => {
        mostrarErro("cadastro", traduzirErro(err.code));
        btnCadastro.textContent = "Cadastrar";
        btnCadastro.disabled = false;
      });
  });

  /* ── Se já estiver logado, redireciona ── */
  onAuthStateChanged(auth, user => {
    if (user) {
      window.location.href = "/site/pages/index.html";
    }
  });
});