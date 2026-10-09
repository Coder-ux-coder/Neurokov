// Visual diff of two builds: full-page screenshots with motion stopped, compared pixel by pixel.
// usage: node vdiff.mjs <baseA> <baseB> <outdir> [--vps=1280x800,1440x900] [--pages=/,/about/] [--dark]
import { chromium } from 'playwright';
import { SAFE_ARGS, EXE } from './safe.mjs';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
const [,, A, B, OUT] = process.argv;
const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1] ?? d;
const VPS = arg('vps', '1280x800,1440x900,1920x1080').split(',').map((v) => v.split('x').map(Number));
const PAGES = arg('pages', '/,/about/,/book/,/book/pick-a-time/,/case-studies/,/case-studies/outbound-engine/,/case-studies/psychology-platform/,/case-studies/speed-to-lead/,/faq/,/privacy/,/process/,/services/,/services/lead-conversion/,/services/lead-generation/,/services/lead-reactivation/,/terms/,/x-404/').split(',');
const dark = process.argv.includes('--dark');
const mobile = process.argv.includes('--mobile');
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: EXE, args: SAFE_ARGS });
const STILL = `*, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }
  .marquee__track, .cta__track { transform: none !important; }`;
async function shot(base, path, w, h) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, ...(mobile ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}) });
  if (dark) await ctx.addInitScript(() => { try { localStorage.setItem('nk-theme', 'dark'); } catch {} });
  // Fonts as a returning visitor has them, so both builds paint in the web fonts.
  const p = await ctx.newPage();
  await p.goto(base + path);
  await p.waitForTimeout(1500);
  await p.goto(base + path);
  await p.waitForLoadState('load');
  await p.waitForTimeout(1800);
  await p.addStyleTag({ content: STILL });
  const height = () => p.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < (await height()); y += 400) { await p.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), y); await p.waitForTimeout(120); }
  await p.waitForTimeout(800);
  await p.evaluate(() => {
    document.querySelectorAll('video').forEach((v) => { v.pause(); v.removeAttribute('src'); v.load(); v.classList.remove('is-playing'); });
    document.querySelectorAll('[data-dither]').forEach((m) => m.classList.add('is-developed'));
    document.querySelectorAll('canvas.dither').forEach((c) => c.remove());
    // Live counters and clocks change every frame: blank them in both builds.
    document.querySelectorAll('[data-circuit-clock], [data-circuit-run], [data-tally], [data-out-count], [data-ruler-read], [data-machine] .dot').forEach((e) => (e.style.visibility = 'hidden'));
    scrollTo({ top: 0, behavior: 'instant' });
  });
  await p.waitForTimeout(400);
  const buf = await p.screenshot({ fullPage: true });
  await ctx.close();
  return PNG.sync.read(buf);
}
let worst = 0;
const rows = [];
for (const [w, h] of VPS) for (const path of PAGES) {
  const a = await shot(A, path, w, h);
  const bb = await shot(B, path, w, h);
  const name = `${w}${path.replace(/\//g, '_')}`;
  if (a.width !== bb.width || a.height !== bb.height) {
    rows.push(`${name}: SIZE ${a.width}x${a.height} -> ${bb.width}x${bb.height}`);
    writeFileSync(`${OUT}/${name}-a.png`, PNG.sync.write(a)); writeFileSync(`${OUT}/${name}-b.png`, PNG.sync.write(bb));
    worst = Infinity; continue;
  }
  const diff = new PNG({ width: a.width, height: a.height });
  const n = pixelmatch(a.data, bb.data, diff.data, a.width, a.height, { threshold: 0.1 });
  if (n > 0) { writeFileSync(`${OUT}/${name}-diff.png`, PNG.sync.write(diff)); writeFileSync(`${OUT}/${name}-a.png`, PNG.sync.write(a)); writeFileSync(`${OUT}/${name}-b.png`, PNG.sync.write(bb)); }
  rows.push(`${name}: ${n} px differ`);
  worst = Math.max(worst, n);
}
console.log(rows.join('\n'));
await b.close();
