// Does a section that waits to be laid out (content-visibility: auto, global.css) cut off anything it
// paints? Such a section paints only inside its own box, so a decoration hanging over its edge (crop
// marks, a shadow, a sticker) would be clipped. Shoots each screen of a page as built, then again
// with no section waiting, in the same load (so the same reveals have run and the same pictures have
// arrived): every screen on phones and tablets, where sections wait all the time; the first screen on
// wider screens, where they wait only until the first move.
// Screen by screen, not a full-page shot: after a full-page shot Playwright stops emulating touch,
// so the page's touch-only rules (bigger tap targets) drop out and the two shots differ for that.
// With reduced motion, so the scrambling labels, flaps and counters hold still between the two shots.
// A section that waits also starts its painting on a whole pixel, so text in it can sit a fraction
// of a pixel off where it would be otherwise: a pixel only counts as cut off when nothing within a
// pixel of it in the other shot comes close to it. Still flagged, though not cut off: a whole-pixel
// shift of a scaled pixel-art drawing's thick edges (a row of a few dozen px) and the screen's last row.
// usage: node clipdiff.mjs <base> <out-dir> [--vps=390x844,1440x900] [--pages=/,/faq/]
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { SAFE_ARGS, EXE } from './safe.mjs';

const [, , BASE, OUT] = process.argv;
const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1] ?? d;
const VPS = arg('vps', '360x740,390x844,768x1024,1024x768,1280x800,1440x900,1920x1080').split(',').map((v) => v.split('x').map(Number));
const PAGES = arg('pages', '/,/about/,/book/,/book/pick-a-time/,/case-studies/,/case-studies/outbound-engine/,/case-studies/psychology-platform/,/case-studies/speed-to-lead/,/faq/,/privacy/,/process/,/services/,/services/lead-conversion/,/services/lead-generation/,/services/lead-reactivation/,/terms/,/x-404/').split(',');
mkdirSync(OUT, { recursive: true });
const STILL = `*, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }
  .marquee__track, .cta__track { transform: none !important; }
  video, .clip__toggle, .clip__full, .clip__bar, canvas, [data-ruler] { visibility: hidden !important; }
  [data-dither] img { opacity: 1 !important; filter: none !important; }`;
const NO_WAIT = 'main > section, body > .footer { content-visibility: visible !important; }';
const browser = await chromium.launch({ executablePath: EXE, args: SAFE_ARGS });
const frames = (page) => page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));

// Pixels of a with nothing like them within a pixel in b (each channel within NEAR), painted red in
// a faded copy of a.
const NEAR = 72;
function unmatched(a, b, diff) {
  const { width: W, height: H } = a;
  let n = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    let found = false;
    for (let dy = -1; dy <= 1 && !found; dy++) for (let dx = -1; dx <= 1 && !found; dx++) {
      const yy = y + dy, xx = x + dx;
      if (yy < 0 || yy >= H || xx < 0 || xx >= W) continue;
      const j = (yy * W + xx) * 4;
      found = Math.abs(a.data[i] - b.data[j]) <= NEAR && Math.abs(a.data[i + 1] - b.data[j + 1]) <= NEAR && Math.abs(a.data[i + 2] - b.data[j + 2]) <= NEAR;
    }
    const grey = 255 - (255 - (a.data[i] + a.data[i + 1] + a.data[i + 2]) / 3) * 0.2;
    diff.data.set(found ? [grey, grey, grey, 255] : [255, 0, 0, 255], i);
    if (!found) n++;
  }
  return n;
}

// Each screen of the page as built and with no section waiting; the screens that differ.
async function check(path, w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce', ...(w < 1000 ? { isMobile: true, hasTouch: true } : {}) });
  const page = await ctx.newPage();
  await page.goto(BASE + path, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  await page.addStyleTag({ content: STILL });
  const noWait = await page.addStyleTag({ content: NO_WAIT });
  await noWait.evaluate((el) => { el.disabled = true; });
  const wide = w > 1100;
  const found = [];
  const ends = wide ? [0] : [];
  if (!wide) for (let y = 0; y < (await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)) + h; y += h) ends.push(y);
  for (const y of ends) {
    await page.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), y);
    await page.waitForTimeout(150);
    await frames(page);
    const at = await page.evaluate(() => scrollY);
    const waits = PNG.sync.read(await page.screenshot());
    await noWait.evaluate((el) => { el.disabled = false; });
    await frames(page);
    const shown = PNG.sync.read(await page.screenshot());
    await noWait.evaluate((el) => { el.disabled = true; });
    await frames(page);
    if (await page.evaluate(() => scrollY) !== at) found.push({ at, n: -1 });
    const diff = new PNG({ width: shown.width, height: shown.height });
    const n = unmatched(shown, waits, diff);
    if (n) found.push({ at, n, diff, shown, waits });
  }
  await ctx.close();
  return found;
}

let problems = 0;
try {
  for (const [w, h] of VPS) for (const path of PAGES) {
    const name = `${w}x${h} ${path}`;
    const found = await check(path, w, h);
    if (!found.length) { console.log(`  ${name}: nothing cut off`); continue; }
    problems++;
    for (const { at, n, diff, shown, waits } of found) {
      if (n < 0) { console.log(`✗ ${name}: the page scrolled when sections stopped waiting, at ${at}`); continue; }
      const file = join(OUT, `${w}-${(path.replace(/\//g, '_') || '_').replace(/^_|_$/g, '') || 'home'}-${at}`);
      writeFileSync(`${file}-diff.png`, PNG.sync.write(diff));
      writeFileSync(`${file}-shown.png`, PNG.sync.write(shown));
      writeFileSync(`${file}-waits.png`, PNG.sync.write(waits));
      console.log(`✗ ${name}: ${n} px cut off on the screen at ${at}`);
    }
  }
} finally {
  await browser.close();
}
console.log(problems ? `\n${problems} view(s) with something cut off.` : '\nNothing cut off anywhere.');
