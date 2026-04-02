document.addEventListener('DOMContentLoaded', function () {

    /* ===== CARROSSEL ===== */

    var slidesContainer = document.getElementById('slides');
    var btnAnterior = document.getElementById('anterior');
    var btnProximo = document.getElementById('proximo');

    if (slidesContainer && btnAnterior && btnProximo) {
        var slideAtual = 0;
        var totalSlides = 0;

        function atualizarCarrossel() {
            slidesContainer.style.transform = 'translateX(-' + (slideAtual * 100) + '%)';
        }

        fetch('/server/carrossel.json')
            .then(function (resposta) { return resposta.json(); })
            .then(function (dados) {
                var listaSlides = dados.slides;
                totalSlides = listaSlides.length;

                listaSlides.forEach(function (slide) {
                    slidesContainer.innerHTML += '<div class="slide"><img src="' + slide.img + '" alt="Slide ' + slide.id + '"></div>';
                });

                atualizarCarrossel();
            })
            .catch(function (erro) {
                console.error('Erro ao carregar o JSON do carrossel:', erro);
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

    var cartoesSection = document.getElementById('cartoes-section');

    if (cartoesSection) {
        fetch('/server/kits.json')
            .then(function (resposta) { return resposta.json(); })
            .then(function (dados) {
                var kits = dados.kits;

                kits.forEach(function (kit) {
                    var ingredientesHTML = '';
                    kit.ingredientes.forEach(function (ingrediente) {
                        ingredientesHTML += '<li>' + ingrediente + '</li>';
                    });

                    var valorFormatado = kit.valor.toFixed(2).replace('.', ',');

                    cartoesSection.innerHTML += '<div class="cartao">' +
                        '<img class="cartao-img" src="' + kit.img + '" alt="' + kit.titulo + '">' +
                        '<h1 class="cartao-h1">' + kit.titulo + '</h1>' +
                        '<div class="cartao-valor"><p>R$</p><h3>' + valorFormatado + '</h3></div>' +
                        '<div class="cartao-ingredientes"><h1>Ingredientes</h1><ul>' + ingredientesHTML + '</ul></div>' +
                        '</div>';
                });
            })
            .catch(function (erro) {
                console.error('Erro ao carregar os kits:', erro);
            });
    }

});