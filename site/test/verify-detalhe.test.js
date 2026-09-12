import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_DIR = path.resolve(__dirname, '..');

const DETALHE_JS = 'assets/js/detalhe.js';

const GRANEL = ['farinhas', 'castanhas', 'chas', 'temperos', 'produtos-de-limpeza'];

function iterateJs(dir) {
  let files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      files = files.concat(iterateJs(path.join(dir, entry.name)));
    } else if (entry.name.endsWith('.js')) {
      files.push(path.join(dir, entry.name));
    }
  }
  return files;
}

test('detalhe.js tem a lista de categorias granel e so renderiza 100g condicionalmente', () => {
  const source = readFileSync(path.join(SITE_DIR, DETALHE_JS), 'utf-8');

  assert.ok(source.includes('CATEGORIAS_COM_MEDIDA_100G'), 'detalhe.js deve definir a constante de categorias granel');
  for (const slug of GRANEL) {
    assert.ok(source.includes("'" + slug + "'"), 'detalhe.js deve incluir a categoria granel ' + slug);
  }

  const ocorrencias100g = source.match(/100g/g) || [];
  assert.equal(ocorrencias100g.length, 1, '100g deve aparecer exatamente 1 vez em detalhe.js (veio ' + ocorrencias100g.length + ')');
  assert.ok(source.includes("? '<p class=\"unidade-de-medida\">100g</p>' : ''"),
    '100g deve estar dentro do ternario de renderização condicional');
  assert.ok(!source.includes('<p class="unidade-de-medida"> 100g </p>'),
    'não pode existir 100g hardcoded como paragrafo incondicional');
});

test('nenhum outro script do site hardcoda 100g', () => {
  const jsFiles = iterateJs(path.join(SITE_DIR, 'assets/js'));
  for (const file of jsFiles) {
    if (file.replace(/\\/g, '/').endsWith(DETALHE_JS)) continue;
    const source = readFileSync(file, 'utf-8');
    assert.ok(
      !source.includes('100g'),
      file.replace(/\\/g, '/') + ' contém "100g" hardcoded'
    );
  }
});