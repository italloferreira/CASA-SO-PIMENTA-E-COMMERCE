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

document.addEventListener('DOMContentLoaded', function () {
  loadSettings();

  document.getElementById('settingsForm').addEventListener('submit', function (e) {
    e.preventDefault();
    saveSettings();
  });
});
