// After a build: every link, image, video, script and stylesheet a page points to on this site has to
// exist in dist/ (with the pretty URLs Netlify serves: /about/ is dist/about/index.html). A page
// renamed or a file left out would otherwise ship as a broken link.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const DIST = new URL('../dist/', import.meta.url).pathname;
const SITE = 'https://neurokov.com';

const pages = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (name.endsWith('.html')) pages.push(path);
  }
};
walk(DIST);

const resolves = (url) => {
  const path = decodeURIComponent(url.split(/[?#]/)[0]);
  if (path === '/' || path === '') return true;
  const file = join(DIST, path);
  if (path.endsWith('/')) return existsSync(join(file, 'index.html'));
  return existsSync(file) || existsSync(`${file}.html`) || existsSync(join(file, 'index.html'));
};

const broken = new Map();
for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  const urls = [
    ...[...html.matchAll(/\s(?:href|src|poster|data-src)="([^"]+)"/g)].map((m) => m[1]),
    ...[...html.matchAll(/\ssrcset="([^"]+)"/g)].flatMap((m) => m[1].split(',').map((c) => c.trim().split(/\s+/)[0])),
  ];
  for (let url of urls) {
    url = url.replace(/&amp;/g, '&');
    if (url.startsWith(SITE)) url = url.slice(SITE.length) || '/';
    if (!url.startsWith('/') || url.startsWith('//')) continue; // another site, mailto:, #anchor, data:
    if (url.startsWith('/.netlify/')) continue; // Netlify's own, added as it serves the page
    if (!resolves(url)) {
      const where = `/${relative(DIST, page)}`;
      broken.set(url, [...(broken.get(url) ?? []), where]);
    }
  }
}

if (broken.size) {
  console.error('\n✗ Broken links in the build:\n');
  for (const [url, where] of broken) console.error(`  ${url}  (on ${where.slice(0, 3).join(', ')}${where.length > 3 ? ` +${where.length - 3} more` : ''})`);
  console.error('');
  process.exit(1);
}
console.log(`\n✓ Every link on ${pages.length} pages leads somewhere.\n`);
