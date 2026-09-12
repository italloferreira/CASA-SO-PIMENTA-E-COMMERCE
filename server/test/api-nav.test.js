import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const API_BASE = process.env.API_TEST_URL || 'http://localhost:3333';

let categories = null;

async function getCategories() {
  const res = await fetch(API_BASE + '/api/categories');
  assert.equal(res.status, 200, 'GET /api/categories deve retornar 200');
  return res.json();
}

async function getProductsByCategory(slug) {
  const res = await fetch(API_BASE + '/api/products?category=' + encodeURIComponent(slug));
  assert.equal(res.status, 200, 'GET /api/products?category=' + slug + ' deve retornar 200');
  return res.json();
}

beforeEach(async () => {
  if (!categories) categories = await getCategories();
});

test('categorias novas e renomeadas estão presentes na API', () => {
  const slugs = categories.map((c) => c.slug);
  const names = categories.map((c) => c.name);

  for (const expected of ['molhos', 'conservas', 'azeites', 'vinagres', 'produtos-de-limpeza', 'kits', 'farinhas']) {
    assert.ok(slugs.includes(expected), 'categoria esperada não encontrada: ' + expected);
  }

  const molhos = categories.find((c) => c.slug === 'molhos');
  assert.equal(molhos.name, 'Molhos', 'molhos deve ter nome Molhos');

  assert.ok(!slugs.includes('pimentas'), 'categoria pimentas não deve existir');
});

test('categorias inalteradas continuam na API', () => {
  const names = categories.map((c) => c.name);
  for (const expected of ['Temperos', 'Farinhas', 'Castanhas', 'Chás', 'Outros', 'Kits']) {
    assert.ok(names.includes(expected), 'categoria inalterada ausente: ' + expected);
  }
});

test('produtos por categoria retornam 200 para todas as novas categorias', async () => {
  for (const slug of ['molhos', 'conservas', 'azeites', 'vinagres', 'produtos-de-limpeza', 'kits', 'farinhas']) {
    const data = await getProductsByCategory(slug);
    assert.ok(Array.isArray(data.products), 'products deve ser array para ' + slug);
    assert.equal(typeof data.total, 'number', 'total deve ser número para ' + slug);
  }
});

test('categoria antiga "pimentas" não quebra a API (retorna vazio)', async () => {
  const data = await getProductsByCategory('pimentas');
  assert.ok(Array.isArray(data.products), 'products deve ser array');
  assert.equal(data.products.length, 0, 'nenhum produto deve restar em pimentas');
});

test('molhos herda os produtos que eram de pimentas', async () => {
  const data = await getProductsByCategory('molhos');
  assert.ok(data.total >= 1, 'molhos deve conter pelo menos 1 produto');
  const first = data.products[0];
  assert.equal(first.category_slug, 'molhos', 'produto deve apontar para categoria molhos');
});