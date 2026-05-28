/* conta.js — página de conta do usuário */

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

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
const googleProvider = new GoogleAuthProvider();

export async function getUserProfile(uid) {
  try {
    const snap = await getDoc(doc(db, 'usuarios', uid));
    if (snap.exists()) {
      return snap.data();
    }
  } catch {
    /* falha silenciosa */
  }
  return {
    nome: '',
    telefone: '',
    cep: '',
    endereco: '',
    cidade: '',
    estado: '',
    bairro: '',
    email: ''
  };
}

/* ── Formata CEP enquanto digita ── */
function formatarCEP(valor) {
  return valor.replace(/\D/g, '').slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2');
}

/* ── Formata telefone enquanto digita ── */
function formatarTelefone(valor) {
  const nums = valor.replace(/\D/g, '').slice(0, 11);
  if (nums.length <= 10) {
    return nums.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').trim();
  }
  return nums.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').trim();
}

/* ── Busca endereço pelo CEP ── */
async function buscarCEP(cep) {
  const nums = cep.replace(/\D/g, '');
  if (nums.length !== 8) return;

  const infoEl = document.getElementById('infoCep');
  infoEl.textContent = 'Buscando...';

  try {
    const res = await fetch(`https://viacep.com.br/ws/${nums}/json/`);
    const data = await res.json();

    if (data.erro) {
      infoEl.textContent = 'CEP não encontrado.';
      infoEl.style.color = '#c53b22';
    } else {
      const endereco = data.logradouro || '';
      const bairro = data.bairro || '';
      const cidade = data.localidade || '';
      const estado = data.uf || '';

      infoEl.textContent = `${endereco ? endereco + ', ' : ''}${bairro ? bairro + ' — ' : ''}${cidade}/${estado}`;
      infoEl.style.color = '#555';

      if (document.getElementById('endereco')) document.getElementById('endereco').value = endereco;
      if (document.getElementById('bairro')) document.getElementById('bairro').value = bairro;
      if (document.getElementById('cidade')) document.getElementById('cidade').value = cidade;
      if (document.getElementById('estado')) document.getElementById('estado').value = estado;
    }
  } catch {
    infoEl.textContent = '';
  }
}

document.addEventListener('DOMContentLoaded', function () {

  /* ── Máscaras nos inputs ── */
  const inputTel = document.getElementById('telefone');
  const inputCep = document.getElementById('cep');

  inputTel.addEventListener('input', function () {
    this.value = formatarTelefone(this.value);
  });

  inputCep.addEventListener('input', function () {
    this.value = formatarCEP(this.value);
    if (this.value.replace(/\D/g, '').length === 8) {
      buscarCEP(this.value);
    } else {
      document.getElementById('infoCep').textContent = '';
    }
  });

  /* ── Observa estado de autenticação ── */
  onAuthStateChanged(auth, async function (user) {
    if (!user) {
      window.location.href = '/site/pages/login/index.html';
      return;
    }

    /* Preenche nome e email (vindo do Auth) */
    document.getElementById('nomeUsuario').textContent = user.displayName || 'Usuário';
    document.getElementById('emailUsuario').textContent = user.email;
    document.getElementById('inputNome').value = user.displayName || '';
    document.getElementById('email').value = user.email;

    const avatar = document.getElementById('contaAvatar');
    if (avatar) avatar.remove();

    /* Busca dados extras no Firestore */
    try {
      const snap = await getDoc(doc(db, 'usuarios', user.uid));
      if (snap.exists()) {
        const dados = snap.data();
        if (dados.telefone) inputTel.value = dados.telefone;
        if (dados.cep) {
          inputCep.value = dados.cep;
          buscarCEP(dados.cep);
        }
        if (dados.endereco && document.getElementById('endereco')) document.getElementById('endereco').value = dados.endereco;
        if (dados.bairro && document.getElementById('bairro')) document.getElementById('bairro').value = dados.bairro;
        if (dados.cidade && document.getElementById('cidade')) document.getElementById('cidade').value = dados.cidade;
        if (dados.estado && document.getElementById('estado')) document.getElementById('estado').value = dados.estado;
      }
      } catch {
        /* falha silenciosa */
      }

    /* ── Salvar alterações ── */
    document.getElementById('btnSalvar').addEventListener('click', async function () {
      const novoNome = document.getElementById('inputNome').value.trim();
      const telefone = inputTel.value.trim();
      const cep      = inputCep.value.trim();
      const endereco = document.getElementById('endereco') ? document.getElementById('endereco').value.trim() : '';
      const bairro   = document.getElementById('bairro') ? document.getElementById('bairro').value.trim() : '';
      const cidade   = document.getElementById('cidade') ? document.getElementById('cidade').value.trim() : '';
      const estado   = document.getElementById('estado') ? document.getElementById('estado').value.trim() : '';
      const msgEl    = document.getElementById('msgSalvar');

      if (!novoNome) {
        msgEl.textContent = 'O nome não pode ficar vazio.';
        msgEl.style.color = '#c53b22';
        return;
      }

      this.textContent = 'Salvando...';
      this.disabled = true;

      try {
        await updateProfile(user, { displayName: novoNome });

        await setDoc(doc(db, 'usuarios', user.uid), {
          nome: novoNome,
          telefone,
          cep,
          endereco,
          bairro,
          cidade,
          estado,
          email: user.email
        }, { merge: true });

        document.getElementById('nomeUsuario').textContent = novoNome;
        msgEl.textContent = '✓ Dados salvos com sucesso!';
        msgEl.style.color = '#2e7d32';
      } catch {
        msgEl.textContent = 'Erro ao salvar. Tente novamente.';
        msgEl.style.color = '#c53b22';
      }

      this.textContent = 'Salvar alterações';
      this.disabled = false;

      setTimeout(function () { msgEl.textContent = ''; }, 3000);
    });

    /* ── Trocar conta (Google) ── */
    document.getElementById('btnTrocarConta').addEventListener('click', function () {
      signOut(auth).then(function () {
        signInWithPopup(auth, googleProvider)
          .then(function () { window.location.href = '/site/pages/conta/index.html'; })
          .catch(function () { window.location.href = '/site/pages/login/index.html'; });
      });
    });

    /* ── Sair da conta ── */
    document.getElementById('btnSair').addEventListener('click', function () {
      signOut(auth).then(function () {
        window.location.href = '/site/pages/index.html';
      });
    });
  });
});
