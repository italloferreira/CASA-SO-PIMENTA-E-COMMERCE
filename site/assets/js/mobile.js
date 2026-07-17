document.addEventListener('DOMContentLoaded', function () {
  var btn = document.getElementById('menuHamburguer');
  var menu = document.getElementById('menuMobile');
  var overlay = document.getElementById('overlayMobile');
  var fechar = document.getElementById('menuFechar');

  function abrirMenu() {
    if (menu) menu.classList.add('ativo');
    if (overlay) overlay.classList.add('ativo');
    document.body.style.overflow = 'hidden';
  }

  function fecharMenu() {
    if (menu) menu.classList.remove('ativo');
    if (overlay) overlay.classList.remove('ativo');
    document.body.style.overflow = '';
  }

  if (btn) btn.addEventListener('click', abrirMenu);
  if (fechar) fechar.addEventListener('click', fecharMenu);
  if (overlay) overlay.addEventListener('click', fecharMenu);

  var dropdownBtns = document.querySelectorAll('.dropdown-mobile-btn');
  dropdownBtns.forEach(function (dbtn) {
    dbtn.addEventListener('click', function () {
      var li = dbtn.closest('.dropdown-mobile');
      if (li) li.classList.toggle('ativo');
    });
  });

  var menuLinks = menu ? menu.querySelectorAll('a') : [];
  menuLinks.forEach(function (link) {
    link.addEventListener('click', fecharMenu);
  });

  var resumoCol = document.querySelector('.checkout-resumo-col');
  if (resumoCol) {
    function atualizarResumoMobile() {
      if (window.innerWidth > 1000) {
        resumoCol.style.display = '';
        return;
      }
      var etapa3 = document.getElementById('etapa3');
      if (etapa3 && etapa3.classList.contains('ativo')) {
        resumoCol.style.display = '';
      } else {
        resumoCol.style.display = 'none';
      }
    }
    atualizarResumoMobile();
    window.addEventListener('resize', atualizarResumoMobile);
    var panels = document.querySelectorAll('.checkout-panel');
    panels.forEach(function (panel) {
      var obs = new MutationObserver(atualizarResumoMobile);
      obs.observe(panel, { attributes: true, attributeFilter: ['class'] });
    });
  }
});
