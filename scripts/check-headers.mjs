// Fails the build when the security headers would block the site's own code, or when
// their two copies disagree: public/_headers is read by Netlify and Cloudflare Pages,
// vercel.json by Vercel. The Content-Security-Policy lets an inline script run only by
// its sha256 hash, and a hash changes whenever its script does (an edit to the theme
// script in Base.astro, or an Astro upgrade that wraps it differently), so every inline
// script in the build is hashed and looked up here.
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const problems = [];

// public/_headers: "Name: value" lines, indented under the one "/*" rule.
const netlify = new Map(
  (await readFile(join(root, 'public/_headers'), 'utf8'))
    .split(/\r?\n/)
    .filter((line) => /^\s+[\w-]+:/.test(line))
    .map((line) => [line.slice(0, line.indexOf(':')).trim(), line.slice(line.indexOf(':') + 1).trim()]),
);
const vercel = new Map(
  (JSON.parse(await readFile(join(root, 'vercel.json'), 'utf8')).headers.find((rule) => rule.source === '/(.*)')?.headers ?? []).map(
    (h) => [h.key, h.value],
  ),
);
for (const name of new Set([...netlify.keys(), ...vercel.keys()])) {
  if (netlify.get(name) !== vercel.get(name)) problems.push(`${name} differs between public/_headers and vercel.json.`);
}

// Astro copies public/ into the build. Without that copy, Netlify and Cloudflare send no headers at all.
await readFile(join(dist, '_headers')).catch(() => problems.push('dist/_headers is missing. Run astro build first.'));

const csp = netlify.get('Content-Security-Policy') ?? '';
const scriptSrc = csp.split(';').map((d) => d.trim()).find((d) => d.startsWith('script-src ')) ?? '';
if (!scriptSrc) problems.push('The Content-Security-Policy has no script-src.');
const allowed = new Set([...scriptSrc.matchAll(/'(sha256-[^']+)'/g)].map((m) => m[1]));

async function* htmlFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(path);
    else if (entry.name.endsWith('.html')) yield path;
  }
}

const needed = new Map(); // hash -> pages whose inline script has it
let scripts = 0;
for await (const file of htmlFiles(dist)) {
  const html = await readFile(file, 'utf8');
  const page = '/' + file.slice(dist.length).replaceAll('\\', '/').replace(/index\.html$/, '');
  for (const [, attrs, body] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (/\bsrc=/.test(attrs)) continue; // a file, allowed by origin
    const type = attrs.match(/\btype=["']?([^"'\s>]+)/)?.[1];
    if (type && !['module', 'text/javascript', 'application/javascript'].includes(type)) continue; // data (the JSON-LD): never runs
    scripts++;
    const hash = `sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}`;
    if (!needed.has(hash)) needed.set(hash, []);
    needed.get(hash).push(page);
  }
}
for (const [hash, pages] of needed) {
  if (allowed.has(hash)) continue;
  const shown = pages.slice(0, 3).join(', ') + (pages.length > 3 ? ` +${pages.length - 3} more` : '');
  problems.push(`An inline script on ${shown} would be blocked. Add '${hash}' to script-src in public/_headers and vercel.json.`);
}

if (problems.length) {
  console.error('\n✗ The security headers don’t match the build:\n');
  for (const p of problems) console.error(`  ${p}`);
  console.error('');
  process.exit(1);
}
for (const hash of allowed) {
  if (!needed.has(hash)) console.warn(`  Note: '${hash}' in script-src no longer matches any script. It can go.`);
}
console.log(`\n✓ Security headers match the build: ${scripts} inline scripts, ${needed.size} hashes, all allowed.\n`);
