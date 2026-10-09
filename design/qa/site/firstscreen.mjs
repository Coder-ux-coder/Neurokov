// Which of a page's top-level blocks (the children of <main>, and the footer) show on its first screen,
// at every viewport from a small phone to a big monitor: what a page's first paint has to style.
// usage: node firstscreen.mjs <base> [--pages=/,/about/]
import { chromium } from 'playwright';
import { SAFE_ARGS, EXE } from './safe.mjs';

const BASE = process.argv[2];
const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1] ?? d;
const PAGES = arg('pages', '/,/about/,/book/,/book/pick-a-time/,/case-studies/,/case-studies/outbound-engine/,/case-studies/psychology-platform/,/case-studies/speed-to-lead/,/faq/,/privacy/,/process/,/services/,/services/lead-conversion/,/services/lead-generation/,/services/lead-reactivation/,/terms/,/x-404/').split(',');
const VPS = [
  [320, 568], [360, 740], [390, 844], [412, 823], [430, 932], [568, 320], [844, 390], [768, 1024], [1024, 1366], [1024, 768],
  [1280, 620], [1350, 940], [1440, 900], [1920, 1080], [2560, 1440], [1366, 1024],
];
const browser = await chromium.launch({ executablePath: EXE, args: SAFE_ARGS });
try {
  for (const path of PAGES) {
    const seen = {};
    for (const [w, h] of VPS) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: w < 1000, hasTouch: w < 1000 });
      const page = await ctx.newPage();
      await page.goto(BASE + path, { waitUntil: 'domcontentloaded' });
      const blocks = await page.evaluate(() => {
        const out = [];
        const list = [...document.querySelectorAll('main > *'), document.querySelector('body > .footer')].filter(Boolean);
        list.forEach((el) => {
          const r = el.getBoundingClientRect();
          const name = el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : '');
          const idx = el.parentElement.tagName === 'MAIN' ? [...el.parentElement.children].indexOf(el) : 'F';
          if (r.top < innerHeight && r.bottom > 0 && r.height > 0) out.push(`${idx}:${name.slice(0, 40)}(${Math.round(r.top)}-${Math.round(r.bottom)})`);
        });
        return out;
      });
      for (const b of blocks) {
        const key = b.replace(/\(.*\)$/, '');
        (seen[key] ??= []).push(`${w}x${h}@${b.match(/\((-?\d+)/)[1]}`);
      }
      await ctx.close();
    }
    console.log(`\n${path}`);
    for (const [k, v] of Object.entries(seen)) console.log(`  ${k.padEnd(48)} ${v.length === VPS.length ? 'ALL' : v.join(' ')}`);
  }
} finally {
  await browser.close();
}
