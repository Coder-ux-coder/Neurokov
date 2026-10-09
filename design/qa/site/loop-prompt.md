# The four-task loop: phone speed, laptop speed, phone layout, bug rounds

You are a senior web-performance and front-end QA engineer. The site is neurokov.com: an Astro 7
static site on Netlify, built from https://github.com/Coder-ux-coder/Neurokov (`main` deploys on
every push). Make it as fast as Lighthouse can measure on phones and on laptops, make every page
right on a phone, and leave no bugs, on the front end or anywhere else, without giving up any
quality.

## The scoreboard

- **The live site is the truth.** PageSpeed Insights (pagespeed.web.dev, Lighthouse 13.5.0 on
  Google's servers, Moto G Power on Slow 4G and an emulated desktop) is what the owner looks at. Read
  the exact values from its "See calculator" link (FCP, LCP, TBT, CLS, SI, TTI in ms). The keyless
  PSI API has a daily quota of 0, so use the website.
- **Local runs are for iterating fast.** Build, serve `dist/` the way Netlify does
  (`serve.mjs --h2`), and take Lighthouse 13.5.0 medians of at least 5 runs per page (`lh.mjs`).
  Netlify's Brotli is about 10% bigger than Brotli 11, so size budgets use Netlify's numbers.
- **Real visitors count too.** A trick that wins in the lab but makes a real visit worse (later
  real LCP, a flash, a jump, a slower second page) is not a win. Check real loads in a browser:
  LCP, CLS, INP, and the second page a visitor opens.
- **All 17 pages:** `/`, `/about/`, `/book/`, `/book/pick-a-time/`, `/case-studies/` and its 3
  cases, `/faq/`, `/privacy/`, `/process/`, `/services/` and its 3 services, `/terms/`, the 404.

## What "the theoretical best" is

Lighthouse doesn't time a phone. It replays the load in a model (Lantern). On mobile: 150 ms round
trips, 1.6 Mbps, and the CPU 4× slower. On desktop: 40 ms, 10 Mbps, and no CPU slowdown. In that
model:

- A cold visit costs DNS (2 round trips), TCP (1.5), TLS (1), and half a round trip back, plus the
  server's own time, before the first byte: about **780 ms on mobile and 220 ms on desktop**. No
  site goes lower.
- HTML comes in congestion windows: the first 14,600 bytes (headers included) arrive with the first
  byte, and anything up to 43,800 bytes needs one more round trip (+150 ms mobile, +40 ms desktop).
  Lantern treats the document as one piece, so FCP waits for all of it.
- **FCP floor:** about 0.79 s mobile and 0.23 s desktop when the compressed page fits in one window.
  It is about 0.94 s and 0.27 s when it needs two.
- **LCP floor = FCP:** the largest thing on the first screen paints with the first paint, and
  nothing larger replaces it later. Every request that finishes before the real LCP (images too)
  joins Lighthouse's LCP estimate.
- **SI floor = FCP:** on mobile, SI = 1.4 × the real filmstrip's speed index + 0.4 × a layout-based
  estimate, and never below FCP. So the first screen must look final at the first paint (no fades,
  no image upgrades, no motion in view while loading), with little layout work after it.
- **TBT 0 ms and CLS 0** on every page, phone and laptop, both themes.
- **Done** = every page within measurement noise (about 10 ms) of its floor, and every page that can
  fit one window without losing anything does.

## Ground rules

- **Keep:** every word, film, photo, feature, effect and page. Photos and film posters may be
  re-encoded only if the difference can't be seen (compare them side by side). Desktop must stay
  pixel-identical unless a change is meant for it (`vdiff.mjs`).
- **Copy rules:** never "AI" in copy, meta or images; no new claims or numbers; Neurokov with a
  small k.
- **Keep what already works:** the CSP hashes (`rehash.mjs` / `check-headers.mjs`), the placeholder
  gate, the booking flow (Web3Forms, then Google Calendar), the no-JS fallbacks, large-text
  support, reduced motion and data saver, the pause-motion and theme buttons, bfcache, and
  Accessibility, Best Practices and SEO at 100.
- **Never send a real form.** Never let a test reach api.web3forms.com or calendar.google.com
  (`safe.mjs` flags plus `page.route` mocks).
- **One change at a time:** measure before and after (medians), and keep it only if it helps beyond
  noise and nothing else gets worse.
- **Write it down:** record every finding and fix in `ledger.md`.
- **Ask first:** commit, push or deploy only with the owner's yes.

## Task 1: Phone speed (loop until done)

1. **Baseline.** Run PSI on the live site for every page (mobile). Then run local Lighthouse
   medians, mobile.
2. **Per page, record:** FCP, LCP, SI, TBT, CLS, TTI and TTFB. Also record the HTML's transfer size
   and window count, the LCP element and its phases, and the observed (real-load) FCP, LCP and SI.
   Add the requests and bytes, the main-thread time, and the floor that page could reach.
3. **Fix the biggest gap to the floor first.** The levers:
   - fewer HTML bytes: per-page CSS, only the first screen's CSS inline, lighter or no inline
     images, leaner markup and SVG;
   - the LCP element painted at the first paint and never superseded;
   - a first screen that is final at the first paint;
   - nothing render-blocking;
   - no requests racing the LCP;
   - little or no main-thread work before and after the first paint;
   - fonts that can't shift anything;
   - images at the right size and format;
   - long cache lifetimes for hashed files;
   - prefetch or prerender for the next page.
4. **Re-measure** the change, then repeat.
5. **Stop** when two rounds in a row gain nothing and every page sits at its floor.

## Task 2: Laptop speed (loop until done)

The same as task 1 with Lighthouse's desktop preset (1350×940), plus a laptop-sized real browser
(1280×620, the owner's laptop, and 1440×900).

## Task 3: Phone layout

- **Every page at:**
  - widths 280, 320, 360, 375, 390, 412 and 430 in portrait;
  - phones in landscape (568–932 wide);
  - tablets at 768, 820 and 1024;
  - both themes, 200% text, and reduced motion.
- **Check:**
  - no sideways scroll; nothing clipped, cut off or overlapping;
  - body text 16 px or more, nothing under 12 px;
  - tap targets 44 px or more and not crowded;
  - form fields at 16 px or more, so iOS doesn't zoom;
  - the dialog and the menu stay usable with the on-screen keyboard;
  - safe areas, so the notch covers nothing;
  - films fit, play inline, and go full screen;
  - fixed bars cover nothing;
  - headings break well.
- **Run `layout.mjs`, then look at every screenshot by eye.** Fix, and run again until clean.

## Task 4: Bug rounds (loop until a round finds nothing)

Each round runs everything:

- `npm run build` and its checks;
- `harness.mjs`:
  - every page and control, on a phone and a laptop, in both themes;
  - no JavaScript, and reduced motion;
  - click storms;
  - the booking flow with mocks;
- `layout.mjs` and `shifts.mjs`;
- Lighthouse Accessibility, Best Practices and SEO;
- the live site:
  - every page and redirect, and the 404 status;
  - the headers and the CSP;
  - console, CSP and network errors in a real browser, on desktop and on a phone;
  - the sitemap, robots.txt, canonical links and share cards;
- valid HTML.

Fix everything a round finds (prove each one first), then start a new round. Stop after the first
round that finds nothing.

## Report

- **A before and after table:** live PSI and local medians, per page, phone and laptop.
- **What changed and why**, with the measurements.
- **What is left above zero, and why it's the floor.**
- **What the owner must do:** approve the deploy, and anything only they can change.
