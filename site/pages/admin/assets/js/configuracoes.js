import { protectRoute, showToast } from './admin-auth.js';

protectRoute();

var STORAGE_KEY = 'csp_admin_settings';

var FIELD_MAP = [
  'storeName', 'storeDescription', 'storeLogo',
  'contactEmail', 'contactPhone', 'contactAddress',
  'socialInstagram', 'socialFacebook',
  'paymentMethods', 'paymentChavePix',
  'shippingMinFree', 'shippingDefaultPrice'
];

function loadSettings() {
  var data;
  try { data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch (e) { data = {}; }
  FIELD_MAP.forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.value = data[id] !== undefined ? data[id] : '';
  });
}

function saveSettings() {
  var data = {};
  FIELD_MAP.forEach(function (id) {
    var el = document.getElementById(id);
    if (el) data[id] = el.value;
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  showToast('Configurações salvas com sucesso!');
}

document.addEventListener('DOMContentLoaded', function () {
  loadSettings();

  document.getElementById('settingsForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var btn = document.getElementById('btnSaveSettings');
    btn.textContent = 'Salvando...';
    btn.disabled = true;
    try {
      saveSettings();
    } finally {
      btn.textContent = 'Salvar configurações';
      btn.disabled = false;
    }
  });
});
