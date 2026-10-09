// Layout scan for small screens: overlapping text, overflow, clipped text, small touch targets,
// tiny text, controls hidden under fixed elements. Optionally saves screenshots.
// usage: node layout.mjs <base> <out-dir> [--vps=phone390,...] [--pages=/,/about/] [--fallback] [--dark] [--shots] [--zoom=200]
import { chromium } from 'playwright';
import { SAFE_ARGS, EXE } from './safe.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.argv[2];
const OUT = process.argv[3];
const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1] ?? d;
const flag = (k) => process.argv.includes(`--${k}`);
mkdirSync(OUT, { recursive: true });

const ALL_VPS = {
  phone320: { viewport: { width: 320, height: 568 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  phone360: { viewport: { width: 360, height: 740 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  phone375: { viewport: { width: 375, height: 667 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  phone390: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  phone393: { viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  phone412: { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true },
  phone430: { viewport: { width: 430, height: 932 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  land667: { viewport: { width: 667, height: 375 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  land844: { viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  tab768: { viewport: { width: 768, height: 1024 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  tab820: { viewport: { width: 820, height: 1180 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  tab1024: { viewport: { width: 1024, height: 1366 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  tab1024l: { viewport: { width: 1024, height: 768 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  tab1180l: { viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  tab1366l: { viewport: { width: 1366, height: 1024 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  desk1280: { viewport: { width: 1280, height: 800 } },
  desk1440: { viewport: { width: 1440, height: 900 } },
  desk1920: { viewport: { width: 1920, height: 1080 } },
};
const VPS = arg('vps', 'phone320,phone360,phone375,phone390,phone412,phone430,land667,land844,tab768,tab820,tab1024,tab1024l').split(',');
const PAGES = arg('pages', '/,/about/,/book/,/book/pick-a-time/,/case-studies/,/case-studies/outbound-engine/,/case-studies/psychology-platform/,/case-studies/speed-to-lead/,/faq/,/privacy/,/process/,/services/,/services/lead-conversion/,/services/lead-generation/,/services/lead-reactivation/,/terms/,/x-404/').split(',');
const ZOOM = Number(arg('zoom', 100));

const scan = () => {
  const vw = document.documentElement.clientWidth;
  const vh = innerHeight;
  const out = { overflowX: 0, overlaps: [], offscreen: [], clipped: [], targets: [], tiny: [], covered: [] };
  out.overflowX = document.documentElement.scrollWidth - vw;
  const name = (el) => {
    let s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    const c = typeof el.className === 'string' ? el.className.trim().split(/\s+/).filter(Boolean).slice(0, 2).join('.') : '';
    if (c) s += '.' + c;
    const t = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 28);
    return t ? `${s} "${t}"` : s;
  };
  const hiddenByAncestors = (el) => {
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return true;
      if (n.hasAttribute('hidden') || n.inert) return true;
      if (n.tagName === 'DIALOG' && !n.open) return true;
    }
    return false;
  };
  const decorative = (el) => !!el.closest('[aria-hidden="true"], .sr-only, .ruler, .gridlines');
  // The clip rect an element is seen through (ancestors with overflow other than visible).
  const clipRect = (el) => {
    let r = { left: -Infinity, top: -Infinity, right: Infinity, bottom: Infinity };
    for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible' || cs.clipPath !== 'none' || cs.contain.includes('paint')) {
        const b = n.getBoundingClientRect();
        r = { left: Math.max(r.left, b.left), top: Math.max(r.top, b.top), right: Math.min(r.right, b.right), bottom: Math.min(r.bottom, b.bottom) };
      }
      if (cs.position === 'fixed') break;
    }
    return r;
  };
  // Text fragments: the line boxes of every visible text node.
  const frags = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let t = walker.nextNode(); t; t = walker.nextNode()) {
    if (!t.textContent.trim()) continue;
    const el = t.parentElement;
    if (!el || ['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'OPTION'].includes(el.tagName)) continue;
    if (hiddenByAncestors(el)) continue;
    // A closed <details> doesn't render its answer; fixed bars are checked by coverCheck instead.
    const det = el.closest('details');
    if (det && !det.open && !el.closest('summary')) continue;
    let fixed = false;
    for (let n = el; n; n = n.parentElement) { const p = getComputedStyle(n).position; if (p === 'fixed' || p === 'sticky') { fixed = true; break; } }
    const cs = getComputedStyle(el);
    range.selectNodeContents(t);
    const cr = clipRect(el);
    for (const r of range.getClientRects()) {
      if (r.width < 1 || r.height < 1) continue;
      const vis = { left: Math.max(r.left, cr.left), top: Math.max(r.top, cr.top, 0), right: Math.min(r.right, cr.right), bottom: Math.min(r.bottom, cr.bottom, vh) };
      if (vis.right - vis.left < 1 || vis.bottom - vis.top < 1) continue;
      frags.push({ el, deco: decorative(el), r: vis, h: r.height, fs: parseFloat(cs.fontSize), fixed });
    }
    const fs = parseFloat(cs.fontSize);
    if (fs < 12 && !decorative(el) && !el.closest('sup')) out.tiny.push(`${name(el)} ${fs}px`);
  }
  // Text over text (different elements, neither inside the other).
  for (let i = 0; i < frags.length; i++) {
    for (let j = i + 1; j < frags.length; j++) {
      const a = frags[i], b = frags[j];
      if (a.el === b.el || a.el.contains(b.el) || b.el.contains(a.el) || a.fixed || b.fixed) continue;
      const w = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
      const h = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
      // Tight display type lets one line's box reach into the next: only a real share of a line counts.
      if (w > 2 && h > Math.max(3, 0.35 * Math.min(a.h, b.h))) {
        const both = a.deco && b.deco;
        out.overlaps.push(`${both ? '(decorative) ' : a.deco || b.deco ? '(one decorative) ' : ''}${name(a.el)} <> ${name(b.el)} [${Math.round(w)}x${Math.round(h)} at ${Math.round(Math.max(a.r.left, b.r.left))},${Math.round(Math.max(a.r.top, b.r.top) + scrollY)}]`);
      }
    }
  }
  // Off the side of the screen (not clipped away by an ancestor).
  for (const f of frags) {
    if (f.deco || f.el.closest('.sr-only')) continue;
    if (f.r.right > vw + 1 || f.r.left < -1) out.offscreen.push(`${name(f.el)} ${Math.round(f.r.left)}..${Math.round(f.r.right)} of ${vw}`);
  }
  // Clipped text: an element that hides its own overflowing text.
  for (const el of document.querySelectorAll('body *')) {
    if (hiddenByAncestors(el) || decorative(el)) continue;
    const cs = getComputedStyle(el);
    if (!/hidden|clip/.test(cs.overflowX + cs.overflowY) && cs.textOverflow !== 'ellipsis') continue;
    if (!el.textContent.trim() || el.matches('.w, .w *, .marquee__viewport, .marquee__viewport *, .cta__ticker, .cta__ticker *, .btn__label, .btn__label *, .fc, .fc *')) continue;
    if (el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 2) out.clipped.push(`${name(el)} scroll ${el.scrollWidth}x${el.scrollHeight} > box ${el.clientWidth}x${el.clientHeight}`);
  }
  // Touch targets.
  const controls = [...document.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [tabindex="0"]')].filter((el) => !hiddenByAncestors(el) && !el.closest('[aria-hidden="true"]') && !el.classList.contains('sr-only') && !el.classList.contains('skip-link'));
  for (const el of controls) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    // Links inside running text are exempt (WCAG 2.5.8).
    const inline = el.tagName === 'A' && getComputedStyle(el).display === 'inline' && el.parentElement && /^(P|LI|SPAN|DD|TD|FIGCAPTION|BLOCKQUOTE)$/.test(el.parentElement.tagName) && el.parentElement.textContent.trim().length > el.textContent.trim().length + 10;
    if (inline) continue;
    if (r.width < 44 || r.height < 44) out.targets.push(`${name(el)} ${Math.round(r.width)}x${Math.round(r.height)}${r.width < 24 || r.height < 24 ? ' (<24: fails WCAG 2.5.8)' : ''}`);
  }
  // Controls covered by a fixed element when scrolled to the middle of the screen.
  return out;
};

const coverCheck = async (page) => {
  return page.evaluate(async () => {
    const covered = [];
    const controls = [...document.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, summary')].filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && !el.closest('[aria-hidden="true"], dialog:not([open]), [hidden], .sr-only, .skip-link, .mobile-menu, .nav');
    });
    const maxY = document.documentElement.scrollHeight - innerHeight;
    for (const el of controls) {
      // At the bottom of the page, the last controls can't scroll any higher: are they reachable?
      const top = el.getBoundingClientRect().top + scrollY;
      const y = Math.min(maxY, Math.max(0, top - innerHeight / 2));
      scrollTo({ top: y, behavior: 'instant' });
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const r = el.getBoundingClientRect();
      const pts = [[r.left + r.width / 2, r.top + r.height / 2]];
      for (const [x, yy] of pts) {
        if (x < 0 || yy < 0 || x > innerWidth || yy > innerHeight) continue;
        const hit = document.elementFromPoint(x, yy);
        if (hit && !el.contains(hit) && !hit.contains(el)) {
          const fixedAncestor = (n) => { for (; n; n = n.parentElement) { const p = getComputedStyle(n).position; if (p === 'fixed' || p === 'sticky') return n; } return null; };
          const f = fixedAncestor(hit);
          covered.push(`${el.tagName.toLowerCase()} "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30)}" covered by ${hit.tagName.toLowerCase()}.${typeof hit.className === 'string' ? hit.className.split(' ')[0] : ''}${f ? ' (fixed)' : ''} at y=${Math.round(top)}`);
        }
      }
    }
    scrollTo({ top: 0, behavior: 'instant' });
    return covered;
  });
};

const browser = await chromium.launch({ executablePath: EXE, args: SAFE_ARGS });
const report = {};
for (const vp of VPS) {
  const ctx = await browser.newContext({ ...ALL_VPS[vp], reducedMotion: 'no-preference' });
  await ctx.route('https://api.web3forms.com/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true}' }));
  await ctx.route('https://calendar.google.com/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<p>calendar</p>' }));
  if (flag('fallback')) await ctx.route('**/*.woff2', (r) => r.abort());
  if (flag('dark')) await ctx.addInitScript(() => { try { localStorage.setItem('nk-theme', 'dark'); } catch {} });
  if (ZOOM !== 100) await ctx.addInitScript((z) => { document.addEventListener('DOMContentLoaded', () => { document.documentElement.style.fontSize = `${z}%`; }); }, ZOOM);
  for (const path of PAGES) {
    const page = await ctx.newPage();
    await page.goto(BASE + path);
    await page.waitForTimeout(2500);
    // Scroll through so every reveal runs, then let the animations finish.
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < h; y += 500) { await page.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), y); await page.waitForTimeout(120); }
    await page.waitForTimeout(800);
    await page.waitForFunction(() => document.getAnimations().every((a) => { if (a.playState !== 'running') return true; const t = a.effect?.getComputedTiming?.(); return !t || t.iterations === Infinity; }), null, { timeout: 12000 }).catch(() => {});
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForTimeout(300);
    // Scan with everything laid out: content-visibility skips off-screen sections, so scan page by page.
    const res = { overflowX: 0, overlaps: new Set(), offscreen: new Set(), clipped: new Set(), targets: new Set(), tiny: new Set() };
    const total = await page.evaluate(() => document.documentElement.scrollHeight);
    const vh = ALL_VPS[vp].viewport.height;
    for (let y = 0; y < total; y += Math.round(vh * 0.8)) {
      await page.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), y);
      await page.waitForTimeout(60);
      const r = await page.evaluate(scan);
      res.overflowX = Math.max(res.overflowX, r.overflowX);
      for (const k of ['overlaps', 'offscreen', 'clipped', 'targets', 'tiny']) r[k].forEach((x) => res[k].add(x));
    }
    const covered = await coverCheck(page);
    const entry = { overflowX: res.overflowX, overlaps: [...res.overlaps], offscreen: [...res.offscreen], clipped: [...res.clipped], targets: [...res.targets], tiny: [...res.tiny], covered: [...new Set(covered)] };
    report[`${vp} ${path}`] = entry;
    const n = entry.overlaps.filter((o) => !o.startsWith('(decorative)')).length;
    console.log(`${vp.padEnd(9)} ${path.padEnd(36)} overflowX ${entry.overflowX} | overlaps ${n} | offscreen ${entry.offscreen.length} | clipped ${entry.clipped.length} | small targets ${entry.targets.length} | tiny ${entry.tiny.length} | covered ${entry.covered.length}`);
    if (flag('shots')) {
      const dir = join(OUT, vp);
      mkdirSync(dir, { recursive: true });
      await page.screenshot({ path: join(dir, (path.replace(/\//g, '_') || '_') + '.png'), fullPage: true });
    }
    await page.close();
  }
  await ctx.close();
}
await browser.close();
writeFileSync(join(OUT, 'layout.json'), JSON.stringify(report, null, 2));
