document.addEventListener('DOMContentLoaded', function () {

  /* ===== CARROSSEL ===== */

  const slidesContainer = document.getElementById('slides');
  const btnAnterior = document.getElementById('anterior');
  const btnProximo = document.getElementById('proximo');

  if (slidesContainer && btnAnterior && btnProximo) {
    let slideAtual = 0;
    let totalSlides = 0;

    function atualizarCarrossel() {
      slidesContainer.style.transform = 'translateX(-' + (slideAtual * 100) + '%)';
    }

    fetch('http://localhost:3333/api/banners')
      .then(function (resposta) { return resposta.json(); })
      .then(function (banners) {
        totalSlides = banners.length;

        if (totalSlides === 0) {
          slidesContainer.innerHTML = '<div class="slide"><p style="padding:2rem;text-align:center;">Em breve</p></div>';
          totalSlides = 1;
          atualizarCarrossel();
          return;
        }

        banners.forEach(function (banner, index) {
          slidesContainer.innerHTML += '<div class="slide"><img src="http://localhost:3333' + banner.image_url + '" alt="' + (banner.title || 'Slide ' + (index + 1)) + '"></div>';
        });

        atualizarCarrossel();
      })
      .catch(function () {
        slidesContainer.innerHTML = '<div class="slide"><p style="padding:2rem;text-align:center;">Carrossel indisponível no momento</p></div>';
        totalSlides = 1;
        atualizarCarrossel();
      });

    btnProximo.addEventListener('click', function () {
      if (totalSlides === 0) return;
      slideAtual++;
      if (slideAtual >= totalSlides) slideAtual = 0;
      atualizarCarrossel();
    });

    btnAnterior.addEventListener('click', function () {
      if (totalSlides === 0) return;
      slideAtual--;
      if (slideAtual < 0) slideAtual = totalSlides - 1;
      atualizarCarrossel();
    });
  }

  /* ===== KITS ===== */

  const cartoesSection = document.getElementById('cartoes-section');

  if (cartoesSection) {
    fetch('http://localhost:3333/api/kits')
      .then(function (resposta) { return resposta.json(); })
      .then(function (kits) {
        if (kits.length === 0) {
          cartoesSection.innerHTML = '<p class="fallback-msg">Produtos em breve</p>';
          return;
        }

        kits.forEach(function (kit) {
          const valorFormatado = Number(kit.price).toFixed(2).replace('.', ',');
          const imgSrc = kit.image_url
            ? 'http://localhost:3333' + kit.image_url
            : '/site/imgs/logo.jpeg';

          cartoesSection.innerHTML += '<div class="cartao">' +
            '<img class="cartao-img" src="' + imgSrc + '" alt="' + kit.name + '">' +
            '<h1 class="cartao-h1">' + kit.name + '</h1>' +
            '<div class="cartao-valor"><p>R$</p><h3>' + valorFormatado + '</h3></div>' +
            '<div class="cartao-ingredientes"><h1>Descrição</h1><p>' + (kit.description || '') + '</p></div>' +
            '</div>';
        });
      })
      .catch(function () {
        cartoesSection.innerHTML = '<p class="fallback-msg">Produtos em breve</p>';
      });
  }

});
