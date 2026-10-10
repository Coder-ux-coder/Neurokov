# Site checks

Checks the built site (`dist/`) in headless Chromium the way visitors use it. None of this is part of
the site, and the site's own `npm run build` doesn't need it.

```sh
cd design/qa/site && npm install            # once
npm run build --prefix ../../..             # build the site into dist/
node serve.mjs ../../../dist 4400 &         # serve it as Netlify does: pretty URLs, 404, redirects, _headers, Brotli
node harness.mjs http://localhost:4400      # every page and control; fails on any error
node serve.mjs ../../../dist 4443 --h2 &    # HTTP/2 over TLS, as Netlify serves it, for speed tests
node lh.mjs https://localhost:4443 out.json --runs=5   # Lighthouse medians, phone and laptop
```

- `serve.mjs` serves a build the way Netlify does: `/about` redirects to `/about/`, unknown
  addresses get the 404 page, the redirects in `netlify.toml` and the headers in `_headers` (the
  Content-Security-Policy included) apply, and text is Brotli-compressed.
- `harness.mjs` loads every page on a phone and a laptop, in both themes, and scrolls through it.
  It fails on any console error, script error, failed request, Content-Security-Policy violation,
  layout shift, content left hidden, or accessibility violation (axe, WCAG 2.2 AA). It clicks every
  control once, twice and ten times fast. It runs the booking flow with Web3Forms and Google
  Calendar mocked (it never sends a real form), and checks the site without JavaScript and with
  reduced motion. Use `--only=crawl,booking,storm,nojs,calm,redirects` to run part of it.
- `lh.mjs` runs Lighthouse several times per page and reports the median of each measure. With
  `--fresh` each run gets a new browser, as on PageSpeed: otherwise every run after a page's first
  loads it as a return visit (Lighthouse keeps local storage, so the web fonts come with the page).
- `loaf.mjs` lists the long animation frames on a page and the scripts behind them, with the CPU
  slowed as on a phone (`CPU=4`).
- `layout.mjs` checks every page at phone and tablet sizes: text over text, anything off the side
  of the screen or clipped, touch targets under 44 px, tiny text, and controls hidden under a
  fixed bar (`--shots` saves screenshots too).
- `textclip.mjs` finds text that a box around it cuts off, by pixels: every clipping box that holds
  text is shot as it is and again showing everything, on a first visit (stand-in fonts) and a later
  one. It caught what `layout.mjs` can't see: letters' tops and a last letter's edge cut by a box
  their glyphs stand out of.
- `shots.mjs` takes screen-by-screen screenshots of a page, once its reveals have settled.
- `shifts.mjs` measures each page's layout shifts on a first visit, at five screen sizes.
- `vdiff.mjs` compares two builds pixel by pixel, with motion stopped (proof that a change for
  phones left the desktop as it was).
- `stylediff.mjs` compares two builds element by element: the computed style of every element and
  its `::before`/`::after`, at several screen sizes and in both themes. Faster than `vdiff.mjs`, and
  it sees what a screenshot can't; the check to run after a change to `scripts/page-styles.mjs`.
  With `--dialog` it opens the booking popup first and compares that too.
- `fold.mjs` checks the sections below the first screen that wait to be laid out: the first screen
  before any move looks as in the other build, the first move lays a wide page out, and every
  in-page link, `#address` and keyboard stop lands as it did; the ruler reads 000 and 100.
- `paintcost.mjs` measures the main thread's work before the first paint (style, layout, parse),
  with counts that don't depend on the machine's speed (elements styled, objects laid out), several
  builds loaded in turn.
- `settle.mjs` lists what changes on a page's first screen after its first paint, frame by frame
  (Lighthouse's speed index counts every such change). `--no-h264` loads it as PageSpeed's browser
  does, which keeps the films' posters.
- `firstpaint.mjs` breaks a Lighthouse run's main-thread work before the first paint into tasks;
  `firstscreen.mjs` lists which blocks show on the first screen at sixteen screen sizes.
- `rehash.mjs` sets `script-src` in `public/_headers` to the hashes the built pages need.

Every script launches Chromium with `safe.mjs`'s flags: no proxy, and every host but localhost
unresolvable, so a test can never reach the real Web3Forms or Google.

## Speed: what Lighthouse counts

PageSpeed Insights (the live site) is the measure; `lh.mjs` locally is for trying things out
(`--live` runs it against neurokov.com; `--cpu=mobile:1.2,desktop:1` sets the CPU slowdown as
PageSpeed did, which reports it as `cpuSlowdownMultiplier`). Lighthouse simulates the network:

- A page's whole transfer (about 1,300 bytes of headers plus the Brotli body) up to 14,600 bytes
  arrives in the first round trip; more costs one round trip more (150 ms on a phone, 40 ms on a
  laptop) before the first paint. Netlify's Brotli comes out about 1% smaller than quality 5,
  streamed in 16 KB chunks (which `serve.mjs` uses).
- Speed index is 1.4 × the observed speed index + 0.4 × a layout-based one on a phone (0.575 and
  0.49 on a laptop), never below the first paint. Anything on the first screen that changes after
  the first paint (a film, a button appearing) counts against it.
- PageSpeed's headless Chrome plays no H.264: the site's films keep their posters there (lib.ts:
  `filmsPlay`). So does Playwright's own Chromium; the installed Google Chrome plays them.
- The first screen is final in the first paint: nothing on it fades, rises, draws or decodes in
  (global.css, `[data-hold]`). However still the page is after that paint, a phone's speed index
  can't come in under 1.4 × the first paint PageSpeed's browser saw + 0.4 × Lighthouse's estimate of
  it: for the home page in October 2026, 1.4 × 483 + 0.4 × 930, about 1,050 ms.
- PageSpeed starts a new browser for every run. In a fresh browser the fallback fonts cost most of the
  first paint's work (each size of each face loads the system font again), and a page can paint the
  bar first and the rest a frame later. Compare builds with `lh.mjs --fresh`.

## On Windows

- Git Bash rewrites arguments that start with `/` into Windows paths: run the checks with
  `MSYS_NO_PATHCONV=1` (`--pages=/,/faq/`).
- When the Chromium build Playwright expects isn't installed, point `QA_CHROMIUM` at another one,
  for example `C:/Users/<you>/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe`.
- Check out with LF line endings (`git config core.autocrlf false`), as Netlify does, so a build
  here matches its byte for byte: the Content-Security-Policy hashes, the page sizes.
