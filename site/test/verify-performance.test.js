import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rawRequest } from './helpers/raw-http.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_DIR = path.resolve(__dirname, '..');

function collectFiles(ext, root = SITE_DIR) {
  const files = [];
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (ext.test(e.name)) files.push(p);
    }
  })(root);
  return files;
}

function toRel(p) {
  return '/site/' + path.relative(SITE_DIR, p).split(path.sep).join('/');
}

const HTML_PAGES = collectFiles(/^index\.html$/);
const CODE_FILES = collectFiles(/\.(html|css|js)$/);

// ---------------------------------------------------------------- compression

test('FASE 1: payloads grandes vem compactados quando o browser aceita gzip', async () => {
  const alvos = [
    '/site/assets/css/home.css',
    '/site/assets/css/checkout.css',
    '/site/assets/js/checkout.js',
    '/site/pages/index.html'
  ];

  for (const p of alvos) {
    const r = await rawRequest(p, { 'Accept-Encoding': 'gzip' });
    assert.equal(r.status, 200, p + ' deve responder 200');
    assert.equal(r.headers['content-encoding'], 'gzip', p + ' deve vir com Content-Encoding gzip');
  }
});

test('FASE 1: a compactacao realmente reduz os bytes no fio', async () => {
  const alvos = [
    '/site/assets/css/checkout.css',
    '/site/assets/js/checkout.js',
    '/site/pages/checkout/index.html',
    '/site/pages/index.html',
    '/site/assets/css/produtos.css'
  ];

  for (const p of alvos) {
    const comGzip = await rawRequest(p, { 'Accept-Encoding': 'gzip' });
    const semGzip = await rawRequest(p, { 'Accept-Encoding': 'identity' });

    assert.equal(comGzip.status, 200);
    assert.equal(semGzip.status, 200);
    assert.equal(comGzip.body.length, semGzip.body.length, p + ': corpo descompactado deve ter o mesmo tamanho');
    assert.ok(comGzip.wireBytes < semGzip.wireBytes, p + ': gzip deve enviar menos bytes que identity');
    assert.ok(
      comGzip.wireBytes < semGzip.wireBytes * 0.5,
      p + ': gzip deve reduzir pelo menos 50% (veio ' + comGzip.wireBytes + ' de ' + semGzip.wireBytes + ')'
    );
  }
});

test('FASE 1: total dos assets caiu para menos de 40% do original', async () => {
  let rawTotal = 0;
  let wireTotal = 0;

  for (const p of CODE_FILES) {
    const rel = toRel(p);
    const onDisk = fs.statSync(p).size;
    rawTotal += onDisk;

    const r = await rawRequest(rel, { 'Accept-Encoding': 'gzip' });
    assert.equal(r.status, 200, rel + ' deve responder 200');
    assert.equal(r.body.length, onDisk, rel + ': conteudo deve ser identico ao disco');
    wireTotal += r.wireBytes;
  }

  const pct = 100 * (1 - wireTotal / rawTotal);
  console.log('      payload: ' + (rawTotal / 1024).toFixed(1) + ' KB -> ' + (wireTotal / 1024).toFixed(1) + ' KB (-' + pct.toFixed(1) + '%)');
  assert.ok(pct > 60, 'payload total deve cair mais de 60% (veio ' + pct.toFixed(1) + '%)');
});

// ---------------------------------------------------------------- cache

test('FASE 1: HTML usa no-cache para nunca ficar obsoleto', async () => {
  for (const p of HTML_PAGES) {
    const r = await rawRequest(toRel(p));
    assert.equal(r.status, 200, toRel(p) + ' deve responder 200');
    assert.equal(r.headers['cache-control'], 'no-cache', toRel(p) + ' deve ter Cache-Control no-cache');
  }
});

test('FASE 1: CSS e JS recebem cache publico de 1h', async () => {
  const assets = collectFiles(/\.(css|js)$/).filter((p) => !p.includes(path.sep + 'pages' + path.sep));
  assert.ok(assets.length >= 20, 'deve haver assets de css/js');

  for (const p of assets) {
    const r = await rawRequest(toRel(p));
    assert.equal(r.status, 200, toRel(p) + ' deve responder 200');
    assert.equal(r.headers['cache-control'], 'public, max-age=3600', toRel(p) + ' deve ter cache publico de 1h');
    assert.ok(r.headers['etag'], toRel(p) + ' deve expor ETag');
  }
});

test('FASE 1: revalidacao com ETag devolve 304 sem corpo', async () => {
  const alvos = ['/site/assets/css/produtos.css', '/site/assets/js/home.js', '/site/pages/index.html'];

  for (const p of alvos) {
    const first = await rawRequest(p);
    const etag = first.headers['etag'];
    assert.ok(etag, p + ' deve expor ETag');

    const revalidated = await rawRequest(p, { 'If-None-Match': etag });
    assert.equal(revalidated.status, 304, p + ' deve responder 304 quando o ETag bate (veio ' + revalidated.status + ')');
    assert.equal(revalidated.wireBytes, 0, p + ': resposta 304 nao deve enviar corpo');
  }
});

test('FASE 1: Last-Modified e Vary corretos', async () => {
  const r = await rawRequest('/site/assets/css/home.css', { 'Accept-Encoding': 'gzip' });
  assert.ok(r.headers['last-modified'], 'deve enviar Last-Modified');
  assert.match(r.headers['vary'] || '', /Accept-Encoding/i, 'Vary deve conter Accept-Encoding para CDN');
});

// ---------------------------------------------------------------- integridade

test('FASE 1: nenhum asset alterado byte a byte', async () => {
  for (const p of CODE_FILES) {
    const rel = toRel(p);
    const r = await rawRequest(rel, { 'Accept-Encoding': 'gzip' });
    const onDisk = fs.readFileSync(p);

    assert.equal(r.status, 200, rel + ' deve responder 200');
    assert.equal(r.body.length, onDisk.length, rel + ': tamanho diferente do disco');
    assert.ok(r.body.equals(onDisk), rel + ': bytes diferentes do arquivo em disco');
  }
});

test('FASE 1: toda pagina HTML continua completa e servivel', async () => {
  assert.ok(HTML_PAGES.length >= 40, 'deve haver as mesmas paginas de antes (veio ' + HTML_PAGES.length + ')');

  for (const p of HTML_PAGES) {
    const rel = toRel(p);
    const r = await rawRequest(rel);

    assert.equal(r.status, 200, rel + ' deve responder 200');
    assert.match(r.text, /<html|<!DOCTYPE/i, rel + ' deve conter HTML valido');
    assert.ok(r.text.includes('</html>'), rel + ' deve ter </html> de fechamento');
  }
});

test('FASE 1: imagens seguem servidas sem compactacao e com content-type correto', async () => {
  const imgs = collectFiles(/\.(png|jpg|jpeg|webp|jfif)$/, path.join(SITE_DIR, 'imgs'));
  assert.ok(imgs.length >= 20, 'deve haver as imagens do site');

  for (const p of imgs) {
    const rel = toRel(p);
    const r = await rawRequest(rel);
    assert.equal(r.status, 200, rel + ' deve responder 200');
    assert.match(r.headers['content-type'] || '', /^image\//, rel + ' deve ter content-type de imagem');
    assert.ok(
      !r.headers['content-encoding'],
      rel + ': imagens nao devem ser compactadas (ja sao formato comprimido)'
    );
    assert.equal(r.body.length, fs.statSync(p).size, rel + ': imagem deve ser entregue integra');
  }
});

test('FASE 1: compression nao quebra as respostas JSON da API', async () => {
  const endpoints = [
    '/api/categories',
    '/api/products',
    '/api/products?limit=5',
    '/api/products?featured=true',
    '/api/settings',
    '/api/banners',
    '/api/kits',
    '/api/config/mp-key'
  ];

  for (const p of endpoints) {
    const r = await rawRequest(p, { 'Accept-Encoding': 'gzip' });
    assert.equal(r.status, 200, p + ' deve responder 200');
    assert.match(r.headers['content-type'] || '', /application\/json/, p + ' deve continuar sendo JSON');
    assert.doesNotThrow(() => JSON.parse(r.text), p + ' deve continuar sendo JSON valido apos descompactar');
  }
});

test('FASE 1: rotas de erro continuam respondendo igual', async () => {
  const inexistente = await rawRequest('/site/nao-existe-xyz.html');
  assert.equal(inexistente.status, 404, 'arquivo inexistente deve continuar 404');

  const semAuth = await rawRequest('/api/dashboard');
  assert.equal(semAuth.status, 401, 'rota protegida sem token deve continuar 401');
  assert.match(semAuth.text, /message/, 'erro 401 deve manter o campo message');
});