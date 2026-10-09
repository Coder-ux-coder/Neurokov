// Checks the sections below the first screen, which wait to be laid out until they near the screen
// (global.css), and on a laptop or desktop until the visitor's first move (shell.ts: .laid-out):
// - the first screen, before any move, looks the same in both builds (a section that waits clips
//   what it paints to its own box);
// - the first move lays the page out (wide screens only);
// - every in-page link, every keyboard stop and every #address lands where it does in build A;
// - the scroll ruler reads 000 at the top and 100 at the bottom.
// usage: node fold.mjs <baseA> <baseB> <out-dir> [--vps=1280x800,1440x900,1920x1080] [--pages=/,/faq/] [--tabs=25]
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { SAFE_ARGS, EXE } from './safe.mjs';

const [, , A, B, OUT] = process.argv;
const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1] ?? d;
const VPS = arg('vps', '1280x800,1440x900,1920x1080').split(',').map((v) => v.split('x').map(Number));
const PAGES = arg('pages', '/,/about/,/book/,/case-studies/,/case-studies/outbound-engine/,/case-studies/psychology-platform/,/case-studies/speed-to-lead/,/faq/,/privacy/,/process/,/services/,/services/lead-conversion/,/services/lead-generation/,/services/lead-reactivation/,/terms/,/x-404/').split(',');
const TABS = Number(arg('tabs', 25));
mkdirSync(OUT, { recursive: true });
const STILL = `*, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }
  .marquee__track, .cta__track { transform: none !important; }
  /* Films: a test browser may not play them, and the two builds handle that differently. */
  video, .clip__toggle, .clip__full, .clip__bar { visibility: hidden !important; }`;
const browser = await chromium.launch({ executablePath: EXE, args: SAFE_ARGS });
const problems = [];
const note = (where, what) => { problems.push(`${where}: ${what}`); console.log(`  ✗ ${where}: ${what}`); };

async function open(base, path, w, h, hash = '') {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, ...(w < 1000 ? { isMobile: true, hasTouch: true } : {}) });
  await ctx.route('https://calendar.google.com/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<p>mock</p>' }));
  const page = await ctx.newPage();
  await page.goto(base + path + hash, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  return { ctx, page };
}
// Until the scroll position holds still for a while (a smooth scroll, sections taking their heights).
const settle = (page) => page.evaluate(() => new Promise((done) => {
  let last = -1, still = 0, frames = 0;
  const tick = () => {
    const y = scrollY;
    still = y === last ? still + 1 : 0;
    last = y;
    if (still >= 20 || ++frames > 600) done(); else requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}));

// Where each in-page link's target ends up after a click on a fresh page (the click is the first move).
async function anchors(base, path, w, h) {
  const { ctx, page } = await open(base, path, w, h);
  const hrefs = await page.evaluate(() => [...new Set([...document.querySelectorAll('a[href^="#"]')].map((a) => a.getAttribute('href')).filter((x) => x.length > 1 && document.getElementById(decodeURIComponent(x.slice(1)))))]);
  await ctx.close();
  const out = {};
  for (const href of hrefs.slice(0, 12)) {
    const { ctx, page } = await open(base, path, w, h);
    const link = page.locator(`a[href="${href}"]`).filter({ visible: true }).first();
    if (!(await link.count())) { await ctx.close(); continue; }
    await link.click({ timeout: 5000 }).catch(() => {});
    await settle(page);
    out[href] = await page.evaluate((id) => Math.round(document.getElementById(id).getBoundingClientRect().top), decodeURIComponent(href.slice(1)));
    await ctx.close();
  }
  return out;
}

// Where the target of each #address ends up when the page is opened at it.
async function fragments(base, path, w, h, hrefs) {
  const out = {};
  for (const href of hrefs.slice(0, 6)) {
    const { ctx, page } = await open(base, path, w, h, href);
    await settle(page);
    out[href] = await page.evaluate((id) => Math.round(document.getElementById(id).getBoundingClientRect().top), decodeURIComponent(href.slice(1)));
    await ctx.close();
  }
  return out;
}

// Tab through the page from the top: is each stop on screen, clear of the bar?
async function tabbing(base, path, w, h) {
  const { ctx, page } = await open(base, path, w, h);
  const stops = [];
  for (let i = 0; i < TABS; i++) {
    await page.keyboard.press('Tab');
    await settle(page);
    stops.push(await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const r = el.getBoundingClientRect();
      const nav = document.querySelector('[data-nav]')?.getBoundingClientRect();
      const inDialog = !!el.closest('dialog');
      const fixed = (() => { for (let e = el; e; e = e.parentElement) if (getComputedStyle(e).position === 'fixed') return true; return false; })();
      const name = el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : '') + (el.getAttribute('href') ? `[${el.getAttribute('href')}]` : '');
      const under = !fixed && !inDialog && nav && r.top < nav.bottom - 2 && r.bottom > nav.top;
      return { name, top: Math.round(r.top), visible: r.bottom > 0 && r.top < innerHeight, under: !!under, fixed };
    }));
  }
  await ctx.close();
  return stops;
}

try {
  for (const [w, h] of VPS) {
    const wide = w > 1100;
    console.log(`\n=== ${w}x${h} ===`);
    for (const path of PAGES) {
      const where = `${w}x${h} ${path}`;
      // 1. The first screen before any move, in both builds.
      const shots = [];
      for (const base of [A, B]) {
        const { ctx, page } = await open(base, path, w, h);
        await page.addStyleTag({ content: STILL });
        await page.evaluate(() => document.querySelectorAll('video').forEach((v) => v.pause()));
        await page.waitForTimeout(300);
        const state = await page.evaluate(() => ({ laidOut: document.documentElement.classList.contains('laid-out'), waiting: [...document.querySelectorAll('main > section:not(:first-child), body > .footer')].filter((s) => getComputedStyle(s).contentVisibility === 'auto').length }));
        if (base === B && state.laidOut) note(where, 'laid out before any move');
        if (base === B && wide && !state.waiting) note(where, 'no section waits on a wide screen');
        shots.push(PNG.sync.read(await page.screenshot()));
        // 2. The first move lays the page out (wide screens), and the ruler reads the ends.
        if (base === B) {
          await page.mouse.move(w / 2, h / 2);
          await page.waitForTimeout(100);
          const laid = await page.evaluate(() => document.documentElement.classList.contains('laid-out'));
          if (wide && !laid) note(where, 'first move did not lay the page out');
          if (!wide && laid) note(where, 'a narrow screen was laid out');
          if (wide) {
            const top = await page.evaluate(() => document.querySelector('[data-ruler-read]')?.textContent);
            await page.keyboard.press('End');
            await settle(page);
            await page.waitForTimeout(200);
            const bottom = await page.evaluate(() => document.querySelector('[data-ruler-read]')?.textContent);
            if (top !== '000' || bottom !== '100') note(where, `ruler reads ${top} at the top, ${bottom} at the bottom`);
          }
        }
        await ctx.close();
      }
      const [a, b] = shots;
      const diff = new PNG({ width: a.width, height: a.height });
      const n = a.height === b.height ? pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: 0.1 }) : -1;
      if (n !== 0) {
        note(where, `first screen differs (${n} px)`);
        const file = join(OUT, `${w}-${(path.replace(/\//g, '_') || '_').replace(/^_|_$/g, '') || 'home'}`);
        writeFileSync(`${file}-first.png`, PNG.sync.write(diff));
        writeFileSync(`${file}-a.png`, PNG.sync.write(a));
        writeFileSync(`${file}-b.png`, PNG.sync.write(b));
      }
      // 3. In-page links, #addresses and keyboard stops land as in build A.
      const [la, lb] = [await anchors(A, path, w, h), await anchors(B, path, w, h)];
      for (const href of Object.keys(la)) if (Math.abs((la[href] ?? 0) - (lb[href] ?? 1e9)) > 1) note(where, `link ${href} lands at ${lb[href]}, was ${la[href]}`);
      const [fa, fb] = [await fragments(A, path, w, h, Object.keys(la)), await fragments(B, path, w, h, Object.keys(la))];
      for (const href of Object.keys(fa)) if (Math.abs(fa[href] - fb[href]) > 1) note(where, `opening at ${href} lands at ${fb[href]}, was ${fa[href]}`);
      const tb = await tabbing(B, path, w, h);
      tb.forEach((s, i) => s && (!s.visible || s.under) && note(where, `tab stop ${i + 1} (${s.name}) ${s.visible ? 'under the bar' : 'off screen'} at ${s.top}`));
      console.log(`${where}: first screen ${n === 0 ? 'same' : 'DIFFERS'} | links ${Object.keys(la).length} | #addresses ${Object.keys(fa).length} | tab stops ${tb.filter(Boolean).length}`);
    }
  }
} finally {
  await browser.close();
}
console.log(problems.length ? `\n${problems.length} problem(s)` : '\nNo problems.');
