// What changes on a page's first screen after its first paint, while it loads: a screenshot every
// 150 ms for a few seconds, each compared with the last one. Prints how much of the screen differs
// at each moment and where; saves the frames that differ (and the last one) to look at.
// Lighthouse's speed index counts every such change on the first screen against the page.
// usage: node settle.mjs <base> <path,...> <out-dir> [--vp=mobile|desktop] [--secs=4]
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { SAFE_ARGS, EXE } from './safe.mjs';

const [, , BASE, PATHS, OUT] = process.argv;
const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1] ?? d;
const VP = arg('vp', 'mobile');
const SECS = Number(arg('secs', 4));
const VPS = {
  mobile: { viewport: { width: 412, height: 823 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true },
  desktop: { viewport: { width: 1350, height: 940 }, deviceScaleFactor: 1 },
};
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: EXE, args: [...SAFE_ARGS, '--ignore-certificate-errors'] });
try {
  for (const path of PATHS.split(',')) {
    const ctx = await browser.newContext({ ...VPS[VP], ignoreHTTPSErrors: true });
    const page = await ctx.newPage();
    const frames = [];
    const t0 = Date.now();
    const going = page.goto(BASE + path, { waitUntil: 'commit' });
    await going;
    while (Date.now() - t0 < SECS * 1000) {
      const at = Date.now() - t0;
      try { frames.push({ at, png: PNG.sync.read(await page.screenshot({ animations: 'allow', caret: 'initial' })) }); } catch {}
      await page.waitForTimeout(150);
    }
    const last = frames.at(-1).png;
    const { width, height } = last;
    const name = (path.replace(/\//g, '_').replace(/^_|_$/g, '') || 'home') + '-' + VP;
    console.log(`\n${path} (${VP}): ${frames.length} frames`);
    let painted = false;
    frames.forEach((f, i) => {
      let n = 0, x0 = width, y0 = height, x1 = 0, y1 = 0, blank = 0;
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        const k = (y * width + x) * 4;
        const d = Math.abs(f.png.data[k] - last.data[k]) + Math.abs(f.png.data[k + 1] - last.data[k + 1]) + Math.abs(f.png.data[k + 2] - last.data[k + 2]);
        if (f.png.data[k] === 255 && f.png.data[k + 1] === 255 && f.png.data[k + 2] === 255) blank++;
        if (d > 24) { n++; if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
      }
      const isBlank = blank === width * height;
      if (!isBlank) painted = true;
      if (!painted) return;
      const pct = (100 * n) / (width * height);
      console.log(`  ${String(f.at).padStart(5)} ms  ${pct.toFixed(2).padStart(6)}% differs from the last frame${n ? `  box ${x0},${y0} - ${x1},${y1}` : ''}`);
      if (n && i % 2 === 0) writeFileSync(join(OUT, `${name}-${String(f.at).padStart(5, '0')}.png`), PNG.sync.write(f.png));
    });
    writeFileSync(join(OUT, `${name}-last.png`), PNG.sync.write(last));
    await ctx.close();
  }
} finally {
  await browser.close();
}
