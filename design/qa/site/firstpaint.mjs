// What the main thread does before a page's first paint, from one Lighthouse run's trace: every
// top-level task up to first contentful paint, with the time it spent per kind of work.
// usage: node firstpaint.mjs <url> [--ff=mobile|desktop] [--cpu=1.7] [--live]
import lighthouse from 'lighthouse';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';
import * as chromeLauncher from 'chrome-launcher';

const URL_ = process.argv[2];
const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1] ?? d;
const FF = arg('ff', 'mobile');
const LIVE = process.argv.includes('--live');
const chrome = await chromeLauncher.launch({
  chromePath: process.env.QA_CHROMIUM || undefined,
  chromeFlags: ['--headless=new', '--no-sandbox', '--ignore-certificate-errors', '--disable-gpu', ...(LIVE ? [] : ['--proxy-server=http://127.0.0.1:9', '--proxy-bypass-list=localhost;127.0.0.1', '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost, EXCLUDE 127.0.0.1'])],
});
try {
  const flags = { port: chrome.port, output: 'json', logLevel: 'error', onlyCategories: ['performance'] };
  const r = await lighthouse(URL_, flags, FF === 'desktop' ? desktopConfig : undefined);
  const events = r.artifacts.Trace.traceEvents;
  const nav = events.find((e) => e.name === 'navigationStart' && e.args?.data?.isLoadingMainFrame && e.args?.data?.documentLoaderURL);
  const t0 = nav?.ts ?? events.find((e) => e.name === 'TracingStartedInBrowser').ts;
  const fcpEvt = events.find((e) => e.name === 'firstContentfulPaint' && e.ts > t0);
  const fcp = fcpEvt ? (fcpEvt.ts - t0) / 1000 : null;
  // the renderer main thread of the page
  const mainPid = fcpEvt?.pid;
  const mainTid = fcpEvt?.tid;
  const onMain = events.filter((e) => e.pid === mainPid && e.tid === mainTid && e.ph === 'X' && e.ts >= t0 - 1e6);
  const tops = onMain.filter((e) => e.name === 'RunTask' || e.name === 'ThreadControllerImpl::RunTask').sort((a, b) => a.ts - b.ts);
  const kinds = ['ParseHTML', 'UpdateLayoutTree', 'Layout', 'PrePaint', 'Paint', 'Layerize', 'Commit', 'EvaluateScript', 'v8.compile', 'FunctionCall', 'Decode Image', 'ImageDecodeTask', 'ParseAuthorStyleSheet', 'ScheduleStyleRecalculation', 'HitTest', 'MarkDOMContent', 'v8.run', 'TimerFire', 'FireAnimationFrame', 'GCEvent', 'MajorGC', 'MinorGC', 'UpdateLayerTree', 'PaintImage', 'Rasterize'];
  console.log(`${URL_} ${FF}: FCP observed ${fcp?.toFixed(0)} ms | Lighthouse FCP ${Math.round(r.lhr.audits['first-contentful-paint'].numericValue)} LCP ${Math.round(r.lhr.audits['largest-contentful-paint'].numericValue)} SI ${Math.round(r.lhr.audits['speed-index'].numericValue)} | bench ${Math.round(r.lhr.environment.benchmarkIndex)}`);
  let total = 0;
  for (const t of tops) {
    const start = (t.ts - t0) / 1000;
    if (start > (fcp ?? 0) + 5) break;
    const dur = t.dur / 1000;
    if (dur < 1) continue;
    total += dur;
    const inside = onMain.filter((e) => e.ts >= t.ts && e.ts + (e.dur ?? 0) <= t.ts + t.dur && e !== t);
    const by = {};
    for (const k of kinds) {
      const d = inside.filter((e) => e.name === k).reduce((s, e) => s + (e.dur ?? 0), 0) / 1000;
      if (d >= 0.3) by[k] = d.toFixed(1);
    }
    const urls = [...new Set(inside.filter((e) => e.name === 'EvaluateScript' || e.name === 'v8.compile').map((e) => (e.args?.data?.url ?? '').split('/').pop()).filter(Boolean))];
    console.log(`  @${start.toFixed(0).padStart(5)} ${dur.toFixed(1).padStart(6)} ms  ${JSON.stringify(by)} ${urls.length ? urls.join(',') : ''}`);
  }
  console.log(`  total before FCP: ${total.toFixed(1)} ms`);
} finally {
  await chrome.kill();
}
