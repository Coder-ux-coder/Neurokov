// First-visit layout shifts per page (fresh context, so the font swap path runs), no scrolling.
import { chromium } from 'playwright';
import { SAFE_ARGS } from './safe.mjs';
const base = process.argv[2];
const PAGES = (process.argv[3] || '/,/about/,/book/,/book/pick-a-time/,/case-studies/,/case-studies/outbound-engine/,/case-studies/psychology-platform/,/case-studies/speed-to-lead/,/faq/,/privacy/,/process/,/services/,/services/lead-conversion/,/services/lead-generation/,/services/lead-reactivation/,/terms/,/x-404/').split(',');
const VPS = { mobile: { viewport:{width:412,height:823}, deviceScaleFactor:1.75, isMobile:true, hasTouch:true }, desktop: { viewport:{width:1350,height:940} }, phone360: { viewport:{width:360,height:740}, deviceScaleFactor:3, isMobile:true, hasTouch:true }, laptop1280: { viewport:{width:1280,height:720} }, tablet: { viewport:{width:768,height:1024}, isMobile:true, hasTouch:true, deviceScaleFactor:2 } };
const which = (process.argv[4] ?? 'mobile,desktop').split(',');
const b = await chromium.launch({ args: [...SAFE_ARGS, '--ignore-certificate-errors'] });
let total = 0;
for (const v of which) for (const path of PAGES) {
  const ctx = await b.newContext({ ...VPS[v], ignoreHTTPSErrors: true });
  await ctx.addInitScript(() => { window.__s = []; new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__s.push({ v: +e.value.toFixed(6), t: Math.round(e.startTime), src: (e.sources||[]).map(s => { const n = s.node; const el = n && (n.nodeType === 1 ? n : n.parentElement); return (n && n.nodeType === 3 ? 'TEXT"' + n.textContent.trim().slice(0,18) + '" in ' : '') + (el ? el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/)[0] : '') : '?') + ` dx${Math.round(s.currentRect.x - s.previousRect.x)} dy${Math.round(s.currentRect.y - s.previousRect.y)}`; }) }); }).observe({ type: 'layout-shift', buffered: true }); });
  const p = await ctx.newPage();
  await p.goto(base + path);
  await p.waitForTimeout(3500);
  const s = await p.evaluate(() => window.__s);
  const sum = s.reduce((a, x) => a + x.v, 0);
  total += sum;
  if (s.length) console.log(v, path, 'CLS', sum.toFixed(5), JSON.stringify(s).slice(0, 700));
  await ctx.close();
}
console.log('total', total.toFixed(5));
await b.close();
