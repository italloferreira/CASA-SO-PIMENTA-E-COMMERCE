/* config.js — URL base da API */
/* Troque a URL de producao antes do deploy */
var API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:3333'
  : 'https://casa-so-pimenta-api.onrender.com';
