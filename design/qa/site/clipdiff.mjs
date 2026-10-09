// Does a section that waits to be laid out (content-visibility: auto, global.css) cut off anything it
// paints? Such a section paints only inside its own box, so a decoration hanging over its edge (crop
// marks, a shadow, a sticker) would be clipped. Compares each page with the same page where no
// section waits: whole pages on phones and tablets (where sections wait all the time), the first
// screen on wider screens (where they wait only until the first move).
// usage: node clipdiff.mjs <base> <out-dir> [--vps=390x844,1440x900] [--pages=/,/faq/]
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
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

async function shot(path, w, h, noWait) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, ...(w < 1000 ? { isMobile: true, hasTouch: true } : {}) });
  const page = await ctx.newPage();
  await page.goto(BASE + path, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  await page.addStyleTag({ content: STILL + (noWait ? NO_WAIT : '') });
  const wide = w > 1100;
  if (!wide) {
    // Every section shown once (and every reveal run), then back to the top.
    for (let y = 0; y < (await page.evaluate(() => document.documentElement.scrollHeight)); y += 400) {
      await page.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), y);
      await page.waitForTimeout(100);
    }
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  }
  await page.waitForTimeout(400);
  const png = PNG.sync.read(await page.screenshot({ fullPage: !wide }));
  await ctx.close();
  return png;
}

let problems = 0;
try {
  for (const [w, h] of VPS) for (const path of PAGES) {
    const [a, b] = [await shot(path, w, h, true), await shot(path, w, h, false)];
    const name = `${w}x${h} ${path}`;
    if (a.width !== b.width || a.height !== b.height) { problems++; console.log(`✗ ${name}: size ${a.width}x${a.height} vs ${b.width}x${b.height}`); continue; }
    const diff = new PNG({ width: a.width, height: a.height });
    const n = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: 0.1 });
    if (n) {
      problems++;
      const file = join(OUT, `${w}-${(path.replace(/\//g, '_') || '_').replace(/^_|_$/g, '') || 'home'}`);
      writeFileSync(`${file}-diff.png`, PNG.sync.write(diff));
      writeFileSync(`${file}-shown.png`, PNG.sync.write(a));
      writeFileSync(`${file}-waits.png`, PNG.sync.write(b));
      console.log(`✗ ${name}: ${n} px cut off`);
    } else console.log(`  ${name}: nothing cut off`);
  }
} finally {
  await browser.close();
}
console.log(problems ? `\n${problems} view(s) with something cut off.` : '\nNothing cut off anywhere.');
