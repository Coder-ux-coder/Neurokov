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
- `lh.mjs` runs Lighthouse several times per page and reports the median of each measure.
- `loaf.mjs` lists the long animation frames on a page and the scripts behind them, with the CPU
  slowed as on a phone (`CPU=4`).
