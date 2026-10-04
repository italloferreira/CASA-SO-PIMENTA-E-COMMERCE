import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function request(pathname) {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:3333' + pathname, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', reject);
  });
}

test('FASE 5: com RUN_MIGRATIONS=false, servidor inicia sem rodar DDL', async () => {
  const env = { ...process.env, RUN_MIGRATIONS: 'false', PORT: 3334, NODE_ENV: 'development' };
  const proc = spawn('node', ['src/server.js'], { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] });

  let out = '';
  proc.stdout.on('data', (d) => (out += d.toString()));
  proc.stderr.on('data', (d) => (out += d.toString()));

  // Aguarda ate ouvir 'Servidor rodando'
  const started = new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout ' + out)), 10000);
    proc.stdout.on('data', function onData(d) {
      out += d.toString();
      if (out.includes('Servidor rodando')) {
        clearTimeout(t);
        proc.stdout.off('data', onData);
        resolve(true);
      }
    });
  });

  await started;

  // Deve iniciar rapido e SEM log de createTables
  assert.ok(!out.includes('[migrate]') || false, 'nao deve rodar migrate.mjs');
  assert.ok(!out.includes('createTables'), 'nao deve executar createTables no start');

  // Servidor deve estar respondendo na porta 3334
  const alive = await requestAlive(3334);
  assert.equal(alive, 200, 'deve responder na porta configurada');

  proc.kill('SIGINT');
  await sleep(1000);
});

async function requestAlive(port) {
  return new Promise((resolve) => {
    http.get('http://localhost:' + port + '/api/categories', (res) => {
      resolve(res.statusCode);
      res.resume();
    }).on('error', () => resolve(0));
  });
}