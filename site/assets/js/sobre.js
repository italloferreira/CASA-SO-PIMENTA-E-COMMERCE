/*menu hamburguer mobile*/

(function () {
    var btnHamburguer = document.getElementById('menu-hamburguer');
    var iconeMenu = document.getElementById('icone-menu');
    var menuMobile = document.getElementById('menu-mobile');
    var overlayMobile = document.getElementById('overlay-mobile');
    var btnProdutosNaturaisMobile = document.getElementById('btn-produtos-naturais-mobile');
    var submenuMobile = document.getElementById('submenu-mobile');

    if (!btnHamburguer) return;

    function abrirMenu() {
        menuMobile.classList.add('aberto');
        overlayMobile.classList.add('aberto');
        iconeMenu.src = '/site/imgs/icones/x.png';
        document.body.style.overflow = 'hidden';
    }

    function fecharMenu() {
        menuMobile.classList.remove('aberto');
        overlayMobile.classList.remove('aberto');
        iconeMenu.src = '/site/imgs/icones/menu.png';
        document.body.style.overflow = '';
    }

    btnHamburguer.addEventListener('click', function () {
        if (menuMobile.classList.contains('aberto')) {
            fecharMenu();
        } else {
            abrirMenu();
        }
    });

    overlayMobile.addEventListener('click', fecharMenu);

    if (btnProdutosNaturaisMobile) {
        btnProdutosNaturaisMobile.addEventListener('click', function () {
            submenuMobile.classList.toggle('aberto');
        });
    }

    var linksMenu = menuMobile.querySelectorAll('a');
    linksMenu.forEach(function (link) {
        link.addEventListener('click', fecharMenu);
    });
})();

/*menu dropdown desktop*/

const dropdown = document.querySelector('.dropdown');
const botao = document.querySelector('.dropdown-btn');

if (botao) {
    botao.addEventListener('click', function () {
        dropdown.classList.toggle('ativo');
    });

    document.addEventListener('click', function (e) {
        if (!dropdown.contains(e.target)) {
            dropdown.classList.remove('ativo');
        }
    });
}
