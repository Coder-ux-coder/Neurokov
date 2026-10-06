// A small stand-in for Netlify, serving a built site the way the CDN does:
// pretty URLs (trailing slash, /about -> 301 /about/), the 404 page with status 404,
// the redirects in netlify.toml, the headers in _headers, and Brotli/gzip compression.
// Usage: node serve.mjs <dist> <port> [--h2]   (--h2 serves HTTP/2 over TLS with a self-signed cert)
import { createServer } from 'node:http';
import { createSecureServer } from 'node:http2';
import { readFile, stat } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { join, extname, resolve, dirname } from 'node:path';
import { brotliCompressSync, gzipSync, constants } from 'node:zlib';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const [distArg, portArg, ...flags] = process.argv.slice(2);
const dist = resolve(distArg ?? 'dist');
const port = Number(portArg ?? 4400);
const h2 = flags.includes('--h2');
const here = dirname(fileURLToPath(import.meta.url));

const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.avif': 'image/avif', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.vtt': 'text/vtt; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};
const compressible = /^(text\/|application\/(json|xml|javascript|manifest)|image\/svg)/;

// _headers: blocks of a path pattern followed by indented "Name: value" lines.
const rules = [];
const headersFile = join(dist, '_headers');
if (existsSync(headersFile)) {
  let cur = null;
  for (const line of readFileSync(headersFile, 'utf8').split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (!/^\s/.test(line)) { cur = { pattern: line.trim(), headers: [] }; rules.push(cur); continue; }
    const i = line.indexOf(':');
    if (cur && i > 0) cur.headers.push([line.slice(0, i).trim(), line.slice(i + 1).trim()]);
  }
}
const matches = (pattern, path) => {
  const re = new RegExp('^' + pattern.split('*').map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$');
  return re.test(path);
};

// netlify.toml redirects
const redirects = [];
const toml = join(dist, '..', 'netlify.toml');
if (existsSync(toml)) {
  const text = readFileSync(toml, 'utf8');
  for (const block of text.split('[[redirects]]').slice(1)) {
    const from = /from\s*=\s*"([^"]+)"/.exec(block)?.[1];
    const to = /to\s*=\s*"([^"]+)"/.exec(block)?.[1];
    const status = Number(/status\s*=\s*(\d+)/.exec(block)?.[1] ?? 301);
    if (from && to) redirects.push({ from, to, status });
  }
}

const cache = new Map();
async function load(file) {
  const s = await stat(file);
  const hit = cache.get(file);
  if (hit && hit.mtime === s.mtimeMs) return hit;
  const body = await readFile(file);
  const entry = { body, mtime: s.mtimeMs };
  cache.set(file, entry);
  return entry;
}

async function resolveFile(pathname) {
  const clean = decodeURIComponent(pathname).replace(/\/+$/, '/');
  const direct = join(dist, clean);
  if (!direct.startsWith(dist)) return null;
  try {
    const s = await stat(direct);
    if (s.isFile()) return { file: direct };
    if (s.isDirectory()) {
      if (!clean.endsWith('/')) return { redirect: clean + '/' };
      if (existsSync(join(direct, 'index.html'))) return { file: join(direct, 'index.html') };
    }
  } catch {}
  if (!clean.endsWith('/') && existsSync(direct + '.html')) return { file: direct + '.html' };
  return null;
}

async function handle(method, rawUrl, reqHeaders, respond) {
  const url = new URL(rawUrl, 'http://x');
  const path = url.pathname;
  for (const r of redirects) {
    if (r.from === path || r.from === path + '/') return respond(r.status, { location: r.to }, '');
  }
  let found = await resolveFile(path);
  let status = 200;
  if (found?.redirect) return respond(301, { location: found.redirect + url.search }, '');
  if (!found) { status = 404; found = { file: join(dist, '404.html') }; }
  const { body } = await load(found.file);
  const type = types[extname(found.file)] ?? 'application/octet-stream';
  const headers = { 'content-type': type, 'cache-control': 'public, max-age=0, must-revalidate' };
  for (const rule of rules) if (matches(rule.pattern, path)) for (const [k, v] of rule.headers) headers[k.toLowerCase()] = v;
  let out = body;
  const ae = String(reqHeaders['accept-encoding'] ?? '');
  if (compressible.test(type) && body.length > 512) {
    const key = found.file + (ae.includes('br') ? ':br' : ':gz');
    let c = cache.get(key);
    const mtime = cache.get(found.file).mtime;
    if (!c || c.mtime !== mtime) {
      c = ae.includes('br')
        ? { body: brotliCompressSync(body, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }), enc: 'br', mtime }
        : ae.includes('gzip') ? { body: gzipSync(body, { level: 9 }), enc: 'gzip', mtime } : null;
      if (c) cache.set(key, c);
    }
    if (c) { out = c.body; headers['content-encoding'] = c.enc; headers['vary'] = 'Accept-Encoding'; }
  }
  // Range requests for video
  const range = reqHeaders['range'];
  if (range && !headers['content-encoding']) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    if (m) {
      const start = m[1] ? Number(m[1]) : 0;
      const end = m[2] ? Math.min(Number(m[2]), body.length - 1) : body.length - 1;
      headers['content-range'] = `bytes ${start}-${end}/${body.length}`;
      headers['accept-ranges'] = 'bytes';
      headers['content-length'] = String(end - start + 1);
      return respond(206, headers, method === 'HEAD' ? '' : body.subarray(start, end + 1));
    }
  }
  headers['accept-ranges'] = 'bytes';
  headers['content-length'] = String(out.length);
  respond(status, headers, method === 'HEAD' ? '' : out);
}

if (h2) {
  const keyFile = join(here, 'key.pem');
  const certFile = join(here, 'cert.pem');
  if (!existsSync(keyFile)) execSync(`openssl req -x509 -newkey rsa:2048 -nodes -keyout ${keyFile} -out ${certFile} -days 30 -subj /CN=localhost 2>/dev/null`);
  const server = createSecureServer({ key: readFileSync(keyFile), cert: readFileSync(certFile), allowHTTP1: true });
  server.on('stream', (stream, headers) => {
    handle(headers[':method'], headers[':path'], headers, (status, h, body) => {
      try { stream.respond({ ':status': status, ...h }); stream.end(body); } catch {}
    }).catch((e) => { try { stream.respond({ ':status': 500 }); stream.end(String(e)); } catch {} });
  });
  server.listen(port, () => console.log(`h2 https://localhost:${port} -> ${dist}`));
} else {
  createServer((req, res) => {
    handle(req.method, req.url, req.headers, (status, h, body) => { res.writeHead(status, h); res.end(body); })
      .catch((e) => { res.writeHead(500); res.end(String(e)); });
  }).listen(port, () => console.log(`http://localhost:${port} -> ${dist}`));
}
