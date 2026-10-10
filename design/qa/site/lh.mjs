// Lighthouse runner: N runs per page per form factor, medians of every metric that matters.
// usage: node lh.mjs <base-url> <out.json> [--runs=5] [--pages=/,/about/] [--ff=mobile,desktop] [--throttle=simulate|devtools] [--live] [--fresh]
// --live measures a real address (neurokov.com): without it the browser can reach localhost only.
// --fresh starts a new browser for every run, as PageSpeed does. Otherwise one browser does them all, and
// Lighthouse keeps local storage between runs: from the second run on a page loads as a return visit
// (fonts.ts: the web fonts asked for with the page), with fonts and system caches already warm.
// Besides Lighthouse's estimates it reports what the browser really saw (obs: the FCP, LCP and speed index of
// the unthrottled load, which Lighthouse's model starts from) and the HTML's size in 14,600-byte TCP windows.
import lighthouse from 'lighthouse';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';
import * as chromeLauncher from 'chrome-launcher';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BASE = process.argv[2];
const OUT = process.argv[3];
const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1] ?? d;
const RUNS = Number(arg('runs', 5));
const ALL = '/,/about/,/book/,/book/pick-a-time/,/case-studies/,/case-studies/outbound-engine/,/case-studies/psychology-platform/,/case-studies/speed-to-lead/,/faq/,/privacy/,/process/,/services/,/services/lead-conversion/,/services/lead-generation/,/services/lead-reactivation/,/terms/,/this-page-does-not-exist/';
const PAGES = (arg('pages', 'all') === 'all' ? ALL : arg('pages')).split(',');
const LIVE = process.argv.includes('--live');
const FRESH = process.argv.includes('--fresh');
// PageSpeed Insights doesn't slow its CPU 4x: it sets the slowdown per machine (October 2026: 1.2x on
// a machine scoring about 1330 for phones, 1x on one scoring about 820 for laptops). To see what it
// sees, slow this machine to the same speed: --cpu=mobile:1.7,desktop:2.2 on one that scores 1850.
const CPU = Object.fromEntries(arg('cpu', '').split(',').filter(Boolean).map((x) => x.split(':')).map(([f, v]) => [f, Number(v)]));
const THROTTLING = {
  mobile: { rttMs: 150, throughputKbps: 1638.4, requestLatencyMs: 562.5, downloadThroughputKbps: 1474.56, uploadThroughputKbps: 675, cpuSlowdownMultiplier: 4 },
  desktop: { rttMs: 40, throughputKbps: 10240, requestLatencyMs: 0, downloadThroughputKbps: 0, uploadThroughputKbps: 0, cpuSlowdownMultiplier: 1 },
};
const FFS = arg('ff', 'mobile,desktop').split(',');
const THROTTLE = arg('throttle', 'simulate');
const CATS = arg('cats', 'performance,accessibility,best-practices,seo').split(',');

const launch = (userDataDir) =>
  chromeLauncher.launch({
    // QA_CHROMIUM picks the browser; otherwise chrome-launcher finds the installed Chrome.
    chromePath: process.env.QA_CHROMIUM || undefined,
    userDataDir,
    chromeFlags: ['--headless=new', '--no-sandbox', '--ignore-certificate-errors', '--disable-gpu', ...(LIVE ? [] : ['--proxy-server=http://127.0.0.1:9', '--proxy-bypass-list=localhost;127.0.0.1', '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost, EXCLUDE 127.0.0.1'])],
  });
const shared = FRESH ? null : await launch();

const median = (xs) => {
  const s = xs.filter((x) => x != null && !Number.isNaN(x)).sort((a, b) => a - b);
  if (!s.length) return null;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const results = {};
try {
  for (const ff of FFS) {
    for (const path of PAGES) {
      const runs = [];
      for (let i = 0; i < RUNS; i++) {
        const profile = FRESH ? mkdtempSync(join(tmpdir(), 'lh-')) : undefined;
        const chrome = shared ?? (await launch(profile));
        const flags = { port: chrome.port, output: 'json', logLevel: 'error', onlyCategories: CATS, throttlingMethod: THROTTLE };
        if (CPU[ff]) flags.throttling = { ...THROTTLING[ff], cpuSlowdownMultiplier: CPU[ff] };
        const config = ff === 'desktop' ? desktopConfig : undefined;
        let r = await lighthouse(BASE + path, flags, config);
        // A run now and then comes back empty (no paint seen): run it again.
        for (let retry = 0; retry < 2 && !r?.lhr?.audits?.['first-contentful-paint']?.numericValue; retry++) r = await lighthouse(BASE + path, flags, config);
        if (FRESH) {
          await chrome.kill();
          // Windows may still hold the profile a moment after the browser quits: then it stays in the temp folder.
          try {
            rmSync(profile, { recursive: true, force: true, maxRetries: 5 });
          } catch {}
        }
        const lhr = r.lhr;
        const a = lhr.audits;
        const num = (id) => a[id]?.numericValue ?? null;
        runs.push({
          perf: lhr.categories.performance?.score * 100,
          a11y: lhr.categories.accessibility ? lhr.categories.accessibility.score * 100 : null,
          bp: lhr.categories['best-practices'] ? lhr.categories['best-practices'].score * 100 : null,
          seo: lhr.categories.seo ? lhr.categories.seo.score * 100 : null,
          fcp: num('first-contentful-paint'),
          lcp: num('largest-contentful-paint'),
          si: num('speed-index'),
          tbt: num('total-blocking-time'),
          cls: num('cumulative-layout-shift'),
          tti: num('interactive'),
          mpfid: num('max-potential-fid'),
          ttfb: num('server-response-time'),
          bytes: num('total-byte-weight'),
          requests: a['network-requests']?.details?.items?.length ?? null,
          dom: a['dom-size-insight']?.details?.items?.[0]?.value?.value ?? null,
          mainthread: num('mainthread-work-breakdown'),
          bootup: num('bootup-time'),
          obsFcp: a.metrics?.details?.items?.[0]?.observedFirstContentfulPaint ?? null,
          obsLcp: a.metrics?.details?.items?.[0]?.observedLargestContentfulPaint ?? null,
          obsSi: a.metrics?.details?.items?.[0]?.observedSpeedIndex ?? null,
          obsLoad: a.metrics?.details?.items?.[0]?.observedLoad ?? null,
          doc: a['network-requests']?.details?.items?.find((x) => x.resourceType === 'Document')?.transferSize ?? null,
          benchmark: lhr.environment?.benchmarkIndex ?? null,
          cpu: lhr.configSettings?.throttling?.cpuSlowdownMultiplier ?? null,
          lcpEl: a['lcp-breakdown-insight']?.details?.items?.find((x) => x.type === 'node')?.selector ?? null,
          lcpPhases: a['lcp-breakdown-insight']?.details?.items?.[0]?.items?.map((x) => `${x.subpart}:${Math.round(x.duration)}`).join(' ') ?? null,
          renderBlocking: a['render-blocking-resources']?.details?.items?.map((x) => x.url) ?? [],
          failed: Object.values(a).filter((x) => x.score !== null && x.score < 1 && x.scoreDisplayMode !== 'informative' && x.scoreDisplayMode !== 'notApplicable' && x.scoreDisplayMode !== 'manual').map((x) => `${x.id}(${x.score})`),
          warnings: lhr.runWarnings,
        });
        process.stdout.write('.');
      }
      const keys = ['perf', 'a11y', 'bp', 'seo', 'fcp', 'lcp', 'si', 'tbt', 'cls', 'tti', 'mpfid', 'ttfb', 'bytes', 'requests', 'dom', 'mainthread', 'bootup', 'obsFcp', 'obsLcp', 'obsSi', 'obsLoad', 'doc', 'benchmark', 'cpu'];
      const med = Object.fromEntries(keys.map((k) => [k, median(runs.map((r) => r[k]))]));
      med.lcpEl = runs[0].lcpEl;
      med.lcpPhases = runs[0].lcpPhases;
      med.failed = [...new Set(runs.flatMap((r) => r.failed))];
      med.renderBlocking = [...new Set(runs.flatMap((r) => r.renderBlocking))];
      med.warnings = [...new Set(runs.flatMap((r) => r.warnings))];
      med.spread = Object.fromEntries(['fcp', 'lcp', 'si', 'tbt'].map((k) => [k, [Math.min(...runs.map((r) => r[k])), Math.max(...runs.map((r) => r[k]))].map(Math.round)]));
      results[`${ff} ${path}`] = med;
      console.log(
        `\n${ff.padEnd(7)} ${path.padEnd(38)} perf ${med.perf} | FCP ${Math.round(med.fcp)} LCP ${Math.round(med.lcp)} SI ${Math.round(med.si)} TBT ${Math.round(med.tbt)} CLS ${med.cls?.toFixed(4)} TTI ${Math.round(med.tti)} TTFB ${Math.round(med.ttfb)} | ${Math.round(med.bytes / 1024)}KB ${med.requests}req DOM ${med.dom} main ${Math.round(med.mainthread)}ms | a11y ${med.a11y} bp ${med.bp} seo ${med.seo}` +
          `\n         obs FCP ${Math.round(med.obsFcp)} LCP ${Math.round(med.obsLcp)} SI ${Math.round(med.obsSi)} load ${Math.round(med.obsLoad)} | HTML ${med.doc} B = ${med.doc ? Math.ceil(Math.log2(med.doc / 14600 + 1)) : '?'} window(s) | spread FCP ${med.spread.fcp} LCP ${med.spread.lcp} SI ${med.spread.si} | bench ${Math.round(med.benchmark)} cpu x${med.cpu}` +
          (med.failed.length ? `\n         failed: ${med.failed.join(', ')}` : '') +
          `\n         LCP: ${med.lcpEl} [${med.lcpPhases}]`,
      );
    }
  }
} finally {
  await shared?.kill();
}
writeFileSync(OUT, JSON.stringify(results, null, 2));
