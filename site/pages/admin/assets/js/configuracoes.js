import { protectRoute, showToast } from './admin-auth.js';
import { apiRequest } from '../../../../assets/js/api.js';

protectRoute();

var FIELD_MAP = {
  storeName: 'store_name',
  storeDescription: 'store_description',
  storeLogo: 'store_logo',
  storeHours: 'store_hours',
  contactEmail: 'contact_email',
  contactPhone: 'contact_phone',
  contactAddress: 'contact_address',
  socialInstagram: 'social_instagram',
  socialFacebook: 'social_facebook',
  paymentMethods: 'payment_methods',
  paymentChavePix: 'pix_key',
  pixKeyType: 'pix_key_type',
  pixRecipientName: 'pix_recipient_name',
  pixDiscountPercent: 'pix_discount_percent',
  socialTiktok: 'social_tiktok',
  shippingMinFree: 'free_shipping_from'
};

function loadSettings() {
  apiRequest('GET', '/api/settings')
    .then(function (data) {
      if (!data.settings) return;
      Object.keys(FIELD_MAP).forEach(function (id) {
        var key = FIELD_MAP[id];
        var el = document.getElementById(id);
        if (el) el.value = data.settings[key] !== undefined ? data.settings[key] : '';
      });
    })
    .catch(function (err) {
      showToast('Erro ao carregar configurações: ' + err.message, 'error');
    });
}

function saveSettings() {
  var payload = {};
  Object.keys(FIELD_MAP).forEach(function (id) {
    var el = document.getElementById(id);
    if (el) payload[FIELD_MAP[id]] = el.value;
  });

  var btn = document.getElementById('btnSaveSettings');
  btn.textContent = 'Salvando...';
  btn.disabled = true;

  apiRequest('PUT', '/api/settings', payload)
    .then(function () {
      showToast('Configurações salvas com sucesso!');
    })
    .catch(function (err) {
      showToast('Erro ao salvar: ' + err.message, 'error');
    })
    .finally(function () {
      btn.textContent = 'Salvar configurações';
      btn.disabled = false;
    });
}

function loadMelhorEnvioStatus() {
  var statusEl = document.getElementById('me-status-text');
  var container = document.getElementById('me-status');

  apiRequest('GET', '/api/melhor-envio/status')
    .then(function (data) {
      if (!data.connected) {
        statusEl.innerHTML = '<span style="color:#e74c3c;">&#10007; Não conectado</span>';
        var btnConnect = document.createElement('button');
        btnConnect.type = 'button';
        btnConnect.className = 'btn btn-primary';
        btnConnect.textContent = 'Vincular Melhor Envio';
        btnConnect.style.marginLeft = '8px';
        btnConnect.addEventListener('click', function () {
          apiRequest('GET', '/api/melhor-envio/auth')
            .then(function (res) {
              if (res.url) window.location.href = res.url;
            })
            .catch(function (err) {
              showToast('Erro ao gerar link: ' + err.message, 'error');
            });
        });
        container.appendChild(btnConnect);
        return;
      }

      if (data.expired) {
        statusEl.innerHTML = '<span style="color:#e67e22;">&#9888; Token expirado</span>';
        var btnReconnect = document.createElement('button');
        btnReconnect.type = 'button';
        btnReconnect.className = 'btn btn-primary';
        btnReconnect.textContent = 'Reconectar';
        btnReconnect.style.marginLeft = '8px';
        btnReconnect.addEventListener('click', function () {
          apiRequest('GET', '/api/melhor-envio/auth')
            .then(function (res) {
              if (res.url) window.location.href = res.url;
            })
            .catch(function (err) {
              showToast('Erro ao gerar link: ' + err.message, 'error');
            });
        });
        container.appendChild(btnReconnect);
        return;
      }

      statusEl.innerHTML = '<span style="color:#27ae60;">&#10003; Conectado</span> <span style="color:#888;font-size:13px;">(expira em ' + data.expires_in_days + ' dias)</span>';

      var btnDisconnect = document.createElement('button');
      btnDisconnect.type = 'button';
      btnDisconnect.className = 'btn';
      btnDisconnect.textContent = 'Desvincular';
      btnDisconnect.style.marginLeft = '8px';
      btnDisconnect.style.color = '#e74c3c';
      btnDisconnect.style.border = '1px solid #e74c3c';
      btnDisconnect.style.background = 'transparent';
      btnDisconnect.addEventListener('click', function () {
        if (!confirm('Desvincular Melhor Envio? O cálculo de frete parará de funcionar.')) return;
        apiRequest('POST', '/api/melhor-envio/disconnect')
          .then(function () {
            showToast('Integração desvinculada.');
            container.innerHTML = '';
            loadMelhorEnvioStatus();
          })
          .catch(function (err) {
            showToast('Erro: ' + err.message, 'error');
          });
      });
      container.appendChild(btnDisconnect);
    })
    .catch(function () {
      statusEl.innerHTML = '<span style="color:#888;">Não foi possível verificar status</span>';
    });
}

document.addEventListener('DOMContentLoaded', function () {
  loadSettings();
  loadMelhorEnvioStatus();

  var params = new URLSearchParams(window.location.search);
  var meStatus = params.get('me_status');
  if (meStatus === 'connected') {
    showToast('Melhor Envio conectado com sucesso!');
    window.history.replaceState({}, '', window.location.pathname);
  } else if (meStatus === 'error') {
    showToast('Erro ao conectar Melhor Envio. Tente novamente.', 'error');
    window.history.replaceState({}, '', window.location.pathname);
  }

  document.getElementById('settingsForm').addEventListener('submit', function (e) {
    e.preventDefault();
    saveSettings();
  });
});
