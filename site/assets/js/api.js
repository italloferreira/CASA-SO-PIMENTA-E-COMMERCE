/* api.js — módulo central de chamadas à API Express */

var API_BASE = window.API_BASE_URL || 'http://localhost:3333';

function apiRequest(method, path, body, isFormData) {
  const url = API_BASE + path;
  const token = localStorage.getItem('csp_admin_token');

  const options = { method };

  if (token) {
    options.headers = { 'Authorization': 'Bearer ' + token };
  }

  if (body) {
    if (isFormData) {
      options.body = body;
    } else {
      options.headers = options.headers || {};
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }
  }

  return fetch(url, options).then(function (res) {
    if (res.status === 401) {
      localStorage.removeItem('csp_admin_token');
      window.location.href = '/site/pages/admin/index.html';
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
  if (!path) return '/site/imgs/logo.jpeg';
  if (path.startsWith('http')) return path;
  return API_BASE + path;
}

export { API_BASE, apiRequest, imageUrl };
