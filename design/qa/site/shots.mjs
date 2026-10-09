// Screen-by-screen screenshots of a page after every reveal has settled.
// usage: node shots.mjs <base> <out-dir> <path> [w] [h] [dpr] [--dark] [--fallback]
import { chromium } from 'playwright';
import { SAFE_ARGS, EXE } from './safe.mjs';
import { mkdirSync } from 'node:fs';
const [,, base, out, path = '/', w = '390', h = '844', dpr = '1'] = process.argv;
const dark = process.argv.includes('--dark');
const fallback = process.argv.includes('--fallback');
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: EXE, args: SAFE_ARGS });
const ctx = await b.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: +dpr, isMobile: +w < 1000, hasTouch: +w < 1000 });
if (dark) await ctx.addInitScript(() => { try { localStorage.setItem('nk-theme', 'dark'); } catch {} });
if (fallback) await ctx.route('**/*.woff2', (r) => r.abort());
await ctx.route('https://calendar.google.com/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<body style="margin:0;background:#fff;font:16px sans-serif"><p style="padding:20px">Google Calendar booking page (mocked)</p></body>' }));
const p = await ctx.newPage();
await p.goto(base + path);
await p.waitForTimeout(2500);
const H = await p.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y < H; y += 400) { await p.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), y); await p.waitForTimeout(100); }
await p.waitForTimeout(1500);
await p.waitForFunction(() => document.getAnimations().every((a) => { if (a.playState !== 'running') return true; const t = a.effect?.getComputedTiming?.(); return !t || t.iterations === Infinity; }), null, { timeout: 10000 }).catch(() => {});
// Pause every looping film and marquee so screenshots are stable.
await p.evaluate(() => document.querySelectorAll('video').forEach((v) => v.pause()));
const total = await p.evaluate(() => document.documentElement.scrollHeight);
const name = (path.replace(/\//g, '_') || '_').replace(/^_|_$/g, '') || 'home';
let i = 0;
for (let y = 0; y < total; y += +h - 60) {
  await p.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), y);
  await p.waitForTimeout(250);
  await p.screenshot({ path: `${out}/${name}-${w}-${String(i++).padStart(2, '0')}.png` });
}
console.log(`${i} shots of ${path} at ${w}x${h}`);
await b.close();
