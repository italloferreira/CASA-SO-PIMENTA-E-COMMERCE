document.addEventListener("DOMContentLoaded", function () {
  var usuarioSection = document.querySelector(".usuario-section");
  var usuarioNome = document.getElementById("usuarioNome");
  var usuarioDropdown = document.getElementById("usuarioDropdown");
  var mobileUsuario = document.querySelector(".menu-mobile-usuario");

  var userData = localStorage.getItem("csp_admin_user");

  function fecharDropdown(e) {
    if (usuarioDropdown && !usuarioSection.contains(e.target)) {
      usuarioDropdown.classList.remove("ativo");
    }
  }

  if (userData) {
    var user = JSON.parse(userData);
    var primeiroNome = (user.name || user.email).split(" ")[0];

    /* Dropdown (páginas que têm a estrutura) */
    if (usuarioSection && usuarioDropdown) {
      if (usuarioNome) usuarioNome.textContent = primeiroNome;
      usuarioSection.addEventListener("click", function (e) {
        e.preventDefault();
        usuarioDropdown.classList.toggle("ativo");
      });
      document.addEventListener("click", fecharDropdown);

      var btnSair = document.getElementById("btnSair");
      if (btnSair) {
        btnSair.addEventListener("click", function () {
          localStorage.removeItem("csp_admin_user");
          window.location.href = "/site/pages/login/index.html";
        });
      }
    } else if (usuarioSection) {
      /* Padrão (sem dropdown) */
      usuarioSection.innerHTML = "<p>" + primeiroNome + "</p>";
      usuarioSection.setAttribute("href", "/site/pages/conta/index.html");
    }

    if (mobileUsuario) {
      mobileUsuario.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg> ' + primeiroNome;
      mobileUsuario.setAttribute("href", "/site/pages/conta/index.html");
    }
  } else {
    if (usuarioSection && !usuarioDropdown) {
      usuarioSection.innerHTML = '<img src="/site/imgs/icones/usuario.svg" alt=""><p>Login/Cadastrar</p>';
      usuarioSection.setAttribute("href", "/site/pages/login/index.html");
    } else if (usuarioSection) {
      if (usuarioNome) usuarioNome.textContent = "Login/Cadastrar";
      usuarioSection.setAttribute("href", "/site/pages/login/index.html");
    }

    if (mobileUsuario) {
      mobileUsuario.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg> Login/Cadastrar';
      mobileUsuario.setAttribute("href", "/site/pages/login/index.html");
    }
  }
});