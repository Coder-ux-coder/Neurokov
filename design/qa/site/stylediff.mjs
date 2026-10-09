// Do two builds style every element the same? Loads each page in both, waits for the site's script,
// moves the pointer, and compares the computed style of every element and its ::before/::after (every property), at
// several screen sizes and in both themes. Much faster than comparing screenshots, and it sees what a
// screenshot can't (a rule that only changes something hidden, or off screen). Prints each element
// and property that differs.
// Skipped, as the builds may differ there by design: how sections below the first screen wait to be
// laid out (content-visibility and its sizes, scroll-behavior), and the films' players (a test browser
// may not play H.264).
// With --dialog, each page's first booking button is pressed first, and the booking form compared open.
// usage: node stylediff.mjs <baseA> <baseB> [--vps=390x844,1440x900] [--pages=/,/faq/] [--dark] [--dialog] [--show=20]
import { chromium } from 'playwright';
import { SAFE_ARGS, EXE } from './safe.mjs';

const [, , A, B] = process.argv;
const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1] ?? d;
const VPS = arg('vps', '320x568,390x844,768x1024,1024x768,1100x800,1101x800,1280x800,1440x900,1920x1080,2560x1440').split(',').map((v) => v.split('x').map(Number));
const PAGES = arg('pages', '/,/about/,/book/,/book/pick-a-time/,/case-studies/,/case-studies/outbound-engine/,/case-studies/psychology-platform/,/case-studies/speed-to-lead/,/faq/,/privacy/,/process/,/services/,/services/lead-conversion/,/services/lead-generation/,/services/lead-reactivation/,/terms/,/x-404/').split(',');
const THEMES = process.argv.includes('--dark') ? ['light', 'dark'] : ['light'];
const DIALOG = process.argv.includes('--dialog');
const SHOW = Number(arg('show', 20));
const SKIP_PROPS = new Set(['content-visibility', 'overflow-clip-margin', 'contain-intrinsic-size', 'contain-intrinsic-width', 'contain-intrinsic-height', 'contain-intrinsic-block-size', 'contain-intrinsic-inline-size', 'scroll-behavior']);
const SKIP_IN = '[data-clip], video';

const browser = await chromium.launch({ executablePath: EXE, args: SAFE_ARGS });

async function open(base, path, w, h, theme) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, ...(w < 1000 ? { isMobile: true, hasTouch: true } : {}) });
  if (theme === 'dark') await ctx.addInitScript(() => { try { localStorage.setItem('nk-theme', 'dark'); } catch {} });
  await ctx.route('https://calendar.google.com/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<p>mock</p>' }));
  const page = await ctx.newPage();
  await page.goto(base + path, { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  // A first move: on a wide screen the sections below the first screen are then laid out (shell.ts).
  // The first screen before it is fold.mjs's to check.
  await page.mouse.move(5, 5);
  await page.waitForTimeout(500);
  // Every section laid out, in both builds: one a browser hasn't shown yet holds a placeholder height,
  // and which it has shown depends on timing, not on the stylesheet.
  await page.addStyleTag({ content: 'main > section, body > .footer { content-visibility: visible !important; }' });
  // Read after what the page does once a section is laid out has run: the footer wordmark's fit
  // (site.ts) hears of its line's width in the frame after, and sets its size in the frame after that.
  await page.evaluate(() => new Promise((done) => { let n = 3; const tick = () => (--n ? requestAnimationFrame(tick) : done()); requestAnimationFrame(tick); }));
  if (DIALOG) {
    // A build may fetch the form only now (booking.ts): it opens when it's there.
    await page.locator('[data-book]:visible').first().click().catch(() => {});
    await page.locator('dialog[data-booking][open]').waitFor({ timeout: 3000 }).catch(() => {});
    // Read once it has come in and nothing is under the pointer: a field the dialog brings under it
    // fades to its hover colour, at a moment that depends on how fast the dialog came.
    await page.mouse.move(0, 0);
    await page.waitForTimeout(900);
  }
  // Motion stopped where it is, so both builds are read in the same state.
  await page.evaluate(() => { document.getAnimations().forEach((a) => { try { a.finish(); } catch { a.cancel(); } }); });
  return { ctx, page };
}

// One signature per element (and pseudo-element): every computed property, joined. Kept in the page
// (window.__sigs); only a hash of each comes back, and the full text for those that differ.
const hashes = (page, skipProps, skipIn) => page.evaluate(({ skipProps, skipIn }) => {
  const skip = new Set(skipProps);
  // Not the head: its elements show nothing, and a build may add styles to it as it goes.
  const all = [...document.querySelectorAll('html, body, body *')];
  const sigs = [];
  for (const el of all) {
    const ignored = el.closest(skipIn);
    for (const pseudo of [null, '::before', '::after']) {
      const cs = getComputedStyle(el, pseudo);
      if (pseudo && cs.content === 'none') { sigs.push(''); continue; }
      if (ignored) { sigs.push('-'); continue; }
      // Sorted: the order a browser lists custom properties in depends on the stylesheet.
      const props = [];
      for (let i = 0; i < cs.length; i++) if (!skip.has(cs[i])) props.push(cs[i]);
      // Margins by their computed value: an auto margin's used value, which getComputedStyle reports,
      // can read 0 or not for the same box, depending on how the browser came to lay it out.
      const map = pseudo ? null : el.computedStyleMap?.();
      const value = (p) => (map && p.startsWith('margin') ? String(map.get(p) ?? cs.getPropertyValue(p)) : cs.getPropertyValue(p));
      sigs.push(props.sort().map((p) => p + ':' + value(p) + ';').join(''));
    }
  }
  window.__sigs = sigs;
  // cyrb53
  const hash = (str) => {
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < str.length; i++) { const c = str.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
  };
  return { count: all.length, hashes: sigs.map(hash), names: all.map((el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).join('.') : '')) };
}, { skipProps: [...skipProps], skipIn });
const fullText = (page, indices) => page.evaluate((indices) => indices.map((i) => window.__sigs[i]), indices);
const parse = (sig) => Object.fromEntries(sig.split(';').filter(Boolean).map((d) => [d.slice(0, d.indexOf(':')), d.slice(d.indexOf(':') + 1)]));

let problems = 0;
try {
  for (const theme of THEMES) for (const [w, h] of VPS) for (const path of PAGES) {
    const [a, b] = await Promise.all([open(A, path, w, h, theme), open(B, path, w, h, theme)]);
    const [sa, sb] = await Promise.all([hashes(a.page, SKIP_PROPS, SKIP_IN), hashes(b.page, SKIP_PROPS, SKIP_IN)]);
    const where = `${theme} ${w}x${h} ${path}`;
    if (sa.count !== sb.count) {
      problems++;
      console.log(`✗ ${where}: ${sa.count} elements in A, ${sb.count} in B`);
    } else {
      const differ = sa.hashes.map((x, i) => (x === sb.hashes[i] ? -1 : i)).filter((i) => i >= 0);
      if (!differ.length) console.log(`  ${where}: same (${sa.count} elements)`);
      else {
        problems++;
        console.log(`✗ ${where}: ${differ.length} element(s) styled differently`);
        const shown = differ.slice(0, SHOW);
        const [ta, tb] = await Promise.all([fullText(a.page, shown), fullText(b.page, shown)]);
        shown.forEach((i, k) => {
          const [pa, pb] = [parse(ta[k]), parse(tb[k])];
          const props = [...new Set([...Object.keys(pa), ...Object.keys(pb)])].filter((p) => pa[p] !== pb[p]);
          const el = sa.names[Math.floor(i / 3)] + ['', '::before', '::after'][i % 3];
          console.log(`    ${el}: ${props.slice(0, 6).map((p) => `${p} ${pa[p] ?? '(none)'} -> ${pb[p] ?? '(none)'}`).join(', ')}${props.length > 6 ? ` +${props.length - 6} more` : ''}`);
        });
      }
    }
    await Promise.all([a.ctx.close(), b.ctx.close()]);
  }
} finally {
  await browser.close();
}

