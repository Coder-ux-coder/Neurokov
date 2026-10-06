// Fails the build when the security headers would block the site's own code or wouldn't be
// sent at all. They live in public/_headers, which Astro copies into dist/ for Netlify.
// The Content-Security-Policy lets an inline script run only by its sha256 hash, and a
// hash changes whenever its script does (an edit to the theme script in Base.astro, or
// an Astro upgrade that wraps it differently), so every inline script in the build is
// hashed and looked up here.
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const problems = [];

// dist/_headers: a path on its own line, then its "Name: value" lines, indented. Netlify skips a
// line it can't read, so one is an error here.
const rules = new Map();
const headers = await readFile(join(dist, '_headers'), 'utf8').catch(() => null);
if (headers === null) problems.push('dist/_headers is missing, so Netlify would send no headers at all. Run astro build first.');
let rule = null;
for (const [i, line] of (headers ?? '').split(/\r?\n/).entries()) {
  if (!line.trim() || line.trim().startsWith('#')) continue;
  if (/^\S/.test(line)) {
    if (!line.startsWith('/')) problems.push(`Line ${i + 1} of public/_headers should be a path, starting with /, or indented: "${line.trim()}".`);
    rules.set(line.trim(), (rule = new Map()));
  } else if (rule && /^\s+[\w-]+:\s*\S/.test(line)) rule.set(line.slice(0, line.indexOf(':')).trim(), line.slice(line.indexOf(':') + 1).trim());
  else problems.push(`Line ${i + 1} of public/_headers isn't a header under a path: "${line.trim()}".`);
}

const csp = rules.get('/*')?.get('Content-Security-Policy') ?? '';
const scriptSrc = csp.split(';').map((d) => d.trim()).find((d) => d.startsWith('script-src ')) ?? '';
if (headers !== null && !scriptSrc) problems.push('The Content-Security-Policy for /* in public/_headers has no script-src.');
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
    // Data never runs (the JSON-LD), except speculation rules (Base.astro): the browser follows those only
    // when script-src allows them by hash, like a script.
    if (type && !['module', 'text/javascript', 'application/javascript', 'speculationrules'].includes(type)) continue;
    scripts++;
    const hash = `sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}`;
    if (!needed.has(hash)) needed.set(hash, []);
    needed.get(hash).push(page);
  }
}
if (scriptSrc) {
  for (const [hash, pages] of needed) {
    if (allowed.has(hash)) continue;
    const shown = pages.slice(0, 3).join(', ') + (pages.length > 3 ? ` +${pages.length - 3} more` : '');
    problems.push(`An inline script on ${shown} would be blocked. Add '${hash}' to script-src in public/_headers.`);
  }
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
