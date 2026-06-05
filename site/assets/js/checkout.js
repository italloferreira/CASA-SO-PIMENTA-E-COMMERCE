/* checkout.js — fluxo completo de checkout */

/* ========== CONSTANTES ========== */
var API = 'http://localhost:3333';
var etapaAtual = 1;
var dadosPerfil = null;
var freteSelecionado = null;
var metodoPagamento = null;
var editandoDados = false;

/* ========== HELPERS ========== */
function getToken() {
  return localStorage.getItem('csp_admin_token');
}

function getUsuario() {
  var data = localStorage.getItem('csp_admin_user');
  return data ? JSON.parse(data) : null;
}

function formatarTelefone(valor) {
  var nums = valor.replace(/\D/g, '').slice(0, 11);
  if (nums.length <= 10) {
    return nums.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').trim();
  }
  return nums.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').trim();
}

function formatarCEP(valor) {
  return valor.replace(/\D/g, '').slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2');
}

function formatarCartaoNumero(valor) {
  return valor.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');
}

function formatarValidade(valor) {
  var nums = valor.replace(/\D/g, '').slice(0, 4);
  if (nums.length >= 3) {
    return nums.slice(0, 2) + '/' + nums.slice(2);
  }
  return nums;
}

function formatarPreco(valor) {
  return 'R$ ' + Number(valor).toFixed(2).replace('.', ',');
}

function limparErros() {
  document.querySelectorAll('.campo-erro').forEach(function (el) {
    el.textContent = '';
  });
  document.querySelectorAll('.campo-grupo input.erro, .campo-grupo select.erro').forEach(function (el) {
    el.classList.remove('erro');
  });
}

function mostrarErro(idCampo, mensagem) {
  var erroEl = document.getElementById('erro' + idCampo.charAt(0).toUpperCase() + idCampo.slice(1));
  if (erroEl) erroEl.textContent = mensagem;
  var input = document.getElementById('input' + idCampo.charAt(0).toUpperCase() + idCampo.slice(1));
  if (input) input.classList.add('erro');
}

/* ========== PROTEÇÃO DE ROTA ========== */
(function () {
  if (!getToken() || !getUsuario()) {
    window.location.href = '/site/pages/login/index.html?redirect=checkout';
    return;
  }
})();

/* ========== CARREGAR PERFIL ========== */
function carregarPerfil() {
  var banner = document.getElementById('bemVindoTexto');
  var usuario = getUsuario();
  if (usuario) {
    banner.textContent = 'Ol\u00e1, ' + (usuario.name || usuario.email) + '!';
  }

  fetch(API + '/api/auth/profile', {
    headers: { 'Authorization': 'Bearer ' + getToken() }
  })
    .then(function (r) { return r.json(); })
    .then(function (perfil) {
      dadosPerfil = perfil;
      preencherPerfil(perfil);
      preencherEntrega(perfil);
    })
    .catch(function () {
      dadosPerfil = getUsuario();
      preencherPerfil(dadosPerfil);
    });
}

function preencherPerfil(perfil) {
  document.getElementById('inputNome').value = perfil.name || '';
  document.getElementById('inputEmail').value = perfil.email || '';
  document.getElementById('inputTelefone').value = perfil.phone || '';
}

function preencherEntrega(perfil) {
  if (perfil.cep) {
    document.getElementById('inputCep').value = perfil.cep;
    setTimeout(function () {
      buscarCEP(true);
    }, 300);
  }
}

/* ========== ETAPA 1: IDENTIFICAÇÃO ========== */

window.sairDaConta = function () {
  localStorage.removeItem('csp_admin_token');
  localStorage.removeItem('csp_admin_user');
  window.location.href = '/site/pages/login/index.html?redirect=checkout';
};

window.toggleEditarDados = function () {
  editandoDados = !editandoDados;
  var inputs = ['inputNome', 'inputEmail', 'inputTelefone'];
  var readonly = !editandoDados;
  inputs.forEach(function (id) {
    document.getElementById(id).readOnly = readonly;
    if (!readonly) {
      document.getElementById(id).style.background = '';
      document.getElementById(id).style.color = '';
    } else {
      document.getElementById(id).style.background = '#f5f5f5';
      document.getElementById(id).style.color = '#888';
    }
  });
  document.getElementById('btnEditarDados').style.display = editandoDados ? 'none' : '';
  document.getElementById('btnSalvarDados').style.display = editandoDados ? '' : 'none';
};

window.salvarDadosPerfil = function () {
  var nome = document.getElementById('inputNome').value.trim();
  var email = document.getElementById('inputEmail').value.trim();
  var telefone = document.getElementById('inputTelefone').value.trim();

  limparErros();
  var valido = true;

  if (!nome) {
    mostrarErro('Nome', 'Informe seu nome completo.');
    valido = false;
  }

  var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    mostrarErro('Email', 'Informe um e-mail v\u00e1lido.');
    valido = false;
  }

  if (!telefone || telefone.replace(/\D/g, '').length < 10) {
    mostrarErro('Telefone', 'Informe um telefone com DDD.');
    valido = false;
  }

  if (!valido) return;

  var btn = document.getElementById('btnSalvarDados');
  btn.textContent = 'Salvando...';
  btn.disabled = true;

  fetch(API + '/api/auth/profile', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + getToken()
    },
    body: JSON.stringify({ name: nome, phone: telefone })
  })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (data.user) {
        localStorage.setItem('csp_admin_user', JSON.stringify(data.user));
        dadosPerfil = data.user;
      }
      window.toggleEditarDados();
    })
    .catch(function () {
      mostrarErro('Nome', 'Erro ao salvar. Tente novamente.');
    })
    .finally(function () {
      btn.textContent = '\u2713 Salvar dados';
      btn.disabled = false;
    });
};

/* ========== VALIDAÇÃO ETAPA 1 ========== */
function validarEtapa1() {
  limparErros();
  var valido = true;

  var nome = document.getElementById('inputNome').value.trim();
  var email = document.getElementById('inputEmail').value.trim();
  var telefone = document.getElementById('inputTelefone').value.trim();

  if (!nome) {
    mostrarErro('Nome', 'Nome completo é obrigatório.');
    valido = false;
  }

  var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    mostrarErro('Email', 'Informe um e-mail v\u00e1lido.');
    valido = false;
  }

  if (!telefone || telefone.replace(/\D/g, '').length < 10) {
    mostrarErro('Telefone', 'Informe um telefone com DDD.');
    valido = false;
  }

  return valido;
}

/* ========== ETAPA 2: CEP E FRETE ========== */

var buscandoCep = false;

window.buscarCEP = function (auto) {
  var cepInput = document.getElementById('inputCep');
  var cep = cepInput.value.replace(/\D/g, '');
  var erroEl = document.getElementById('erroCep');
  var infoEl = document.getElementById('infoCep');

  if (cep.length !== 8) {
    erroEl.textContent = 'CEP deve ter 8 d\u00edgitos.';
    return;
  }

  erroEl.textContent = '';
  infoEl.textContent = 'Buscando...';
  buscandoCep = true;
  document.getElementById('btnBuscarCep').disabled = true;

  fetch('https://viacep.com.br/ws/' + cep + '/json/')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (data.erro) {
        infoEl.textContent = 'CEP n\u00e3o encontrado.';
        infoEl.style.color = '#860000';
        return;
      }

      infoEl.textContent = (data.logradouro || '') + ', ' + (data.bairro || '') + ' — ' + (data.localidade || '') + '/' + (data.uf || '');
      infoEl.style.color = '#555';

      document.getElementById('inputEndereco').value = data.logradouro || '';
      document.getElementById('inputBairro').value = data.bairro || '';
      document.getElementById('inputCidade').value = data.localidade || '';
      document.getElementById('inputEstado').value = data.uf || '';

      document.getElementById('inputCep').value = formatarCEP(cep);

      if (!auto) {
        document.getElementById('inputNumero').focus();
      }

      calcularFrete(data.uf);
    })
    .catch(function () {
      infoEl.textContent = 'Erro ao buscar CEP. Tente novamente.';
      infoEl.style.color = '#860000';
    })
    .finally(function () {
      buscandoCep = false;
      document.getElementById('btnBuscarCep').disabled = false;
    });
};

function calcularFrete(estado) {
  var valorFrete = estado && estado.toUpperCase() === 'MG' ? 15 : 25;
  var freteCard = document.querySelector('.frete-card[data-tipo="padrao"]');
  freteCard.setAttribute('data-valor', valorFrete);
  document.getElementById('freteValor').textContent = formatarPreco(valorFrete);
  document.getElementById('fretePrazo').textContent = estado && estado.toUpperCase() === 'MG' ? 'Até 5 dias úteis' : 'Até 10 dias úteis';
}

window.selecionarFrete = function (el) {
  document.querySelectorAll('.frete-card').forEach(function (c) {
    c.classList.remove('selecionado');
  });
  el.classList.add('selecionado');
  freteSelecionado = {
    tipo: el.getAttribute('data-tipo'),
    valor: Number(el.getAttribute('data-valor'))
  };
  atualizarResumo();
};

/* ========== VALIDAÇÃO ETAPA 2 ========== */
function validarEtapa2() {
  limparErros();
  var valido = true;

  var cep = document.getElementById('inputCep').value.replace(/\D/g, '');
  var endereco = document.getElementById('inputEndereco').value.trim();
  var numero = document.getElementById('inputNumero').value.trim();
  var cidade = document.getElementById('inputCidade').value.trim();
  var estado = document.getElementById('inputEstado').value.trim();

  if (cep.length !== 8) {
    mostrarErro('Cep', 'Informe um CEP v\u00e1lido.');
    valido = false;
  }

  if (!endereco) {
    mostrarErro('Endereco', 'Endereço é obrigatório.');
    valido = false;
  }

  if (!numero) {
    mostrarErro('Numero', 'Número é obrigatório.');
    valido = false;
  }

  if (!cidade) {
    mostrarErro('Cidade', 'Cidade é obrigatória.');
    valido = false;
  }

  if (!estado || estado.length !== 2) {
    mostrarErro('Estado', 'Estado é obrigatório (ex: MG).');
    valido = false;
  }

  if (!freteSelecionado) {
    var erroFrete = document.querySelector('.frete-opcoes');
    var msg = document.createElement('span');
    msg.className = 'campo-erro';
    msg.textContent = 'Selecione uma opção de frete.';
    msg.style.marginTop = '8px';
    msg.style.display = 'block';
    var existente = erroFrete.querySelector('.campo-erro');
    if (!existente) erroFrete.appendChild(msg);
    valido = false;
  }

  return valido;
}

/* ========== ETAPA 3: PAGAMENTO ========== */

window.selecionarPagamento = function (el) {
  document.querySelectorAll('.pagamento-card').forEach(function (c) {
    c.classList.remove('selecionado');
  });
  el.classList.add('selecionado');
  metodoPagamento = el.getAttribute('data-metodo');

  document.getElementById('detalhesPix').style.display = metodoPagamento === 'pix' ? '' : 'none';
  document.getElementById('detalhesCartao').style.display = metodoPagamento === 'cartao' ? '' : 'none';
  document.getElementById('detalhesBoleto').style.display = metodoPagamento === 'boleto' ? '' : 'none';

  atualizarResumo();
};

/* ========== Cartão ========== */
document.addEventListener('DOMContentLoaded', function () {
  var numInput = document.getElementById('inputCartaoNumero');
  if (numInput) {
    numInput.addEventListener('input', function () {
      this.value = formatarCartaoNumero(this.value);
      document.getElementById('previewNumero').textContent = this.value || '\u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022';
    });
  }

  var nomeInput = document.getElementById('inputCartaoNome');
  if (nomeInput) {
    nomeInput.addEventListener('input', function () {
      document.getElementById('previewNome').textContent = this.value.toUpperCase() || 'SEU NOME';
    });
  }

  var valInput = document.getElementById('inputCartaoValidade');
  if (valInput) {
    valInput.addEventListener('input', function () {
      this.value = formatarValidade(this.value);
      document.getElementById('previewValidade').textContent = this.value || 'MM/AA';
    });
  }

  var cvvInput = document.getElementById('inputCartaoCvv');
  if (cvvInput) {
    cvvInput.addEventListener('input', function () {
      document.getElementById('previewCvv').textContent = this.value || '\u2022\u2022\u2022';
    });

    cvvInput.addEventListener('focus', function () {
      document.getElementById('cartaoPreview').classList.add('mostrar-verso');
    });

    cvvInput.addEventListener('blur', function () {
      document.getElementById('cartaoPreview').classList.remove('mostrar-verso');
    });
  }

  var telefoneInput = document.getElementById('inputTelefone');
  if (telefoneInput) {
    telefoneInput.addEventListener('input', function () {
      this.value = formatarTelefone(this.value);
    });
  }

  var cepInput = document.getElementById('inputCep');
  if (cepInput) {
    cepInput.addEventListener('input', function () {
      this.value = formatarCEP(this.value);
    });
  }
});

window.toggleCvv = function () {
  var input = document.getElementById('inputCartaoCvv');
  input.type = input.type === 'password' ? 'text' : 'password';
};

window.copiarChavePix = function () {
  var texto = document.getElementById('pixCodigo').textContent;
  navigator.clipboard.writeText(texto).then(function () {
    var btn = document.querySelector('.confirmacao-pix .btn-copiar');
    btn.textContent = 'Copiado!';
    btn.classList.add('copiado');
    setTimeout(function () {
      btn.textContent = 'Copiar código';
      btn.classList.remove('copiado');
    }, 2000);
  });
};

window.copiarChavePixForm = function () {
  var texto = document.getElementById('pixCodigoForm').textContent;
  navigator.clipboard.writeText(texto).then(function () {
    var btn = document.querySelector('#detalhesPix .btn-copiar');
    btn.textContent = 'Copiado!';
    btn.classList.add('copiado');
    setTimeout(function () {
      btn.textContent = 'Copiar código';
      btn.classList.remove('copiado');
    }, 2000);
  });
};

/* ========== VALIDAÇÃO ETAPA 3 ========== */
function validarEtapa3() {
  limparErros();
  var valido = true;

  if (!metodoPagamento) {
    var pagOpcoes = document.querySelector('.pagamento-opcoes');
    var msg = document.createElement('span');
    msg.className = 'campo-erro';
    msg.textContent = 'Selecione um método de pagamento.';
    msg.style.marginTop = '8px';
    msg.style.display = 'block';
    var existente = pagOpcoes.querySelector('.campo-erro');
    if (!existente) pagOpcoes.appendChild(msg);
    valido = false;
  }

  if (metodoPagamento === 'cartao') {
    var numero = document.getElementById('inputCartaoNumero').value.replace(/\s/g, '');
    var nome = document.getElementById('inputCartaoNome').value.trim();
    var validade = document.getElementById('inputCartaoValidade').value.trim();
    var cvv = document.getElementById('inputCartaoCvv').value.trim();

    if (numero.length !== 16 || !/^\d+$/.test(numero)) {
      mostrarErro('CartaoNumero', 'Número do cartão inválido.');
      valido = false;
    }

    if (!nome || nome.length < 3) {
      mostrarErro('CartaoNome', 'Informe o nome no cartão.');
      valido = false;
    }

    var valRegex = /^(0[1-9]|1[0-2])\/\d{2}$/;
    if (!valRegex.test(validade)) {
      mostrarErro('CartaoValidade', 'Formato inválido (MM/AA).');
      valido = false;
    }

    if (!cvv || cvv.length < 3 || !/^\d+$/.test(cvv)) {
      mostrarErro('CartaoCvv', 'CVV inválido.');
      valido = false;
    }
  }

  return valido;
}

/* ========== NAVEGAÇÃO ENTRE ETAPAS ========== */

window.proximaEtapa = function () {
  var valido = false;

  if (etapaAtual === 1) {
    valido = validarEtapa1();
  } else if (etapaAtual === 2) {
    valido = validarEtapa2();
  } else if (etapaAtual === 3) {
    valido = validarEtapa3();
  }

  if (!valido) return;

  if (etapaAtual < 3) {
    document.getElementById('etapa' + etapaAtual).classList.remove('ativo');
    var stepAtual = document.querySelector('.step-item[data-step="' + etapaAtual + '"]');
    stepAtual.classList.remove('ativo');
    stepAtual.classList.add('completo');

    etapaAtual++;
    document.getElementById('etapa' + etapaAtual).classList.add('ativo');
    document.querySelector('.step-item[data-step="' + etapaAtual + '"]').classList.add('ativo');

    document.getElementById('btnVoltarEtapa').style.display = '';
  }

  if (etapaAtual === 3) {
    document.getElementById('btnProximaEtapa').style.display = 'none';
    document.getElementById('btnConfirmarPedido').disabled = false;
  }

  atualizarResumo();
};

window.etapaAnterior = function () {
  if (etapaAtual > 1) {
    var stepAtualEl = document.querySelector('.step-item[data-step="' + etapaAtual + '"]');
    stepAtualEl.classList.remove('ativo');

    document.getElementById('etapa' + etapaAtual).classList.remove('ativo');
    etapaAtual--;
    document.getElementById('etapa' + etapaAtual).classList.add('ativo');
    document.querySelector('.step-item[data-step="' + etapaAtual + '"]').classList.add('ativo');
    document.querySelector('.step-item[data-step="' + etapaAtual + '"]').classList.remove('completo');

    if (etapaAtual === 1) {
      document.getElementById('btnVoltarEtapa').style.display = 'none';
    }

    document.getElementById('btnProximaEtapa').style.display = '';
    document.getElementById('btnConfirmarPedido').disabled = true;
  }
};

/* ========== RESUMO DO PEDIDO ========== */

function getCarrinho() {
  return JSON.parse(localStorage.getItem('carrinho')) || [];
}

function calcularSubtotal() {
  var carrinho = getCarrinho();
  var total = 0;
  carrinho.forEach(function (item) {
    total += Number(item.valor) * item.quantidade;
  });
  return total;
}

window.atualizarResumo = function () {
  var carrinho = getCarrinho();
  var subtotal = calcularSubtotal();
  var freteValor = freteSelecionado ? freteSelecionado.valor : 0;

  /* Renderizar itens */
  var container = document.getElementById('resumoItens');
  container.innerHTML = '';
  carrinho.forEach(function (item) {
    var sub = Number(item.valor) * item.quantidade;
    container.innerHTML +=
      '<div class="resumo-item">' +
        '<img class="resumo-item-img" src="' + item.img + '" alt="' + item.nome + '">' +
        '<div class="resumo-item-info">' +
          '<div class="resumo-item-nome">' + item.nome + '</div>' +
          '<div class="resumo-item-qtd">Qtd: ' + item.quantidade + '</div>' +
        '</div>' +
        '<div class="resumo-item-subtotal">' + formatarPreco(sub) + '</div>' +
      '</div>';
  });

  /* Subtotal */
  document.getElementById('resumoSubtotal').textContent = formatarPreco(subtotal);

  /* Frete */
  document.getElementById('resumoFrete').textContent = freteSelecionado
    ? formatarPreco(freteValor)
    : '— Selecione o CEP';

  /* Desconto PIX */
  var descontoLinha = document.getElementById('resumoDescontoLinha');
  var descontoEl = document.getElementById('resumoDesconto');
  var total = subtotal + freteValor;

  if (metodoPagamento === 'pix') {
    var desconto = total * 0.05;
    total = total - desconto;
    descontoLinha.style.display = '';
    descontoEl.textContent = '- ' + formatarPreco(desconto);
  } else {
    descontoLinha.style.display = 'none';
  }

  /* Total */
  document.getElementById('resumoTotal').textContent = formatarPreco(total);

  /* Atualizar parcelas */
  var selectParcelas = document.getElementById('selectParcelas');
  if (selectParcelas) {
    var valorParcela = total / 3;
    selectParcelas.innerHTML =
      '<option value="1">1x de ' + formatarPreco(total) + '</option>' +
      '<option value="2">2x de ' + formatarPreco(valorParcela) + ' sem juros</option>' +
      '<option value="3">3x de ' + formatarPreco(valorParcela) + ' sem juros</option>';
  }
};

/* ========== CONFIRMAR PEDIDO ========== */

function montarEnderecoCompleto() {
  var endereco = document.getElementById('inputEndereco').value.trim();
  var numero = document.getElementById('inputNumero').value.trim();
  var complemento = document.getElementById('inputComplemento').value.trim();
  var bairro = document.getElementById('inputBairro').value.trim();

  var partes = [endereco];
  if (numero) partes.push('N\u00ba ' + numero);
  if (complemento) partes.push(complemento);
  if (bairro) partes.push(bairro);

  return partes.join(', ');
}

function montarNotas() {
  var freteNome = freteSelecionado ? freteSelecionado.tipo : '—';
  var metodo = metodoPagamento || '—';
  var parcelas = '—';
  if (metodoPagamento === 'cartao') {
    var sel = document.getElementById('selectParcelas');
    parcelas = sel ? sel.value + 'x' : '—';
  }
  return 'M\u00e9todo: ' + metodo.toUpperCase() + ' | Parcelas: ' + parcelas + ' | Frete: ' + freteNome;
}

window.confirmarPedido = function () {
  var valido = validarEtapa3();
  if (!valido) return;

  var carrinho = getCarrinho();
  if (carrinho.length === 0) {
    alert('Seu carrinho est\u00e1 vazio.');
    return;
  }

  var subtotal = calcularSubtotal();
  var freteValor = freteSelecionado ? freteSelecionado.valor : 0;
  var total = subtotal + freteValor;
  if (metodoPagamento === 'pix') {
    total = total - (total * 0.05);
  }

  var items = carrinho.map(function (item) {
    var isKit = item.tipo === 'kit';
    return {
      product_id: isKit ? null : Number(item.id),
      kit_id: isKit ? Number(item.id) : null,
      item_name: item.nome,
      unit_price: Number(item.valor),
      quantity: item.quantidade,
      total: Number(item.valor) * item.quantidade
    };
  });

  var payload = {
    customer_name: document.getElementById('inputNome').value.trim(),
    customer_email: document.getElementById('inputEmail').value.trim(),
    customer_phone: document.getElementById('inputTelefone').value.trim(),
    cep: document.getElementById('inputCep').value.replace(/\D/g, ''),
    address: montarEnderecoCompleto(),
    city: document.getElementById('inputCidade').value.trim(),
    state: document.getElementById('inputEstado').value.trim(),
    subtotal: subtotal,
    delivery_fee: freteValor,
    total: total,
    payment_method: metodoPagamento || 'pix',
    notes: montarNotas(),
    items: items
  };

  var btn = document.getElementById('btnConfirmarPedido');
  btn.disabled = true;
  document.querySelector('.btn-texto').textContent = 'Enviando...';
  document.getElementById('btnSpinner').style.display = '';

  fetch(API + '/api/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + getToken()
    },
    body: JSON.stringify(payload)
  })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (!data.success) {
        throw new Error(data.message || 'Erro ao criar pedido.');
      }

      localStorage.removeItem('carrinho');
      if (window.atualizarBadgeCarrinho) window.atualizarBadgeCarrinho();

      mostrarConfirmacao(data.order);
    })
    .catch(function (err) {
      alert(err.message || 'Erro ao processar pedido. Tente novamente.');
    })
    .finally(function () {
      btn.disabled = false;
      document.querySelector('.btn-texto').textContent = 'Confirmar Pedido';
      document.getElementById('btnSpinner').style.display = '';
    });
};

/* ========== TELA DE CONFIRMAÇÃO ========== */

function mostrarConfirmacao(order) {
  document.getElementById('checkoutForm').style.display = 'none';
  var confirmacao = document.getElementById('checkoutConfirmacao');
  confirmacao.style.display = '';
  confirmacao.scrollIntoView({ behavior: 'smooth', block: 'center' });

  document.getElementById('confirmacaoPedidoId').textContent = order.id;
  document.getElementById('confirmacaoCliente').textContent = order.customer_name;
  document.getElementById('confirmacaoPagamento').textContent = order.payment_method.toUpperCase();
  document.getElementById('confirmacaoEntrega').textContent = order.address + ', ' + order.city + '/' + order.state;
  document.getElementById('confirmacaoTotal').textContent = formatarPreco(order.total);

  if (order.payment_method === 'pix') {
    document.getElementById('confirmacaoPix').style.display = '';
  }

  if (order.payment_method === 'boleto') {
    document.getElementById('confirmacaoBoleto').style.display = '';
  }
}

/* ========== INICIALIZAÇÃO ========== */
document.addEventListener('DOMContentLoaded', function () {
  carregarPerfil();
  atualizarResumo();
});
