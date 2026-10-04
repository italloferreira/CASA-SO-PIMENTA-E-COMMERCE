// Helper de requisicao HTTP crua: preserva headers e bytes exatos do fio.
import http from 'node:http';
import zlib from 'node:zlib';

const DEFAULT_HOST = process.env.API_TEST_URL || 'http://localhost:3333';

export function rawRequest(pathname, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(pathname, DEFAULT_HOST);
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port || 3333,
        path: url.pathname + url.search,
        method: 'GET',
        headers: {
          'Accept-Encoding': 'gzip, deflate, br',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
          ...headers
        }
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const wire = Buffer.concat(chunks);
          const enc = res.headers['content-encoding'];
          let body = wire;
          try {
            if (enc === 'gzip') body = zlib.gunzipSync(wire);
            else if (enc === 'br') body = zlib.brotliDecompressSync(wire);
            else if (enc === 'deflate') body = zlib.inflateSync(wire);
          } catch {
            body = wire;
          }
          resolve({
            status: res.statusCode,
            headers: res.headers,
            wireBytes: wire.length,
            body,
            text: body.toString('utf8')
          });
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}