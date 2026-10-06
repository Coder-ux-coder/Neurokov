// Lighthouse runner: N runs per page per form factor, medians of every metric that matters.
// usage: node lh.mjs <base-url> <out.json> [--runs=5] [--pages=/,/about/] [--ff=mobile,desktop] [--throttle=simulate|devtools]
import lighthouse from 'lighthouse';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';
import * as chromeLauncher from 'chrome-launcher';
import { writeFileSync } from 'node:fs';

const BASE = process.argv[2];
const OUT = process.argv[3];
const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1] ?? d;
const RUNS = Number(arg('runs', 5));
const PAGES = arg('pages', '/,/about/,/book/,/case-studies/,/case-studies/psychology-platform/,/faq/,/process/,/services/,/services/lead-conversion/,/privacy/,/this-page-does-not-exist/').split(',');
const FFS = arg('ff', 'mobile,desktop').split(',');
const THROTTLE = arg('throttle', 'simulate');
const CATS = arg('cats', 'performance,accessibility,best-practices,seo').split(',');

const chrome = await chromeLauncher.launch({
  chromePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  chromeFlags: ['--headless=new', '--no-sandbox', '--ignore-certificate-errors', '--disable-gpu'],
});

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
        const flags = { port: chrome.port, output: 'json', logLevel: 'error', onlyCategories: CATS, throttlingMethod: THROTTLE };
        const config = ff === 'desktop' ? desktopConfig : undefined;
        const r = await lighthouse(BASE + path, flags, config);
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
          dom: num('dom-size'),
          mainthread: num('mainthread-work-breakdown'),
          bootup: num('bootup-time'),
          lcpEl: a['largest-contentful-paint-element']?.details?.items?.[0]?.items?.[0]?.node?.snippet?.slice(0, 120) ?? null,
          lcpPhases: a['largest-contentful-paint-element']?.details?.items?.[1]?.items?.map((x) => `${x.phase}:${Math.round(x.timing)}`).join(' ') ?? null,
          renderBlocking: a['render-blocking-resources']?.details?.items?.map((x) => x.url) ?? [],
          failed: Object.values(a).filter((x) => x.score !== null && x.score < 1 && x.scoreDisplayMode !== 'informative' && x.scoreDisplayMode !== 'notApplicable' && x.scoreDisplayMode !== 'manual').map((x) => `${x.id}(${x.score})`),
          warnings: lhr.runWarnings,
        });
        process.stdout.write('.');
      }
      const keys = ['perf', 'a11y', 'bp', 'seo', 'fcp', 'lcp', 'si', 'tbt', 'cls', 'tti', 'mpfid', 'ttfb', 'bytes', 'requests', 'dom', 'mainthread', 'bootup'];
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
          (med.failed.length ? `\n         failed: ${med.failed.join(', ')}` : '') +
          `\n         LCP: ${med.lcpEl} [${med.lcpPhases}]`,
      );
    }
  }
} finally {
  await chrome.kill();
}
writeFileSync(OUT, JSON.stringify(results, null, 2));
