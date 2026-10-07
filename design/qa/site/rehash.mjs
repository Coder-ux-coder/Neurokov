// Rewrites script-src in <repo>/public/_headers (and dist/_headers) to exactly the hashes the built
// pages' inline scripts need. usage: node rehash.mjs <repo>
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const repo = process.argv[2];
const dist = join(repo, 'dist');
async function* htmlFiles(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* htmlFiles(p);
    else if (e.name.endsWith('.html')) yield p;
  }
}
const hashes = new Set();
for await (const f of htmlFiles(dist)) {
  const html = await readFile(f, 'utf8');
  for (const [, attrs, body] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (/\bsrc=/.test(attrs)) continue;
    const type = attrs.match(/\btype=["']?([^"'\s>]+)/)?.[1];
    if (type && !['module', 'text/javascript', 'application/javascript', 'speculationrules'].includes(type)) continue;
    hashes.add(`'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`);
  }
}
for (const file of [join(repo, 'public/_headers'), join(dist, '_headers')]) {
  const text = await readFile(file, 'utf8');
  const out = text.replace(/script-src 'self'[^;]*;/, `script-src 'self' ${[...hashes].sort().join(' ')};`);
  await writeFile(file, out);
}
console.log(`script-src now allows ${hashes.size} hashes`);
