window.toggleForm = function () {
  document.getElementById("login").classList.toggle("ativo");
  document.getElementById("cadastro").classList.toggle("ativo");
  limparErros();
};

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

document.addEventListener("DOMContentLoaded", function () {
  const btnLogin    = document.querySelector("#login .btn");
  const btnCadastro = document.querySelector("#cadastro .btn");
  const botoesGoogle = document.querySelectorAll(".btn-google");

  /* LOGIN EMAIL/SENHA */
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

    fetch("http://localhost:3333/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: senha })
    })
    .then(function (res) {
      if (!res.ok) {
        if (res.status === 401) throw new Error("E-mail ou senha incorretos.");
        throw new Error("Servidor indisponível. Tente novamente.");
      }
      return res.json();
    })
    .then(function (data) {
      localStorage.setItem("csp_admin_token", data.token);
      localStorage.setItem("csp_admin_user", JSON.stringify(data.user));
      if (data.user.role === "admin") {
        window.location.href = "/site/pages/admin/index.html";
      } else {
        window.location.href = "/site/pages/index.html";
      }
    })
    .catch(function (err) {
      mostrarErro("login", err.message);
    })
    .finally(function () {
      btnLogin.textContent = "Entrar";
      btnLogin.disabled = false;
    });
  });

  /* CADASTRO */
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
      mostrarErro("cadastro", "As senhas não conferem.");
      return;
    }

    btnCadastro.textContent = "Cadastrando...";
    btnCadastro.disabled = true;

    fetch("http://localhost:3333/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nome, email, password: senha })
    })
    .then(function (res) {
      if (!res.ok) {
        if (res.status === 400) throw new Error("Este email já está cadastrado.");
        throw new Error("Servidor indisponível. Tente novamente.");
      }
      return res.json();
    })
    .then(function () {
      mostrarErro("cadastro", "Conta criada com sucesso! Faça login.");
      document.getElementById("nome").value = "";
      document.getElementById("cadEmail").value = "";
      document.getElementById("cadSenha").value = "";
      document.getElementById("confirmarSenha").value = "";
      setTimeout(function () { toggleForm(); }, 1500);
    })
    .catch(function (err) {
      mostrarErro("cadastro", err.message);
    })
    .finally(function () {
      btnCadastro.textContent = "Cadastrar";
      btnCadastro.disabled = false;
    });
  });

  /* GOOGLE OAUTH */
  botoesGoogle.forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      import("https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js")
        .then(function (mod) {
          const provider = new mod.GoogleAuthProvider();
          return mod.signInWithPopup(mod.getAuth(), provider);
        })
        .then(function () {
          window.location.href = "/site/pages/index.html";
        })
        .catch(function () {
          const ativa = document.querySelector(".campos.ativo");
          mostrarErro(ativa ? ativa.id : "login", "Erro ao entrar com Google.");
        });
    });
  });
});