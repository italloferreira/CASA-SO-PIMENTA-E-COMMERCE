/* api.js — módulo central de chamadas à API Express */

var API_BASE = window.API_BASE_URL || 'http://localhost:3333';

function getAuthHeaders() {
  var headers = {};
  var userData = localStorage.getItem('csp_admin_user');
  if (userData) {
    var user = JSON.parse(userData);
    if (user.token) {
      headers['Authorization'] = 'Bearer ' + user.token;
    }
  }
  return headers;
}

function apiRequest(method, path, body, isFormData) {
  const url = API_BASE + path;

  const options = { method, credentials: 'include', cache: 'no-store' };

  if (body) {
    if (isFormData) {
      options.body = body;
    } else {
      options.headers = { 'Content-Type': 'application/json' };
      options.body = JSON.stringify(body);
    }
  }

  var authHeaders = getAuthHeaders();
  if (authHeaders['Authorization']) {
    options.headers = options.headers || {};
    options.headers['Authorization'] = authHeaders['Authorization'];
  }

  return fetch(url, options).then(function (res) {
    if (res.status === 401) {
      localStorage.removeItem('csp_admin_user');
      var isAdminPage = window.location.pathname.indexOf('/admin/') !== -1;
      window.location.href = isAdminPage
        ? '/site/pages/admin/index.html'
        : '/site/pages/login/index.html';
      throw new Error('Sessão expirada. Faça login novamente.');
    }

    if (res.status === 403) {
      throw new Error('Acesso negado. Você não tem permissão.');
    }

    if (!res.ok) {
      return res.json().then(function (data) {
        throw new Error(data.message || 'Erro na requisição.');
      });
    }

    return res.json();
  });
}

function imageUrl(path) {
  if (!path) return '/site/imgs/logo.png';
  if (path.startsWith('http')) return path;
  return API_BASE + path;
}

export { API_BASE, apiRequest, imageUrl, getAuthHeaders };
