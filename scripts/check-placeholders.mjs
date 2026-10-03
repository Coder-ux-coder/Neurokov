// Fails the build while any page still carries a data-ph placeholder marker,
// so made-up numbers, stand-in case studies or an unconnected calendar can't
// go live by accident. `npm run build:draft` skips this for local previews.
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));

async function* htmlFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(path);
    else if (entry.name.endsWith('.html')) yield path;
  }
}

const byKey = new Map();
for await (const file of htmlFiles(dist)) {
  const html = await readFile(file, 'utf8');
  const page = '/' + file.slice(dist.length).replaceAll('\\', '/').replace(/index\.html$/, '');
  for (const [, key] of html.matchAll(/data-ph="([^"]+)"/g)) {
    if (!byKey.has(key)) byKey.set(key, new Set());
    byKey.get(key).add(page);
  }
}

if (byKey.size === 0) {
  console.log('\n✓ No placeholders left. Safe to deploy.\n');
} else {
  console.error('\n✗ Placeholders are still on the site. Replace them before deploying:\n');
  for (const [key, pages] of [...byKey].sort()) {
    const list = [...pages].sort();
    const shown = list.slice(0, 4).join(', ') + (list.length > 4 ? ` +${list.length - 4} more` : '');
    console.error(`  ${key.padEnd(30)} ${shown}`);
  }
  console.error('\nSee them on any page by adding ?review to the URL. For a local preview build, use `npm run build:draft`.\n');
  process.exit(1);
}
