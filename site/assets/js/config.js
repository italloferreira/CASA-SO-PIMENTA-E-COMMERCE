/* config.js — URL base da API */

/* categorias vendidas a granel — fonte unica usada por produtos.js e detalhe.js */
window.CATEGORIAS_GRANEL_100G = ['farinhas', 'castanhas', 'chas', 'sementes', 'liofilizados', 'aveias', 'desidratados', 'cocos', 'graos', 'temperos', 'farofas', 'produtos-de-limpeza', 'sal', 'tira-gostos', 'granjeados', 'acucares'];

/* Troque a URL de producao antes do deploy */
var API_BASE_URL = (function () {
  var host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return 'http://localhost:3333';
  if (host.endsWith('.lhr.life')) return window.location.origin;
  return 'https://casa-so-pimenta-api.onrender.com';
})();

function imgUrl(path) {
  if (!path) return '/site/imgs/logo.png';
  if (path.startsWith('http')) return path;
  return (window.API_BASE_URL || 'http://localhost:3333') + path;
}
