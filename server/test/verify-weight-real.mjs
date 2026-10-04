// Verifica que o peso calculado em lote bate com o calculo original
// usando o BANCO REAL, nao um fake.
import { pool } from '../src/database/connection.js';
import { calculateCartWeight } from '../src/utils/cartWeight.js';

const DEFAULT_WEIGHT_LIGHT = 0.1;
const DEFAULT_WEIGHT_HEAVY = 0.3;
const LIGHT_CATEGORIES = ['farinhas', 'castanhas', 'temperos', 'chas', 'graos', 'cocos'];

function getDefaultWeight(categorySlug) {
  if (categorySlug && LIGHT_CATEGORIES.includes(categorySlug.toLowerCase())) {
    return DEFAULT_WEIGHT_LIGHT;
  }
  return DEFAULT_WEIGHT_HEAVY;
}

// Codigo original, copiado literalmente
async function origSum(items) {
  let totalWeight = 0;
  for (const item of items) {
    let unitWeight = 0;
    if (item.product_id) {
      const result = await pool.query(`
        SELECT p.weight, c.slug as category_slug
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.id = $1
      `, [item.product_id]);
      if (result.rows[0]) {
        const stored = Number(result.rows[0].weight) || 0;
        unitWeight = stored > 0 ? stored : getDefaultWeight(result.rows[0].category_slug);
      }
    } else if (item.kit_id) {
      const kitItems = await pool.query(`
        SELECT p.weight, c.slug as category_slug, ki.quantity
        FROM kit_items ki
        JOIN products p ON p.id = ki.product_id
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE ki.kit_id = $1
      `, [item.kit_id]);
      for (const ki of kitItems.rows) {
        const stored = Number(ki.weight) || 0;
        unitWeight += (stored > 0 ? stored : getDefaultWeight(ki.category_slug)) * (Number(ki.quantity) || 1);
      }
    }
    totalWeight += unitWeight * (item.quantity || 1);
  }
  return totalWeight;
}

const produtos = await pool.query('SELECT id FROM products ORDER BY id LIMIT 40');
const kits = await pool.query('SELECT kit_id FROM kit_items ORDER BY kit_id LIMIT 15');

if (produtos.rows.length === 0) {
  console.log('AVISO: banco sem produtos, teste ignorado');
  process.exit(0);
}

const idsProdutos = produtos.rows.map((r) => r.id);
const idsKits = [...new Set(kits.rows.map((r) => r.kit_id))];

const carrinhos = [[]];

for (const id of idsProdutos) carrinhos.push([{ product_id: id, quantity: 1 }]);
for (const id of idsKits) carrinhos.push([{ kit_id: id, quantity: 1 }]);
for (const id of idsKits) carrinhos.push([{ kit_id: id, quantity: 3 }]);

const grande = [];
for (let i = 0; i < 25; i++) {
  grande.push({ product_id: idsProdutos[i % idsProdutos.length], quantity: (i % 3) + 1 });
  if (idsKits.length) grande.push({ kit_id: idsKits[i % idsKits.length], quantity: (i % 4) + 1 });
}
carrinhos.push(grande);

carrinhos.push(idsProdutos.map((id) => ({ product_id: id, quantity: 2 })));

if (idsKits.length) carrinhos.push(idsKits.map((id) => ({ kit_id: id, quantity: 2 })));

let falhas = 0;
let totalItens = 0;

for (const cart of carrinhos) {
  const esperado = await origSum(cart);
  const obtido = await calculateCartWeight(pool, cart);
  totalItens += cart.length;
  if (obtido !== esperado) {
    falhas++;
    console.log('DIVERGENCIA: esperado=' + esperado + ' obtido=' + obtido + ' itens=' + JSON.stringify(cart));
  }
}

console.log(carrinhos.length + ' carrinhos testados, ' + totalItens + ' itens no total');
console.log(falhas === 0
  ? 'OK: peso em lote identico ao original em todos os carrinhos do banco real'
  : 'FALHA: ' + falhas + ' divergencias');

await pool.end();
process.exit(falhas === 0 ? 0 : 1);