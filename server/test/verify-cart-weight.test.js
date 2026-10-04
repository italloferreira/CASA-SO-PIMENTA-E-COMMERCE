import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadCartWeights, sumCartWeight, calculateCartWeight, getDefaultWeight } from '../src/utils/cartWeight.js';

// ---- Reimplementacao literal do codigo original, para comparar ----
const DEFAULT_WEIGHT_LIGHT = 0.1;
const DEFAULT_WEIGHT_HEAVY = 0.3;
const LIGHT_CATEGORIES = ['farinhas', 'castanhas', 'temperos', 'chas', 'graos', 'cocos'];

function origGetDefaultWeight(categorySlug) {
  if (categorySlug && LIGHT_CATEGORIES.includes(categorySlug.toLowerCase())) {
    return DEFAULT_WEIGHT_LIGHT;
  }
  return DEFAULT_WEIGHT_HEAVY;
}

async function origSum(client, items) {
  let totalWeight = 0;
  for (const item of items) {
    let unitWeight = 0;
    if (item.product_id) {
      const result = await client.query(
        `SELECT p.weight, c.slug as category_slug
           FROM products p
           LEFT JOIN categories c ON c.id = p.category_id
          WHERE p.id = $1`,
        [item.product_id]
      );
      if (result.rows[0]) {
        const stored = Number(result.rows[0].weight) || 0;
        unitWeight = stored > 0 ? stored : origGetDefaultWeight(result.rows[0].category_slug);
      }
    } else if (item.kit_id) {
      const kitItems = await client.query(
        `SELECT p.weight, c.slug as category_slug, ki.quantity
           FROM kit_items ki
           JOIN products p ON p.id = ki.product_id
           LEFT JOIN categories c ON c.id = p.category_id
          WHERE ki.kit_id = $1`,
        [item.kit_id]
      );
      for (const ki of kitItems.rows) {
        const stored = Number(ki.weight) || 0;
        unitWeight += (stored > 0 ? stored : origGetDefaultWeight(ki.category_slug)) * (Number(ki.quantity) || 1);
      }
    }
    totalWeight += unitWeight * (item.quantity || 1);
  }
  return totalWeight;
}

// ---- Fake client com o mesmo formato de dados do Postgres real ----
function makeFakeClient(data) {
  let queries = 0;
  return {
    get queries() { return queries; },
    async query(sql, params) {
      queries++;

      // Versao em lote: ANY($1::int[])
      if (/FROM products p/.test(sql) && /ANY/.test(sql)) {
        const ids = params[0];
        return { rows: data.products.filter((p) => ids.includes(p.id)) };
      }
      if (/FROM kit_items ki/.test(sql) && /ANY/.test(sql)) {
        const ids = params[0];
        return { rows: data.kitItems.filter((k) => ids.includes(k.kit_id)) };
      }

      // Versao original: WHERE p.id = $1 / WHERE ki.kit_id = $1
      if (/FROM products p/.test(sql)) {
        const id = params[0];
        return { rows: data.products.filter((p) => p.id === id) };
      }
      if (/FROM kit_items ki/.test(sql)) {
        const id = params[0];
        return { rows: data.kitItems.filter((k) => k.kit_id === id) };
      }

      throw new Error('SQL inesperado: ' + sql.slice(0, 80));
    }
  };
}

const DATA = {
  products: [
    { id: 1, weight: 0.5, category_slug: 'molhos' },
    { id: 2, weight: 0, category_slug: 'farinhas' },
    { id: 3, weight: 0, category_slug: 'molhos' },
    { id: 4, weight: 1.25, category_slug: 'azeites' },
    { id: 5, weight: 0, category_slug: 'graos' },
    { id: 6, weight: 0.75, category_slug: null }
  ],
  kitItems: [
    { kit_id: 100, quantity: 1, weight: 0.5, category_slug: 'molhos' },
    { kit_id: 100, quantity: 2, weight: 0, category_slug: 'farinhas' },
    { kit_id: 101, quantity: 1, weight: 0, category_slug: 'temperos' },
    { kit_id: 101, quantity: 1, weight: 1.25, category_slug: 'azeites' },
    { kit_id: 102, quantity: 3, weight: 0.2, category_slug: 'chas' }
  ]
};

const CARTS = [
  [],
  [{ product_id: 1, quantity: 1 }],
  [{ product_id: 2, quantity: 3 }],
  [{ product_id: 1, quantity: 2 }, { product_id: 4, quantity: 1 }],
  [{ kit_id: 100, quantity: 1 }],
  [{ kit_id: 100, quantity: 2 }, { product_id: 3, quantity: 5 }],
  [{ kit_id: 101, quantity: 1 }, { kit_id: 102, quantity: 3 }],
  [{ product_id: 1, quantity: 1 }, { product_id: 2, quantity: 1 }, { product_id: 3, quantity: 1 },
   { product_id: 4, quantity: 2 }, { product_id: 5, quantity: 1 }, { product_id: 6, quantity: 4 },
   { kit_id: 100, quantity: 1 }, { kit_id: 101, quantity: 2 }, { kit_id: 102, quantity: 1 }],
  [{ product_id: 1, quantity: 1 }, { product_id: 1, quantity: 1 }, { product_id: 1, quantity: 1 }],
  [{ product_id: 999, quantity: 1 }],
  [{ kit_id: 999, quantity: 1 }],
  [{ product_id: 1, quantity: 0 }],
  [{ product_id: 1 }],
  [{ kit_id: 100 }],
  [{ product_id: 1, kit_id: 100, quantity: 2 }]
];

// ---------------------------------------------------------------- testes

test('FASE 3: peso do carrinho e identico ao calculo original (item a item)', async () => {
  for (const cart of CARTS) {
    const fast = makeFakeClient(DATA);
    const slow = makeFakeClient(DATA);

    const esperado = await origSum(slow, cart);
    const obtido = await calculateCartWeight(fast, cart);

    assert.equal(obtido, esperado, 'divergiu para o carrinho: ' + JSON.stringify(cart));
  }
});

test('FASE 3: peso e sempre um numero finito e nao negativo', async () => {
  for (const cart of CARTS) {
    const fast = makeFakeClient(DATA);
    const total = await calculateCartWeight(fast, cart);
    assert.ok(Number.isFinite(total), 'peso deve ser finito');
    assert.ok(total >= 0, 'peso nao pode ser negativo');
  }
});

test('FASE 3: a versao em lote usa no maximo 2 queries, o original usa 1 por item', async () => {
  const carrinhoGrande = [];
  for (let i = 0; i < 30; i++) {
    carrinhoGrande.push({ product_id: (i % 6) + 1, quantity: 1 });
    carrinhoGrande.push({ kit_id: 100 + (i % 3), quantity: 1 });
  }

  const fast = makeFakeClient(DATA);
  await calculateCartWeight(fast, carrinhoGrande);
  assert.ok(fast.queries <= 2, 'a versao em lote deve usar no maximo 2 queries (usou ' + fast.queries + ')');

  const slow = makeFakeClient(DATA);
  await origSum(slow, carrinhoGrande);
  assert.equal(slow.queries, carrinhoGrande.length, 'o original deve usar 1 query por item');
});

test('FASE 3: ids repetidos sao deduplicados na consulta', async () => {
  const cart = [
    { product_id: 1, quantity: 1 },
    { product_id: 1, quantity: 1 },
    { product_id: 1, quantity: 1 },
    { kit_id: 100, quantity: 1 },
    { kit_id: 100, quantity: 1 }
  ];

  const client = makeFakeClient(DATA);
  const total = await calculateCartWeight(client, cart);

  assert.equal(total, 0.5 * 1 + 0.5 * 1 + 0.5 * 1 + 0.7 * 1 + 0.7 * 1);
  assert.equal(client.queries, 2, 'deve fazer 1 query de produtos e 1 de kits');
});

test('FASE 3: carrinho vazio devolve zero sem tocar no banco', async () => {
  const client = makeFakeClient(DATA);
  const total = await calculateCartWeight(client, []);
  assert.equal(total, 0);
  assert.equal(client.queries, 0, 'carrinho vazio nao deve gerar query');
});

test('FASE 3: peso default por categoria continua igual', () => {
  for (const slug of LIGHT_CATEGORIES) {
    assert.equal(getDefaultWeight(slug), 0.1, slug + ' deve usar 0.1');
    assert.equal(getDefaultWeight(slug.toUpperCase()), 0.1, slug + ' deve ignorar caixa');
  }
  for (const slug of ['molhos', 'azeites', 'conservas', null, undefined, '']) {
    assert.equal(getDefaultWeight(slug), 0.3, String(slug) + ' deve usar 0.3');
  }
});

test('FASE 3: loadCartWeights + sumCartWeight equivalem ao atalho calculateCartWeight', async () => {
  for (const cart of CARTS) {
    const a = makeFakeClient(DATA);
    const b = makeFakeClient(DATA);
    const viaAtalho = await calculateCartWeight(a, cart);
    const w = await loadCartWeights(b, cart);
    const viaPassoAPasso = sumCartWeight(cart, w);
    assert.equal(viaPassoAPasso, viaAtalho);
  }
});

test('FASE 3: produto inexistente e kit inexistente contribuem zero', async () => {
  const client = makeFakeClient(DATA);
  const total = await calculateCartWeight(client, [
    { product_id: 999, quantity: 10 },
    { kit_id: 999, quantity: 10 },
    { product_id: 1, quantity: 1 }
  ]);
  assert.equal(total, 0.5);
});

test('FASE 3: item com product_id tem prioridade sobre kit_id', async () => {
  const client = makeFakeClient(DATA);
  const total = await calculateCartWeight(client, [{ product_id: 1, kit_id: 100, quantity: 1 }]);
  assert.equal(total, 0.5, 'deve usar apenas o peso do produto');
});

test('FASE 3: soma com muitas casas decimais nao perde precisao relativa ao original', async () => {
  const dados = {
    products: [{ id: 1, weight: 0.123, category_slug: 'molhos' }],
    kitItems: [{ kit_id: 10, quantity: 0.7, weight: 0.333, category_slug: 'azeites' }]
  };
  const cart = [];
  for (let i = 0; i < 50; i++) cart.push({ product_id: 1, quantity: 1 });
  for (let i = 0; i < 20; i++) cart.push({ kit_id: 10, quantity: 1 });

  const esperado = await origSum(makeFakeClient(dados), cart);
  const obtido = await calculateCartWeight(makeFakeClient(dados), cart);
  assert.equal(obtido, esperado);
});