function formatPrice(val) {
  return Number(val).toFixed(2).replace('.', ',');
}

function precoVenda(prod) {
  return prod.compare_price || prod.price;
}

function renderProductCard(prod) {
  var imgSrc = imgUrl(prod.image_url);
  var venda = precoVenda(prod);
  var precoHtml = prod.compare_price
    ? '<p style="text-decoration:line-through;color:#999;font-size:14px;">R$ ' + formatPrice(prod.price) + '</p><h3 style="color:#c53b22;">R$ ' + formatPrice(venda) + '</h3>'
    : '<p>R$</p><h3>' + formatPrice(venda) + '</h3>';

  return '<div class="cartao">' +
    '<img class="cartao-img" src="' + imgSrc + '" alt="' + prod.name + '" onclick="window.location.href=\'/site/pages/produtos/detalhe/index.html?id=' + prod.id + '\'" style="cursor:pointer;">' +
    '<h1 class="cartao-h1">' + prod.name + '</h1>' +
    '<div class="cartao-valor">' + precoHtml + '</div>' +
    '<div class="conteiner-botões-kit">' +
      '<button class="add-carrinho-botao" onclick=\'addCarrinho(' + JSON.stringify({ id: prod.id, nome: prod.name, valor: venda, img: imgSrc, tipo: "produto" }) + ')\'><img src="/site/imgs/icones/carrinho.png" alt="Adicionar ao carrinho"></button>' +
      '<button class="ver-mais-botao" onclick="window.location.href=\'/site/pages/produtos/detalhe/index.html?id=' + prod.id + '\'">Ver mais</button>' +
    '</div>' +
    '</div>';
}

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

    fetch((window.API_BASE_URL || 'http://localhost:3333') + '/api/banners')
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
          slidesContainer.innerHTML += '<div class="slide"><img src="' + imgUrl(banner.image_url) + '" alt="' + (banner.title || 'Slide ' + (index + 1)) + '"></div>';
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

  /* ===== PRODUTOS EM DESTAQUE ===== */

  var destaquesSection = document.getElementById('destaques-section');

  if (destaquesSection) {
    fetch((window.API_BASE_URL || 'http://localhost:3333') + '/api/products?featured=true')
      .then(function (resposta) { return resposta.json(); })
      .then(function (produtos) {
        if (produtos.length === 0) {
          document.querySelector('.destaques-section').style.display = 'none';
          return;
        }

        produtos.forEach(function (prod) {
          destaquesSection.innerHTML += renderProductCard(prod);
        });
      })
      .catch(function () {
        document.querySelector('.destaques-section').style.display = 'none';
      });
  }

  /* ===== KITS ===== */

  const cartoesSection = document.getElementById('cartoes-section');

  if (cartoesSection) {
    fetch((window.API_BASE_URL || 'http://localhost:3333') + '/api/kits?active=true')
      .then(function (resposta) { return resposta.json(); })
      .then(function (kits) {
        if (kits.length === 0) {
          cartoesSection.innerHTML = '<p class="fallback-msg">Produtos em breve</p>';
          return;
        }

        kits.forEach(function (kit) {
          const valorFormatado = Number(kit.price).toFixed(2).replace('.', ',');
          const imgSrc = imgUrl(kit.image_url);

          var produtosHtml = '';
          if (kit.items && kit.items.length > 0) {
            produtosHtml = '<div class="cartao-produtos"><h1>Ingredientes</h1><ul>' +
              kit.items.map(function (item) { return '<li>' + (item.custom_name || 'Item') + '</li>'; }).join('') +
              '</ul></div>';
          }

          cartoesSection.innerHTML += '<div class="cartao">' +
            '<img class="cartao-img" src="' + imgSrc + '" alt="' + kit.name + '">' +
            '<h1 class="cartao-h1">' + kit.name + '</h1>' +
            '<div class="cartao-valor"><p>R$</p><h3>' + valorFormatado + '</h3></div>' +
            produtosHtml +
            '<div class = "conteiner-botões-kit">' +
              '<button class="add-carrinho-botao" onclick=\'addCarrinho(' + JSON.stringify({ id: kit.id, nome: kit.name, valor: kit.price, img: imgSrc, tipo: "kit" }) + ')\'><img src="/site/imgs/icones/carrinho.png" alt="Adicionar ao carrinho"></button>' +
              '<button class="ver-mais-botao" onclick="window.location.href=\'/site/pages/kits/detalhe/index.html?id=' + kit.id + '\'">Ver mais</button>' +
            '</div>' +
            '</div>';
        });
      })
      .catch(function () {
        cartoesSection.innerHTML = '<p class="fallback-msg">Produtos em breve</p>';
      });
  }

});
