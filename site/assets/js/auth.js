document.addEventListener("DOMContentLoaded", function () {
  var usuarioSection = document.querySelector(".usuario-section");
  if (!usuarioSection) return;

  var userData = localStorage.getItem("csp_admin_user");

  if (userData) {
    var user = JSON.parse(userData);
    var primeiroNome = (user.name || user.email).split(" ")[0];
    usuarioSection.innerHTML = "<p>" + primeiroNome + "</p>";
    usuarioSection.setAttribute("href", "/site/pages/conta/index.html");
  } else {
    usuarioSection.innerHTML = '<img src="/site/imgs/icones/usuario.svg" alt=""><p>Login/Cadastrar</p>';
    usuarioSection.setAttribute("href", "/site/pages/login/index.html");
  }
});