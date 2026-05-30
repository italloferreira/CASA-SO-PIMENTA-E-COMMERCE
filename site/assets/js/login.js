/* Alterna entre login e cadastro */
window.toggleForm = function () {
  document.getElementById("login").classList.toggle("ativo");
  document.getElementById("cadastro").classList.toggle("ativo");
  limparErros();
};

/* Mensagens de erro */
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

  /* LOGIN EMAIL/SENHA — autentica contra a API */
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
      window.location.href = "/site/pages/admin/index.html";
    })
    .catch(function (err) {
      mostrarErro("login", err.message);
    })
    .finally(function () {
      btnLogin.textContent = "Entrar";
      btnLogin.disabled = false;
    });
  });

  /* CADASTRO — desabilitado */
  btnCadastro.addEventListener("click", function (e) {
    e.preventDefault();
    mostrarErro("cadastro", "Cadastro disponível apenas pelo administrador.");
  });
});
