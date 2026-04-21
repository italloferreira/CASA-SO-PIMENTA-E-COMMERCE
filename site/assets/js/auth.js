/* auth.js — gerencia estado de login no header (todas as páginas) */

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
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

document.addEventListener("DOMContentLoaded", function () {
  const usuarioSection = document.querySelector(".usuario-section");
  if (!usuarioSection) return;

  onAuthStateChanged(auth, user => {
    if (user) {
      /* logado — mostra nome e botão de sair */
      const primeiroNome = (user.displayName || user.email).split(" ")[0];
      usuarioSection.innerHTML = `
        <img src="/site/imgs/icones/usuario.svg" alt="">
        <p>${primeiroNome}</p>
        <button id="btnLogout" style="
          background: transparent;
          border: none;
          cursor: pointer;
          font-family: inherit;
          font-size: 13px;
          color: #c53b22;
          padding: 0;
          margin-left: 4px;
        ">(Sair)</button>
      `;
      usuarioSection.removeAttribute("href");
      usuarioSection.style.cursor = "default";

      document.getElementById("btnLogout").addEventListener("click", function (e) {
        e.preventDefault();
        signOut(auth).then(() => {
          window.location.reload();
        });
      });

    } else {
      /* deslogado — volta ao padrão */
      usuarioSection.innerHTML = `
        <img src="/site/imgs/icones/usuario.svg" alt="">
        <p>Login/Cadastrar</p>
      `;
      usuarioSection.setAttribute("href", "/site/pages/login/index.html");
    }
  });
});