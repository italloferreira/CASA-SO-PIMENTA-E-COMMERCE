function formatPrice(val) {
  return Number(val).toFixed(2).replace('.', ',');
}

var escH = window.escapeHtml || function (s) { return s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;') : ''; };

function precoVenda(prod) {
  return prod.compare_price || prod.price;
}

function estaDisponivel(prod) {
  return !!prod.stock && prod.is_active !== 0;
}

function renderProductCard(prod) {
  var imgSrc = imgUrl(prod.image_url);
  var venda = precoVenda(prod);
  var precoHtml = prod.compare_price
    ? '<p style="text-decoration:line-through;color:#999;font-size:14px;">R$ ' + formatPrice(prod.price) + '</p><h3 style="color:#c53b22;">R$ ' + formatPrice(venda) + '</h3>'
    : '<p>R$</p><h3>' + formatPrice(venda) + '</h3>';

  var disponivel = estaDisponivel(prod);

  return '<div class="cartao' + (disponivel ? '' : ' indisponivel') + '">' +
    (disponivel ? '' : '<div class="overlay-indisponivel"><span>Indisponível</span></div>') +
    '<img class="cartao-img" src="' + imgSrc + '" alt="' + escH(prod.name) + '" style="cursor:pointer;">' +
    '<h1 class="cartao-h1">' + escH(prod.name) + '</h1>' +
    '<div class="cartao-valor">' + precoHtml + '</div>' +
    '<div class="conteiner-botões-kit">' +
      '<button class="add-carrinho-botao"' + (disponivel ? ' onclick=\'addCarrinho(' + JSON.stringify({ id: prod.id, nome: prod.name, valor: venda, img: imgSrc, tipo: "produto" }) + ')\'' : ' disabled') + '><img src="/site/imgs/icones/carrinho.png" alt="Adicionar ao carrinho"></button>' +
      '<button class="ver-mais-botao"' + (disponivel ? ' onclick="window.location.href=\'/site/pages/produtos/detalhe/index.html?id=' + prod.id + '\'"' : ' disabled') + '>Ver mais</button>' +
    '</div>' +
    '</div>';
}

function carregarDados(chave, url, callback) {
  var cacheStr = localStorage.getItem(chave);
  var tempoStr = localStorage.getItem(chave + '_tempo');
  if (cacheStr && tempoStr && (Date.now() - Number(tempoStr) < 5 * 60 * 1000)) {
    callback(JSON.parse(cacheStr));
    return;
  }
  fetch(url)
    .then(function (r) { return r.json(); })
    .then(function (dados) {
      localStorage.setItem(chave, JSON.stringify(dados));
      localStorage.setItem(chave + '_tempo', String(Date.now()));
      callback(dados);
    })
    .catch(function () { callback(null); });
}

function observarSecao(el, chave, url, renderFn) {
  if (!el) return;
  carregarDados(chave, url, function (dados) {
    if (dados) renderFn(dados);
  });
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

    carregarDados('home_banners', (window.API_BASE_URL || 'http://localhost:3333') + '/api/banners', function (banners) {
      if (!banners || banners.length === 0) {
        slidesContainer.innerHTML = '<div class="slide"><p style="padding:2rem;text-align:center;">Em breve</p></div>';
        totalSlides = 1;
        atualizarCarrossel();
        return;
      }

      banners.forEach(function (banner, index) {
        slidesContainer.innerHTML += '<div class="slide"><img src="' + imgUrl(banner.image_url) + '" alt="' + escH(banner.title || 'Slide ' + (index + 1)) + '"></div>';
      });

      totalSlides = banners.length;
      atualizarCarrossel();
    });

    btnProximo.addEventListener('click', function () {
      if (totalSlides === 0) return;
      slideAtual++;
      if (slideAtual >= totalSlides) slideAtual = 0;
      atualizarCarrossel();
      resetarAutoPlay();
    });

    btnAnterior.addEventListener('click', function () {
      if (totalSlides === 0) return;
      slideAtual--;
      if (slideAtual < 0) slideAtual = totalSlides - 1;
      atualizarCarrossel();
      resetarAutoPlay();
    });

    var autoPlayInterval = null;

    function iniciarAutoPlay() {
      if (autoPlayInterval) clearInterval(autoPlayInterval);
      autoPlayInterval = setInterval(function () {
        if (totalSlides <= 1) return;
        slideAtual++;
        if (slideAtual >= totalSlides) slideAtual = 0;
        atualizarCarrossel();
      }, 5000);
    }

    function resetarAutoPlay() {
      iniciarAutoPlay();
    }

    var slidesWrapper = slidesContainer.parentElement;
    if (slidesWrapper) {
      slidesWrapper.addEventListener('mouseenter', function () {
        if (autoPlayInterval) clearInterval(autoPlayInterval);
      });
      slidesWrapper.addEventListener('mouseleave', function () {
        iniciarAutoPlay();
      });
    }

    iniciarAutoPlay();
  }

  /* ===== PRODUTOS EM DESTAQUE (LAZY) ===== */

  var destaquesWrapper = document.querySelector('.destaques-section');
  var destaquesSection = document.getElementById('destaques-section');

  function renderizarDestaques(produtos) {
    if (!produtos || produtos.length === 0) {
      var section = document.querySelector('.destaques-section');
      if (section) section.style.display = 'none';
      return;
    }
    produtos.forEach(function (prod) {
      destaquesSection.innerHTML += renderProductCard(prod);
    });
  }

  function renderizarDestaquesWrapper(dados) {
    if (dados && dados.products) renderizarDestaques(dados.products);
    else renderizarDestaques(dados);
  }

  if (destaquesWrapper && destaquesSection) {
    var observerDestaques = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          observerDestaques.disconnect();
          observarSecao(destaquesSection, 'home_destaques', (window.API_BASE_URL || 'http://localhost:3333') + '/api/products?featured=true', renderizarDestaquesWrapper);
        }
      });
    }, { rootMargin: '200px' });
    observerDestaques.observe(destaquesWrapper);
  }

  /* ===== KITS (LAZY) ===== */

  var cartoesSection = document.getElementById('cartoes-section');
  var kitsWrapper = cartoesSection ? cartoesSection.parentElement : null;

  function renderizarKits(kits) {
    if (!kits || kits.length === 0) {
      cartoesSection.innerHTML = '<p class="fallback-msg">Produtos em breve</p>';
      return;
    }

    kits.forEach(function (kit) {
      const valorFormatado = Number(kit.price).toFixed(2).replace('.', ',');
      const imgSrc = imgUrl(kit.image_url);

      var produtosHtml = '';
      if (kit.items && kit.items.length > 0) {
        produtosHtml = '<div class="cartao-produtos"><h1>Ingredientes</h1><ul>' +
          kit.items.map(function (item) { return '<li>' + escH(item.custom_name || 'Item') + '</li>'; }).join('') +
          '</ul></div>';
      }

      cartoesSection.innerHTML += '<div class="cartao">' +
        '<img class="cartao-img" src="' + imgSrc + '" alt="' + escH(kit.name) + '">' +
        '<h1 class="cartao-h1">' + escH(kit.name) + '</h1>' +
        '<div class="cartao-valor"><p>R$</p><h3>' + valorFormatado + '</h3></div>' +
        produtosHtml +
        '<div class = "conteiner-botões-kit">' +
          '<button class="add-carrinho-botao" onclick=\'addCarrinho(' + JSON.stringify({ id: kit.id, nome: kit.name, valor: kit.price, img: imgSrc, tipo: "kit" }) + ')\'><img src="/site/imgs/icones/carrinho.png" alt="Adicionar ao carrinho"></button>' +
          '<button class="ver-mais-botao" onclick="window.location.href=\'/site/pages/kits/detalhe/index.html?id=' + kit.id + '\'">Ver mais</button>' +
        '</div>' +
        '</div>';
    });
  }

  if (kitsWrapper && cartoesSection) {
    var observerKits = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          observerKits.disconnect();
          observarSecao(cartoesSection, 'home_kits', (window.API_BASE_URL || 'http://localhost:3333') + '/api/kits?active=true', renderizarKits);
        }
      });
    }, { rootMargin: '200px' });
    observerKits.observe(kitsWrapper);
  }

});
