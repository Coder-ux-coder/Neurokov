// The main thread's work before a page's first paint (style, layout, parse, script, paint): medians of
// fresh loads with a trace each. Several builds are loaded in turn (A, B, C, A, B, C, ...) so a machine
// that speeds up or slows down mid-run treats them all alike.
// usage: node paintcost.mjs <path,...> <name=base-url> [<name=base-url> ...] [--runs=7] [--vp=mobile|desktop] [--cpu=1]
import { chromium } from 'playwright';
import { SAFE_ARGS, EXE } from './safe.mjs';

const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1] ?? d;
const PATHS = process.argv[2].split(',');
const BUILDS = process.argv.slice(3).filter((a) => !a.startsWith('--')).map((a) => a.split(/=(.*)/s).slice(0, 2));
const RUNS = Number(arg('runs', 7));
const VP = arg('vp', 'mobile');
const CPU = Number(arg('cpu', 1));
const VPS = {
  mobile: { viewport: { width: 412, height: 823 }, deviceScaleFactor: 1.75, isMobile: true, hasTouch: true },
  desktop: { viewport: { width: 1350, height: 940 }, deviceScaleFactor: 1 },
};
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };

async function measure(browser, url) {
  const ctx = await browser.newContext({ ...VPS[VP], ignoreHTTPSErrors: true });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  if (CPU > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
  const events = [];
  cdp.on('Tracing.dataCollected', (e) => events.push(...e.value));
  const done = new Promise((r) => cdp.once('Tracing.tracingComplete', r));
  await cdp.send('Tracing.start', { categories: 'devtools.timeline,loading,blink.user_timing', transferMode: 'ReportEvents' });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(500);
  await cdp.send('Tracing.end');
  await done;
  await ctx.close();
  const nav = events.find((e) => e.name === 'navigationStart' && e.args?.data?.documentLoaderURL === url);
  const fcp = nav && events.find((e) => e.name === 'firstContentfulPaint' && e.ts > nav.ts && e.args?.frame === nav.args?.frame);
  if (!fcp) return null;
  const main = events.filter((e) => e.pid === fcp.pid && e.tid === fcp.tid && e.ph === 'X' && e.ts >= nav.ts && e.ts <= fcp.ts);
  const sum = (...names) => main.filter((e) => names.includes(e.name)).reduce((s, e) => s + (e.dur ?? 0), 0) / 1000;
  // Counts don't depend on how fast the machine is: elements styled and layout objects laid out.
  const count = (name, get) => main.filter((e) => e.name === name).reduce((s, e) => s + (get(e) ?? 0), 0);
  const styled = events.filter((e) => e.pid === fcp.pid && e.tid === fcp.tid && e.name === 'UpdateLayoutTree' && e.ts >= nav.ts && e.ts <= fcp.ts).reduce((s, e) => s + (e.args?.elementCount ?? 0), 0);
  const laidOut = events.filter((e) => e.pid === fcp.pid && e.tid === fcp.tid && e.name === 'Layout' && e.ts >= nav.ts && e.ts <= fcp.ts).reduce((s, e) => s + (e.args?.beginData?.dirtyObjects ?? 0), 0);
  return { fcp: (fcp.ts - nav.ts) / 1000, style: sum('UpdateLayoutTree'), layout: sum('Layout'), parse: sum('ParseHTML'), script: sum('EvaluateScript'), paint: sum('Paint', 'PrePaint'), styled, laidOut, nLayout: count('Layout', () => 1) };
}

const browser = await chromium.launch({ executablePath: EXE, args: [...SAFE_ARGS, '--ignore-certificate-errors'] });
try {
  for (const path of PATHS) {
    const rows = Object.fromEntries(BUILDS.map(([n]) => [n, []]));
    for (let i = 0; i < RUNS; i++) {
      for (const [name, base] of BUILDS) {
        const r = await measure(browser, base + path);
        if (r) rows[name].push(r);
      }
    }
    for (const [name] of BUILDS) {
      const m = (k) => (rows[name].length ? median(rows[name].map((r) => r[k])) : NaN).toFixed(1).padStart(6);
      console.log(`${VP.padEnd(7)} ${path.padEnd(30)} ${name.padEnd(10)} FCP ${m('fcp')} | style ${m('style')} layout ${m('layout')} parse ${m('parse')} script ${m('script')} paint ${m('paint')} ms | styled ${m('styled')} laid out ${m('laidOut')} in ${m('nLayout')} layouts (n=${rows[name].length})`);
    }
  }
} finally {
  await browser.close();
}
