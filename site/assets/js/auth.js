document.addEventListener("DOMContentLoaded", function () {
  var usuarioSection = document.querySelector(".usuario-section");
  var mobileUsuario = document.querySelector(".menu-mobile-usuario");

  var userData = localStorage.getItem("csp_admin_user");

  if (userData) {
    var user = JSON.parse(userData);
    var primeiroNome = (user.name || user.email).split(" ")[0];

    if (usuarioSection) {
      usuarioSection.innerHTML = "<p>" + primeiroNome + "</p>";
      usuarioSection.setAttribute("href", "/site/pages/conta/index.html");
    }

    if (mobileUsuario) {
      mobileUsuario.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg> ' + primeiroNome;
      mobileUsuario.setAttribute("href", "/site/pages/conta/index.html");
    }
  } else {
    if (usuarioSection) {
      usuarioSection.innerHTML = '<img src="/site/imgs/icones/usuario.svg" alt=""><p>Login/Cadastrar</p>';
      usuarioSection.setAttribute("href", "/site/pages/login/index.html");
    }

    if (mobileUsuario) {
      mobileUsuario.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg> Login/Cadastrar';
      mobileUsuario.setAttribute("href", "/site/pages/login/index.html");
    }
  }
});