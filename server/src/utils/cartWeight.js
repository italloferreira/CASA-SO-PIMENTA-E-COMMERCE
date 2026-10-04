// Calculo de peso do carrinho em lote.
//
// Antes: uma query por item do carrinho (N+1).
// Agora: 2 queries no total, independentemente do tamanho do carrinho.
//
// A ordem das operacoes e identica a original, item a item, para que o
// total_weight resultante seja exatamente o mesmo numero de antes.

const DEFAULT_WEIGHT_LIGHT = 0.1;
const DEFAULT_WEIGHT_HEAVY = 0.3;
const LIGHT_CATEGORIES = ['farinhas', 'castanhas', 'temperos', 'chas', 'graos', 'cocos'];

export function getDefaultWeight(categorySlug) {
  if (categorySlug && LIGHT_CATEGORIES.includes(String(categorySlug).toLowerCase())) {
    return DEFAULT_WEIGHT_LIGHT;
  }
  return DEFAULT_WEIGHT_HEAVY;
}

// Busca em lote pesos de produtos e composicao de kits.
// Retorna Maps prontos para o calculo.
export async function loadCartWeights(client, items) {
  const productIds = [];
  const kitIds = [];

  for (const item of items) {
    if (item.product_id) {
      productIds.push(item.product_id);
    } else if (item.kit_id) {
      kitIds.push(item.kit_id);
    }
  }

  const productById = new Map();
  const kitById = new Map();

  if (productIds.length > 0) {
    const uniqueProducts = [...new Set(productIds)];
    const result = await client.query(
      `SELECT p.id, p.weight, c.slug as category_slug
         FROM products p
         LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.id = ANY($1::int[])`,
      [uniqueProducts]
    );
    for (const row of result.rows) {
      const stored = Number(row.weight) || 0;
      productById.set(row.id, stored > 0 ? stored : getDefaultWeight(row.category_slug));
    }
  }

  if (kitIds.length > 0) {
    const uniqueKits = [...new Set(kitIds)];
    const result = await client.query(
      `SELECT ki.kit_id, ki.quantity, p.weight, c.slug as category_slug
         FROM kit_items ki
         JOIN products p ON p.id = ki.product_id
         LEFT JOIN categories c ON c.id = p.category_id
        WHERE ki.kit_id = ANY($1::int[])
        ORDER BY ki.kit_id, ki.id`,
      [uniqueKits]
    );
    for (const row of result.rows) {
      const stored = Number(row.weight) || 0;
      const unit = stored > 0 ? stored : getDefaultWeight(row.category_slug);
      const qty = Number(row.quantity) || 1;
      const list = kitById.get(row.kit_id) || [];
      list.push(unit * qty);
      kitById.set(row.kit_id, list);
    }
  }

  return { productById, kitById };
}

// Soma o peso do carrinho usando os dados carregados em lote.
// Mesma aritmetica e mesma ordem do codigo original.
export function sumCartWeight(items, { productById, kitById }) {
  let totalWeight = 0;

  for (const item of items) {
    let unitWeight = 0;

    if (item.product_id) {
      if (productById.has(item.product_id)) {
        unitWeight = productById.get(item.product_id);
      }
    } else if (item.kit_id) {
      const parts = kitById.get(item.kit_id) || [];
      for (const part of parts) {
        unitWeight += part;
      }
    }

    totalWeight += unitWeight * (item.quantity || 1);
  }

  return totalWeight;
}

// Atalho: carrega e soma em uma chamada.
export async function calculateCartWeight(client, items) {
  const weights = await loadCartWeights(client, items);
  return sumCartWeight(items, weights);
}