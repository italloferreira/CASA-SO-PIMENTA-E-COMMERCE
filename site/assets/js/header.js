    var dropdown = document.querySelector('.dropdown');
    var botao = document.querySelector('.dropdown-btn');

    if (dropdown && botao) {
        botao.addEventListener('click', function () {
            dropdown.classList.toggle('ativo');
        });

        document.addEventListener('click', function (e) {
            if (!dropdown.contains(e.target)) {
                dropdown.classList.remove('ativo');
            }
        });
    }