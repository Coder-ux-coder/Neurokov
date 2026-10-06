// Verification harness for the Neurokov site. Run against a server started with serve.mjs.
// usage: node harness.mjs http://localhost:4400 [out.json] [--only=crawl,storm,booking,nojs,calm,axe,redirects]
// Exits 1 if anything fails. Every failure is printed with the page and viewport.
import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import { writeFileSync } from 'node:fs';

const BASE = process.argv[2] ?? 'http://localhost:4400';
const OUT = process.argv[3] && !process.argv[3].startsWith('--') ? process.argv[3] : null;
const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const ONLY = onlyArg ? new Set(onlyArg.slice(7).split(',')) : null;
const want = (k) => !ONLY || ONLY.has(k);

const PAGES = [
  '/', '/about/', '/book/', '/book/pick-a-time/', '/case-studies/', '/case-studies/outbound-engine/',
  '/case-studies/psychology-platform/', '/case-studies/speed-to-lead/', '/faq/', '/privacy/', '/process/',
  '/services/', '/services/lead-conversion/', '/services/lead-generation/', '/services/lead-reactivation/',
  '/terms/', '/this-page-does-not-exist/',
];
const VIEWPORTS = {
  mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
};

const failures = [];
const warnings = [];
const fail = (where, msg) => { failures.push(`${where}: ${msg}`); console.log(`  FAIL ${where}: ${msg}`); };
const warn = (where, msg) => { warnings.push(`${where}: ${msg}`); };

const INIT = () => {
  const describe = (n) => {
    if (!n || n.nodeType !== 1) return n ? n.nodeName : '?';
    let s = n.tagName.toLowerCase();
    if (n.id) s += '#' + n.id;
    if (n.className && typeof n.className === 'string') s += '.' + n.className.trim().split(/\s+/).slice(0, 3).join('.');
    return s;
  };
  window.__nk = { csp: [], shifts: [], rejections: [], errors: [], longtasks: [] };
  document.addEventListener('securitypolicyviolation', (e) => __nk.csp.push(`${e.violatedDirective} ${e.blockedURI} ${e.sourceFile}:${e.lineNumber}`));
  addEventListener('unhandledrejection', (e) => __nk.rejections.push(String(e.reason && (e.reason.stack || e.reason))));
  addEventListener('error', (e) => __nk.errors.push(String(e.message)));
  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) {
        if (e.hadRecentInput) continue;
        __nk.shifts.push({ value: e.value, t: Math.round(e.startTime), sources: (e.sources || []).map((s) => describe(s.node)) });
      }
    }).observe({ type: 'layout-shift', buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) __nk.longtasks.push(Math.round(e.duration)); }).observe({ type: 'longtask', buffered: true });
  } catch {}
};

async function newContext(browser, vp, extra = {}) {
  const ctx = await browser.newContext({ ...VIEWPORTS[vp], ...extra });
  ctx.__web3 = [];
  ctx.__web3mode = 'ok';
  await ctx.route('https://api.web3forms.com/**', async (route) => {
    const req = route.request();
    ctx.__web3.push({ method: req.method(), body: req.postData() ?? '', headers: req.headers() });
    const mode = ctx.__web3mode;
    if (mode === 'fail') return route.abort('failed');
    if (mode === '500') return route.fulfill({ status: 500, contentType: 'application/json', body: '{"success":false}' });
    if (mode === 'redirect') return route.fulfill({ status: 303, headers: { location: `${BASE}/book/pick-a-time/` } });
    return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"success":true}' });
  });
  await ctx.route('https://calendar.google.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>calendar mock</title><p>calendar mock</p>' }),
  );
  // Anything else off-site is a defect: the CSP allows nothing else.
  await ctx.route((url) => !url.href.startsWith(BASE) && !/^(https:\/\/(api\.web3forms\.com|calendar\.google\.com)|data:|blob:)/.test(url.href), (route) => {
    ctx.__foreign = (ctx.__foreign ?? []).concat(route.request().url());
    return route.abort('blockedbyclient');
  });
  await ctx.addInitScript(INIT);
  return ctx;
}

function watch(page, where, opts = {}) {
  const log = { console: [], pageerrors: [], failed: [], status: [] };
  page.on('console', (m) => {
    const type = m.type();
    if (type === 'error' || type === 'warning') log.console.push(`${type}: ${m.text()}`);
  });
  page.on('pageerror', (e) => log.pageerrors.push(String(e.stack || e)));
  page.on('requestfailed', (r) => {
    const f = r.failure()?.errorText ?? '';
    log.failed.push(`${r.resourceType()} ${r.url()} ${f}`);
  });
  page.on('response', (r) => {
    if (r.status() >= 400 && r.url().startsWith(BASE) && !r.url().includes('this-page-does-not-exist')) log.status.push(`${r.status()} ${r.url()}`);
  });
  return log;
}

async function report(page, where, log, { allowAbortedMedia = true } = {}) {
  const nk = await page.evaluate(() => window.__nk).catch(() => null);
  for (const c of log.console) {
    // Chrome logs this for every page once a modal dialog uses aria-hidden; ignore nothing else.
    // The 404 page's own status is logged as a failed load; that is the page working as it should.
    if (where.includes('does-not-exist') && /status of 404/.test(c)) continue;
    if (c.startsWith('error')) fail(where, `console ${c}`);
    else warn(where, `console ${c}`);
  }
  for (const e of log.pageerrors) fail(where, `pageerror ${e}`);
  for (const f of log.failed) {
    if (allowAbortedMedia && /^(media|other) .* net::ERR_ABORTED/.test(f)) { warn(where, `aborted ${f}`); continue; }
    if (/blockedbyclient|ERR_BLOCKED_BY_CLIENT/.test(f)) continue; // reported via foreign list
    fail(where, `request failed ${f}`);
  }
  for (const s of log.status) fail(where, `HTTP ${s}`);
  if (nk) {
    for (const c of nk.csp) fail(where, `CSP violation ${c}`);
    for (const r of nk.rejections) fail(where, `unhandled rejection ${r}`);
    for (const e of nk.errors) fail(where, `window error ${e}`);
    const cls = nk.shifts.reduce((a, s) => a + s.value, 0);
    if (cls > 0) fail(where, `layout shift total ${cls.toFixed(5)}: ${JSON.stringify(nk.shifts).slice(0, 600)}`);
  }
  log.console.length = log.pageerrors.length = log.failed.length = log.status.length = 0;
  await page.evaluate(() => { if (window.__nk) { __nk.csp = []; __nk.rejections = []; __nk.errors = []; __nk.shifts = []; } }).catch(() => {});
  return nk;
}

async function settle(page) {
  await page.waitForLoadState('load');
  // The site's script starts after first paint (nkLater); wait until it has been fetched and run.
  await page.waitForFunction(() => performance.getEntriesByType('resource').some((r) => /\/_astro\/site\.[^/]+\.js$/.test(r.name)), null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(600);
}

async function scrollThrough(page) {
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  const vh = await page.evaluate(() => innerHeight);
  for (let y = 0; y < h; y += Math.round(vh * 0.7)) {
    await page.evaluate((y) => scrollTo(0, y), y);
    await page.waitForTimeout(140);
  }
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(1200);
  await animationsDone(page);
}

// Waits until every finite transition and animation has finished (staggered reveals take a few seconds).
async function animationsDone(page) {
  await page
    .waitForFunction(
      () =>
        document.getAnimations().every((a) => {
          if (a.playState !== 'running') return true;
          const t = a.effect?.getComputedTiming?.();
          return !t || t.iterations === Infinity || !isFinite(t.endTime);
        }),
      null,
      { timeout: 12000, polling: 200 },
    )
    .catch(() => {});
}

const hiddenContent = () =>
  [...document.querySelectorAll('[data-reveal], [data-split], main h1, main h2, main p')].filter((el) => {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    if (el.closest('[hidden], dialog:not([open]), [aria-hidden="true"]')) return false;
    let n = el;
    while (n && n.nodeType === 1) {
      const cs = getComputedStyle(n);
      if (parseFloat(cs.opacity) < 0.99 || cs.visibility === 'hidden') return true;
      n = n.parentElement;
    }
    return false;
  }).map((el) => el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(' ')[0] : '') + ' "' + (el.textContent || '').trim().slice(0, 40) + '"');

async function crawl(browser) {
  for (const vp of Object.keys(VIEWPORTS)) {
    for (const theme of ['light', 'dark']) {
      const ctx = await newContext(browser, vp);
      if (theme === 'dark') await ctx.addInitScript(() => { try { localStorage.setItem('nk-theme', 'dark'); } catch {} });
      for (const path of PAGES) {
        const where = `crawl ${vp} ${theme} ${path}`;
        const page = await ctx.newPage();
        const log = watch(page, where);
        const res = await page.goto(BASE + path, { waitUntil: 'commit' });
        const expected = path.includes('does-not-exist') ? 404 : 200;
        if (res.status() !== expected) fail(where, `status ${res.status()} expected ${expected}`);
        await settle(page);
        await scrollThrough(page);
        const stuck = await page.evaluate(hiddenContent);
        if (stuck.length) fail(where, `content still hidden after scrolling: ${stuck.slice(0, 5).join(' | ')}`);
        if (want('axe')) {
          const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze().catch((e) => ({ violations: [{ id: 'axe-crashed', help: String(e), nodes: [] }] }));
          for (const v of axe.violations) fail(where, `axe ${v.id} (${v.impact}): ${v.help} @ ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' ; ')}`);
        }
        const nk = await report(page, where, log);
        if (nk?.longtasks?.length) warn(where, `long tasks ${nk.longtasks.join(',')}ms`);
        await page.close();
      }
      if (ctx.__foreign?.length) fail(`crawl ${vp} ${theme}`, `off-site requests: ${[...new Set(ctx.__foreign)].join(', ')}`);
      if (ctx.__web3.length) fail(`crawl ${vp} ${theme}`, `Web3Forms called ${ctx.__web3.length} times while only browsing`);
      await ctx.close();
    }
  }
}

// Clicks every control (not plain navigation links) once, twice and in a burst of ten.
async function storm(browser) {
  for (const vp of Object.keys(VIEWPORTS)) {
    const ctx = await newContext(browser, vp);
    for (const path of PAGES) {
      const page = await ctx.newPage();
      const where = `storm ${vp} ${path}`;
      const log = watch(page, where);
      await page.goto(BASE + path);
      await settle(page);
      const count = await page.evaluate(() => {
        const els = [...document.querySelectorAll('button, summary, [data-book], [role="button"], .node, [data-burger]')];
        els.forEach((el, i) => el.setAttribute('data-storm', String(i)));
        return els.length;
      });
      for (let i = 0; i < count; i++) {
        const sel = `[data-storm="${i}"]`;
        const visible = await page.locator(sel).isVisible().catch(() => false);
        if (!visible) continue;
        const label = await page.locator(sel).evaluate((el) => el.outerHTML.slice(0, 90)).catch(() => sel);
        for (const mode of ['single', 'double', 'burst']) {
          try {
            await page.locator(sel).scrollIntoViewIfNeeded({ timeout: 2000 });
            const box = await page.locator(sel).boundingBox();
            if (!box) break;
            const x = box.x + box.width / 2;
            const y = box.y + box.height / 2;
            if (mode === 'single') await page.mouse.click(x, y);
            else if (mode === 'double') await page.mouse.dblclick(x, y);
            else for (let k = 0; k < 10; k++) await page.mouse.click(x, y, { delay: 0 });
            await page.waitForTimeout(250);
          } catch (e) {
            warn(where, `could not ${mode}-click ${label}: ${String(e).split('\n')[0]}`);
          }
          // Anything the clicks opened is closed again the way a visitor would.
          if (page.url() !== BASE + path) {
            await page.goBack().catch(() => {});
            await page.waitForTimeout(400);
            if (page.url() !== BASE + path) { await page.goto(BASE + path); await settle(page); }
            await page.evaluate((n) => { const els = [...document.querySelectorAll('button, summary, [data-book], [role="button"], .node, [data-burger]')]; els.forEach((el, i) => el.setAttribute('data-storm', String(i))); return n; }, count);
          }
          await page.evaluate(() => document.fullscreenElement && document.exitFullscreen().catch(() => {})).catch(() => {});
          for (let k = 0; k < 3; k++) {
            const open = await page.evaluate(() => !!document.querySelector('dialog[open]') || !!document.querySelector('[data-nav].is-open'));
            if (!open) break;
            await page.keyboard.press('Escape');
            await page.waitForTimeout(150);
          }
          const stuck = await page.evaluate(() => ({
            dialog: !!document.querySelector('dialog[open]'),
            menu: !!document.querySelector('[data-nav].is-open'),
            overflow: document.body.style.overflow,
            inert: [...document.body.children].filter((e) => e.inert).map((e) => e.tagName),
          }));
          if (stuck.dialog || stuck.menu) fail(where, `after ${mode} on ${label}: Escape did not close (${JSON.stringify(stuck)})`);
          else if (stuck.overflow === 'hidden' || stuck.inert.length) fail(where, `after ${mode} on ${label}: page left locked ${JSON.stringify(stuck)}`);
        }
      }
      await report(page, where, log);
      await page.close();
    }
    if (ctx.__foreign?.length) fail(`storm ${vp}`, `off-site requests: ${[...new Set(ctx.__foreign)].join(', ')}`);
    await ctx.close();
  }
}

async function fillForm(scope) {
  await scope.locator('input[name="business"]').fill('Acme Dental');
  await scope.locator('input[name="niche"]').fill('dental clinics');
  await scope.locator('select[name="revenue"]').selectOption({ index: 2 });
  await scope.locator('textarea[name="about"]').fill('We run three clinics and want more patients.');
}

async function booking(browser) {
  for (const vp of Object.keys(VIEWPORTS)) {
    // 1. Dialog on the home page.
    {
      const ctx = await newContext(browser, vp);
      const page = await ctx.newPage();
      const where = `booking-dialog ${vp}`;
      const log = watch(page, where);
      await page.goto(BASE + '/');
      await settle(page);
      const btn = page.locator('[data-book]:visible').first();
      await btn.click();
      if (!(await page.locator('dialog[data-booking][open]').count())) fail(where, 'booking button did not open the dialog');
      const dlg = page.locator('dialog[data-booking]');
      // Empty submit: nothing sent, stays on step 1.
      await dlg.locator('button[type="submit"]').click();
      await page.waitForTimeout(200);
      if (ctx.__web3.length) fail(where, 'empty form was sent');
      if (await dlg.locator('[data-booking-time]').isVisible()) fail(where, 'empty form moved to step 2');
      // Whitespace-only answers count as blank.
      await dlg.locator('input[name="business"]').fill('   ');
      await dlg.locator('input[name="niche"]').fill('x');
      await dlg.locator('select[name="revenue"]').selectOption({ index: 1 });
      await dlg.locator('textarea[name="about"]').fill('y');
      await dlg.locator('button[type="submit"]').click();
      await page.waitForTimeout(200);
      if (ctx.__web3.length) fail(where, 'whitespace-only business name was sent');
      await fillForm(dlg);
      // Double click on submit: one email.
      await dlg.locator('button[type="submit"]').dblclick();
      await page.waitForTimeout(500);
      if (ctx.__web3.length !== 1) fail(where, `expected 1 email after double-click submit, got ${ctx.__web3.length}`);
      if (!(await dlg.locator('[data-booking-time]').isVisible())) fail(where, 'step 2 not shown after submit');
      const src = await dlg.locator('[data-booking-frame] iframe').getAttribute('src').catch(() => null);
      if (!src || !src.startsWith('https://calendar.google.com/')) fail(where, `booking iframe src ${src}`);
      const body = ctx.__web3[0]?.body ?? '';
      for (const needle of ['Acme Dental', 'dental clinics', 'We run three clinics']) if (!body.includes(needle)) fail(where, `email body lacks "${needle}"`);
      // Close, reopen: back on step 1 with answers kept; sending again is not emailed twice.
      const focusIn = await page.evaluate(() => document.activeElement?.tagName);
      if (focusIn === 'IFRAME') fail(where, 'the second click of a double-click on "See available times" landed in the booking frame');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
      if (await page.locator('dialog[data-booking][open]').count()) {
        fail(where, 'Escape did not close dialog');
        await dlg.locator('[data-booking-time] [data-booking-close]').click().catch(() => {});
      }
      await btn.click();
      if (!(await dlg.locator('form').isVisible())) fail(where, 'reopened dialog did not start at step 1');
      if ((await dlg.locator('input[name="business"]').inputValue()) !== 'Acme Dental') fail(where, 'answers not kept on reopen');
      await dlg.locator('button[type="submit"]').click();
      await page.waitForTimeout(400);
      if (ctx.__web3.length !== 1) fail(where, `same answers emailed again: ${ctx.__web3.length}`);
      // A second tab with the same answers: still one email.
      const page2 = await ctx.newPage();
      const log2 = watch(page2, where + ' tab2');
      await page2.goto(BASE + '/about/');
      await settle(page2);
      await page2.locator('[data-book]:visible').first().click();
      const dlg2 = page2.locator('dialog[data-booking]');
      await fillForm(dlg2);
      await dlg2.locator('button[type="submit"]').click();
      await page2.waitForTimeout(400);
      if (ctx.__web3.length !== 1) fail(where, `same answers from second tab emailed again: ${ctx.__web3.length}`);
      await report(page2, where + ' tab2', log2);
      await page2.close();
      await report(page, where, log);
      // Failure path: the email fails, then is retried on the next send. The failed requests it
      // causes are expected, so they're dropped from the log below.
      await page.keyboard.press('Escape');
      ctx.__web3mode = '500';
      await btn.click();
      await dlg.locator('input[name="business"]').fill('Beta Law');
      await dlg.locator('button[type="submit"]').click();
      await page.waitForTimeout(600);
      if (ctx.__web3.length !== 2) fail(where, `failed send not attempted: ${ctx.__web3.length}`);
      await page.keyboard.press('Escape');
      ctx.__web3mode = 'ok';
      await btn.click();
      await dlg.locator('button[type="submit"]').click();
      await page.waitForTimeout(600);
      if (ctx.__web3.length !== 3) fail(where, `failed send not retried: ${ctx.__web3.length}`);
      await page.keyboard.press('Escape');
      // Network failure: also retried.
      ctx.__web3mode = 'fail';
      await btn.click();
      await dlg.locator('input[name="business"]').fill('Gamma Co');
      await dlg.locator('button[type="submit"]').click();
      await page.waitForTimeout(600);
      await page.keyboard.press('Escape');
      ctx.__web3mode = 'ok';
      await btn.click();
      await dlg.locator('button[type="submit"]').click();
      await page.waitForTimeout(600);
      if (ctx.__web3.length !== 5) fail(where, `network-failed send not retried: ${ctx.__web3.length}`);
      // Backdrop click closes; a close button closes.
      const box = await dlg.boundingBox();
      await page.mouse.click(5, 5);
      await page.waitForTimeout(200);
      if (await page.locator('dialog[data-booking][open]').count()) fail(where, 'backdrop click did not close the dialog');
      log.console = log.console.filter((c) => !/status of 500|ERR_FAILED|web3forms/i.test(c));
      log.failed = log.failed.filter((f) => !f.includes('api.web3forms.com'));
      await report(page, where, log);
      await ctx.close();
    }
    // 2. Inline form on /book/.
    {
      const ctx = await newContext(browser, vp);
      const page = await ctx.newPage();
      const where = `booking-inline ${vp}`;
      const log = watch(page, where);
      await page.goto(BASE + '/book/');
      await settle(page);
      const inline = page.locator('div[data-booking]');
      await fillForm(inline);
      await inline.locator('button[type="submit"]').click();
      await page.waitForTimeout(500);
      if (ctx.__web3.length !== 1) fail(where, `expected 1 email, got ${ctx.__web3.length}`);
      if (!(await inline.locator('[data-booking-time]').isVisible())) fail(where, 'step 2 not shown');
      // Booking buttons on the book page bring the panel into view rather than opening the dialog.
      const others = page.locator('[data-book]:visible');
      if (await others.count()) {
        await others.first().click();
        await page.waitForTimeout(300);
        if (await page.locator('dialog[data-booking][open]').count()) fail(where, 'dialog opened on the book page');
      }
      // Reload: back to step 1.
      await page.reload();
      await settle(page);
      await report(page, where, log);
      await ctx.close();
    }
    // 3. Without JavaScript: the form posts to Web3Forms, which sends the visitor on.
    {
      const ctx = await newContext(browser, vp, { javaScriptEnabled: false });
      ctx.__web3mode = 'redirect';
      const page = await ctx.newPage();
      const where = `booking-nojs ${vp}`;
      const log = watch(page, where);
      await page.goto(BASE + '/book/');
      const inline = page.locator('div[data-booking]');
      await fillForm(inline);
      await inline.locator('button[type="submit"]').evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await page.waitForTimeout(800);
      await Promise.all([page.waitForURL('**/book/pick-a-time/'), inline.locator('button[type="submit"]').click()]);
      if (ctx.__web3.length !== 1) fail(where, `no-JS post count ${ctx.__web3.length}`);
      const iframe = await page.locator('iframe').count();
      if (!iframe) fail(where, 'pick-a-time page has no booking frame');
      await report(page, where, log);
      await ctx.close();
    }
  }
}

async function nojs(browser) {
  for (const vp of Object.keys(VIEWPORTS)) {
    const ctx = await newContext(browser, vp, { javaScriptEnabled: false });
    for (const path of PAGES) {
      const page = await ctx.newPage();
      const where = `nojs ${vp} ${path}`;
      const log = watch(page, where);
      await page.goto(BASE + path);
      await page.waitForTimeout(300);
      const stuck = await page.evaluate(hiddenContent).catch((e) => [`evaluate failed ${e}`]);
      if (stuck.length) fail(where, `content hidden without JavaScript: ${stuck.slice(0, 5).join(' | ')}`);
      await report(page, where, log);
      await page.close();
    }
    await ctx.close();
  }
}

async function calmRun(browser) {
  for (const vp of Object.keys(VIEWPORTS)) {
    const ctx = await newContext(browser, vp, { reducedMotion: 'reduce' });
    for (const path of PAGES) {
      const page = await ctx.newPage();
      const where = `calm ${vp} ${path}`;
      const log = watch(page, where);
      await page.goto(BASE + path);
      await settle(page);
      await scrollThrough(page);
      const stuck = await page.evaluate(hiddenContent);
      if (stuck.length) fail(where, `content hidden with reduced motion: ${stuck.slice(0, 5).join(' | ')}`);
      const playing = await page.evaluate(() => [...document.querySelectorAll('video')].filter((v) => !v.paused).map((v) => v.currentSrc || v.outerHTML.slice(0, 60)));
      if (playing.length) fail(where, `videos playing with reduced motion: ${playing.join(', ')}`);
      await report(page, where, log);
      await page.close();
    }
    await ctx.close();
  }
}

async function redirects() {
  const checks = [
    ['/about', 301, '/about/'], ['/services/crm-sales-automation/', 301, '/services/lead-conversion/'],
    ['/services/marketing-automation/', 301, '/services/lead-reactivation/'], ['/services/workflow-automation/', 301, '/services/'],
    ['/services/automation-agents/', 301, '/services/'], ['/case-studies/back-office-autopilot/', 301, '/case-studies/'],
  ];
  for (const [from, status, to] of checks) {
    const r = await fetch(BASE + from, { redirect: 'manual' });
    if (r.status !== status || r.headers.get('location') !== to) fail(`redirect ${from}`, `got ${r.status} ${r.headers.get('location')}`);
  }
}

const browser = await chromium.launch();
const t0 = Date.now();
try {
  if (want('redirects')) { console.log('redirects'); await redirects(); }
  if (want('crawl') || want('axe')) { console.log('crawl'); await crawl(browser); }
  if (want('booking')) { console.log('booking'); await booking(browser); }
  if (want('storm')) { console.log('storm'); await storm(browser); }
  if (want('nojs')) { console.log('nojs'); await nojs(browser); }
  if (want('calm')) { console.log('calm'); await calmRun(browser); }
} finally {
  await browser.close();
}
console.log(`\n${failures.length} failures, ${warnings.length} warnings in ${Math.round((Date.now() - t0) / 1000)}s`);
for (const w of [...new Set(warnings)].slice(0, 80)) console.log('  warn ' + w);
if (OUT) writeFileSync(OUT, JSON.stringify({ failures, warnings }, null, 2));
process.exit(failures.length ? 1 : 0);
