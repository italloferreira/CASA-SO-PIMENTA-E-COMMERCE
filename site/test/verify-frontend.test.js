import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rawRequest } from './helpers/raw-http.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_DIR = path.resolve(__dirname, '..');

function readUtf(p) { return fs.readFileSync(p, 'utf8'); }

test('FASE 4: produtos.js usa loading="lazy" nas imagens dos cards', () => {
  const src = readUtf(path.join(SITE_DIR, 'assets/js/produtos.js'));
  const matches = src.match(/<img[^>]+>/g) || [];
  const imgs = matches.filter((m) => m.includes('src="') && /cartao|produto/.test(m.toLowerCase()));
  assert.ok(imgs.length >= 1, 'deve gerar imagens de cards');
  const bad = imgs.filter((m) => !/loading="lazy"/.test(m));
  assert.equal(bad.length, 0, 'todas as imagens de produto devem ter loading="lazy"');
});

test('FASE 4: home.js adiciona lazy/async onde apropriado', () => {
  const src = readUtf(path.join(SITE_DIR, 'assets/js/home.js'));
  assert.ok(/loading="lazy"/.test(src), 'deve haver imagens com loading="lazy" na home');
  assert.ok(/decoding="async"/.test(src), 'deve haver imagens com decoding="async" na home');
});

test('FASE 4: detalhe.js usa decoding="async" na imagem principal', () => {
  const src = readUtf(path.join(SITE_DIR, 'assets/js/detalhe.js'));
  assert.ok(/id="produtoImagemPrincipal"[^>]+decoding="async"/.test(src), 'imagem principal deve usar decoding="async"');
});

test('FASE 4: detalhe-kit.js usa decoding="async" na imagem', () => {
  const src = readUtf(path.join(SITE_DIR, 'assets/js/detalhe-kit.js'));
  assert.ok(/<img[^>]+decoding="async"/.test(src), 'imagem do kit deve usar decoding="async"');
});

test('FASE 4: site-settings.js nao faz fetch em loop e ainda aplica configuracoes', async () => {
  const src = readUtf(path.join(SITE_DIR, 'assets/js/site-settings.js'));
  const fetches = src.match(/fetch\(/g) || [];
  assert.equal(fetches.length, 1, 'site-settings.js deve fazer exatamente 1 fetch (a chamada inicial)');
  // verifica que aplica a logica de settings
  assert.ok(/applySettings/.test(src), 'deve ter a funcao applySettings');
  assert.ok(/store_name|store_logo|social_/.test(src), 'deve ter logica de aplicacao de configuracoes');
});

test('FASE 4: fonte continua disponivel', () => {
  const vars = readUtf(path.join(SITE_DIR, 'assets/css/variaveis.css'));
  assert.ok(/font-family.*Poppins|--font-principal|--font-marca/.test(vars), 'variaveis.css deve manter definicoes de fonte');
});

test('FASE 4: a home ainda funciona depois das mudancas', async () => {
  const r = await rawRequest('/site/pages/index.html');
  assert.equal(r.status, 200);
  assert.match(r.text, /<html/i);
  assert.ok(r.text.includes('</html>'));
});

test('FASE 4: todas as paginas carregam CSS sem quebrar', async () => {
  const pages = [];
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name === 'index.html') pages.push(p);
    }
  })(SITE_DIR);

  for (const p of pages) {
    const rel = '/site/' + path.relative(SITE_DIR, p).split(path.sep).join('/');
    const r = await rawRequest(rel);
    assert.equal(r.status, 200, rel + ' deve responder 200');
    assert.match(r.text, /<link[^>]+rel=["']stylesheet["']|<meta[^>]+http-equiv=["']refresh["']/i, rel + ' deve referenciar CSS ou ser redirecionamento');
  }
});