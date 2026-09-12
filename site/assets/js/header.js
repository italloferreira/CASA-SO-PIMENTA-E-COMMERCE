var dropdowns = document.querySelectorAll('.dropdown');

    function fecharTodosDropdowns() {
        dropdowns.forEach(function (dropdown) {
            dropdown.classList.remove('ativo');
        });
    }

    dropdowns.forEach(function (dropdown) {
        var botao = dropdown.querySelector('.dropdown-btn');
        if (!botao) return;

        botao.addEventListener('click', function (e) {
            e.stopPropagation();
            var jaAtivo = dropdown.classList.contains('ativo');
            fecharTodosDropdowns();
            if (!jaAtivo) {
                dropdown.classList.add('ativo');
            }
        });
    });

    document.addEventListener('click', function () {
        fecharTodosDropdowns();
    });