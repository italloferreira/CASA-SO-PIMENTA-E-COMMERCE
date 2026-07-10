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
