// Long animation frames with script attribution, during load and an optional scroll-through.
import { chromium } from 'playwright';
import { SAFE_ARGS, EXE } from './safe.mjs';
const [,, base, path = '/', vpName = 'mobile', scroll = 'noscroll'] = process.argv;
const VP = { mobile: { viewport:{width:412,height:823}, deviceScaleFactor:1.75, isMobile:true, hasTouch:true }, desktop: { viewport:{width:1350,height:940} } };
const b = await chromium.launch({ executablePath: EXE, args: [...SAFE_ARGS, '--ignore-certificate-errors'] });
const ctx = await b.newContext({ ...VP[vpName], ignoreHTTPSErrors: true });
await ctx.addInitScript(() => {
  window.__loaf = [];
  new PerformanceObserver(l => { for (const e of l.getEntries()) window.__loaf.push({ start: Math.round(e.startTime), dur: Math.round(e.duration), block: Math.round(e.blockingDuration), render: Math.round(e.renderStart ? (e.startTime + e.duration - e.renderStart) : 0), style: Math.round(e.styleAndLayoutStart ? (e.startTime + e.duration - e.styleAndLayoutStart) : 0), scripts: e.scripts.map(s => `${s.invoker} ${s.sourceURL.split('/').pop()}:${s.sourceFunctionName} ${Math.round(s.duration)}ms (forced ${Math.round(s.forcedStyleAndLayoutDuration)})`) }); }).observe({ type: 'long-animation-frame', buffered: true });
});
const cdp = await ctx.newCDPSession(await ctx.newPage().then(p => (globalThis.page = p)));
await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(process.env.CPU ?? 4) });
await page.goto(base + path);
await page.waitForTimeout(6000);
if (scroll === 'scroll') {
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += 500) { await page.evaluate(y => scrollTo(0, y), y); await page.waitForTimeout(300); }
  await page.waitForTimeout(3000);
}
const loaf = await page.evaluate(() => window.__loaf);
const fcp = await page.evaluate(() => performance.getEntriesByName('first-contentful-paint')[0]?.startTime);
console.log('FCP', Math.round(fcp));
for (const l of loaf) console.log(`@${l.start} dur ${l.dur} block ${l.block} style+layout ${l.style} | ${l.scripts.join(' ; ')}`);
await b.close();
