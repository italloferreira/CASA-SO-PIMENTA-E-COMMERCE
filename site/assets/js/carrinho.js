const abrirCarrinho = document.getElementById("abrirCarrinho");
const fecharCarrinho = document.getElementById("fecharCarrinho");
const campoCarrinho = document.getElementById("campoCarrinho");
const carrinhoOverlay = document.getElementById("carrinhoOverlay");

abrirCarrinho.addEventListener("click", function (e) {
    e.preventDefault();

    campoCarrinho.classList.add("ativo");
    carrinhoOverlay.classList.add("ativo");
    document.body.style.overflow = "hidden";
});

fecharCarrinho.addEventListener("click", function () {
    campoCarrinho.classList.remove("ativo");
    carrinhoOverlay.classList.remove("ativo");
    document.body.style.overflow = "auto";
});

carrinhoOverlay.addEventListener("click", function () {
    campoCarrinho.classList.remove("ativo");
    carrinhoOverlay.classList.remove("ativo");
    document.body.style.overflow = "auto";
});

/*add ao carrinho */

function addCarrinho(produto) {
    let carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];

    const produtoExistente = carrinho.find(item => item.id == produto.id);

    if (produtoExistente) {
        produtoExistente.quantidade += 1;
    } else {
        carrinho.push({
            id: produto.id,
            nome: produto.nome,
            valor: Number(produto.valor),
            img: produto.img,
            quantidade: 1
        });
    }

    localStorage.setItem("carrinho", JSON.stringify(carrinho));

    renderizarCarrinho();
};

function addCarrinho(produto) {
    let carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];

    const produtoExistente = carrinho.find(item => item.id == produto.id);

    if (produtoExistente) {
        produtoExistente.quantidade += 1;
    } else {
        carrinho.push({
            id: produto.id,
            nome: produto.nome,
            valor: Number(produto.valor),
            img: produto.img,
            quantidade: 1
        });
    }

    localStorage.setItem("carrinho", JSON.stringify(carrinho));
    renderizarCarrinho();
    atualizarBadgeCarrinho();
}

function aumentarQuantidade(id) {
    let carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];

    const item = carrinho.find(produto => produto.id == id);

    if (item) {
        item.quantidade += 1;
    }

    localStorage.setItem("carrinho", JSON.stringify(carrinho));
    renderizarCarrinho();
}

function diminuirQuantidade(id) {
    let carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];

    const item = carrinho.find(produto => produto.id == id);

    if (item) {
        item.quantidade -= 1;

        if (item.quantidade <= 0) {
            carrinho = carrinho.filter(produto => produto.id != id);
        }
    }

    localStorage.setItem("carrinho", JSON.stringify(carrinho));
    renderizarCarrinho();
}

function removerDoCarrinho(id) {
    let carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];

    carrinho = carrinho.filter(item => item.id != id);

    localStorage.setItem("carrinho", JSON.stringify(carrinho));
    renderizarCarrinho();
}

function renderizarCarrinho() {
    const produtoCarrinho = document.getElementById("produtoCarrinho");
    const totalCarrinho = document.getElementById("totalCarrinho");
    const carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];

    produtoCarrinho.innerHTML = "";

    if (carrinho.length === 0) {
        produtoCarrinho.innerHTML = `<p class="carrinho-vazio">Seu carrinho está vazio.</p>`;
        totalCarrinho.textContent = "R$ 0,00";
        return;
    }

    let totalGeral = 0;

    carrinho.forEach(function(item) {
        const valor = Number(item.valor);
        const subtotalNumero = valor * item.quantidade;

        totalGeral += subtotalNumero;

        const valorFormatado = valor.toFixed(2).replace(".", ",");
        const subtotal = subtotalNumero.toFixed(2).replace(".", ",");

        produtoCarrinho.innerHTML += `
            <div class="item-carrinho">
                <div class="item-carrinho-img">
                    <img src="${item.img}" alt="${item.nome}">
                </div>

                <div class="item-carrinho-info">
                    <h3>${item.nome}</h3>
                    <p>R$ ${valorFormatado}</p>

                    <div class="controle-qtd">
                        <button onclick="diminuirQuantidade('${item.id}')">-</button>
                        <span>${item.quantidade}</span>
                        <button onclick="aumentarQuantidade('${item.id}')">+</button>
                    </div>

                    <p>Subtotal: R$ ${subtotal}</p>

                    <button onclick="removerDoCarrinho('${item.id}')">
                        <img  class="removerImg" src="/site/imgs/icones/lixo.png">
                    </button>
                </div>
            </div>
        `;
    });

    totalCarrinho.textContent = `R$ ${totalGeral.toFixed(2).replace(".", ",")}`;
}

document.addEventListener("DOMContentLoaded", function() {
    renderizarCarrinho();

    const btnFinalizarPedido = document.getElementById("btnFinalizarPedido");

    btnFinalizarPedido.addEventListener("click", function() {
        const carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];

        if (carrinho.length === 0) {
            alert("Seu carrinho está vazio.");
            return;
        }

        alert("Pedido finalizado!");
    });
});

function removerDoCarrinho(id) {
    let carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];

    carrinho = carrinho.filter(item => item.id != id);

    localStorage.setItem("carrinho", JSON.stringify(carrinho));
    renderizarCarrinho();
    atualizarBadgeCarrinho();
};

function aumentarQuantidade(id) {
    let carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];

    const item = carrinho.find(p => p.id == id);

    if (item) {
        item.quantidade += 1;
    }

    localStorage.setItem("carrinho", JSON.stringify(carrinho));
    renderizarCarrinho();
};

function diminuirQuantidade(id) {
    let carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];

    const item = carrinho.find(p => p.id == id);

    if (item) {
        item.quantidade -= 1;

        if (item.quantidade <= 0) {
            carrinho = carrinho.filter(p => p.id != id);
        }
    }

    localStorage.setItem("carrinho", JSON.stringify(carrinho));
    renderizarCarrinho();
};

function atualizarBadgeCarrinho() {
    const badge = document.getElementById("badgeCarrinho");
    const carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];

    let totalItens = 0;

    carrinho.forEach(item => {
        totalItens += item.quantidade;
    });

    badge.textContent = totalItens;
}

document.addEventListener("DOMContentLoaded", function() {
    renderizarCarrinho();
    atualizarBadgeCarrinho();
});

