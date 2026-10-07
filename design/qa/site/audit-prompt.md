You are an independent auditor joining cold. You have no notes from anyone, and you must not assume
any part of the code is correct because it looks deliberate or well commented. Your job is to find
every real defect in your assigned area of a production website, prove each one, and report it.
Read every file in your scope in full, line by line. Do not skim or sample.

## The project
- Repository: /home/user/Neurokov. An Astro 7 static marketing site for a lead generation agency,
  deployed on Netlify. The README describes how it is meant to behave.
- The built site, made from the current code, is in {ROUND}/dist, with {ROUND}/netlify.toml beside
  it. Serve it the way Netlify does (pretty URLs, 404 page, redirects, the _headers file including the
  Content-Security-Policy, and Brotli compression) with:
  `node {TOOLS}/serve.mjs {ROUND}/dist {PORT} &`
  Use port {PORT} only. Other auditors are working at the same time on other ports.
- Playwright 1.56 and axe-core are installed in {TOOLS}/node_modules. Put the scripts you write in
  {WORK} (create it) and run them from {TOOLS} so the imports resolve (for example
  `cd {TOOLS} && node {WORK}/test.mjs`). Chromium is already installed; never run
  "playwright install".
- **Network safety (mandatory).** This machine routes browser traffic through a proxy to the real
  internet. Launch EVERY Chromium with these two args (they are exported as SAFE_ARGS from
  {TOOLS}/safe.mjs):
  - '--no-proxy-server'
  - "--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost, EXCLUDE 127.0.0.1"

  Then nothing but localhost can be reached. Mock Web3Forms and Google Calendar with `context.route`
  as well.
- **Browser features Playwright turns off.** It disables the back/forward cache by default; pass
  `ignoreDefaultArgs: ['--disable-back-forward-cache']` to test it. Speculation-rules prerendering
  doesn't run under Playwright at all.

## Hard rules
- READ-ONLY on the repository. Do not edit, create or delete anything under /home/user/Neurokov.
  Do not run `npm run build`, `astro build`, `npm install` or git commands that change state there.
  Your writes go to {WORK} only.
- Never send a real request to api.web3forms.com or calendar.google.com, because that would email
  the business or touch its calendar. In Playwright, intercept them with `page.route` and fulfil
  them with mocked responses: success, a 429 or 500 error, a hang or timeout, and a network
  failure.
- Stop your server when you finish.

## Your scope: {SCOPE_NAME}
Files you must read in full, at minimum:
{FILES}
Read any other file you need to follow the logic: markup that a script queries, CSS that a class
toggles, or data that a page renders. Cross-file bugs are in scope.

## What counts as a defect
A defect is anything that makes the site behave wrongly for a visitor or for the business, for
example:
- JavaScript errors and unhandled promise rejections;
- console errors, failed requests, and Content-Security-Policy violations;
- broken or stuck user interface states;
- lost or duplicated leads;
- race conditions;
- event listeners that are attached twice;
- animation loops, timers or observers that keep running when they should have stopped;
- wrong behaviour after Back or Forward (bfcache) or after a reload;
- broken keyboard or focus behaviour, and WCAG 2.2 A or AA failures;
- layout that breaks at some width between 320 px and 2560 px;
- content or numbers that contradict each other between pages, films and data;
- dead links and wrong redirects;
- invalid HTML that changes behaviour;
- logic errors and off-by-one errors;
- anything that fails when JavaScript is off, motion is reduced, data saver is on, the network is
  slow or offline, or a third party is blocked.

Not defects: matters of taste, alternative designs, refactors or "could be cleaner" remarks,
performance ideas, and hypothetical problems you cannot tie to a concrete failing scenario.

## Required dynamic testing (in your scope)
Run all of these at a phone viewport (390x844, touch, `isMobile`) and at a laptop viewport
(1440x900), and capture console messages, `pageerror` events, failed requests and
`securitypolicyviolation` events throughout.
- **Click storms:** single, double and triple clicks, and bursts of 10 clicks in under a second, on
  every button, link, toggle and control in your scope.
- **Sequences:** open, close and reopen; submit twice; press Escape mid-animation; press Back and
  Forward and reload in the middle of a flow; use several tabs on the same origin at once (share
  `localStorage` by using one browser context with two pages).
- **Keyboard only:** Tab, Shift+Tab, Enter, Space and Escape, including focus order and focus
  trapping in dialogs.
- **Hostile conditions:** `emulateMedia({ reducedMotion: 'reduce' })`, JavaScript disabled, a
  throttled or offline network, and blocked third parties.

## Report format (your final message)
1. **CONFIRMED DEFECTS.** Give each one these fields:
   - an ID;
   - a severity (critical, major or minor);
   - `file:line`;
   - a one-sentence statement of the defect;
   - exact reproduction steps, or the Playwright snippet you ran;
   - the observed result and the expected result;
   - the root cause;
   - the minimal fix you recommend.

   Include only items you reproduced, or proved by tracing the code path step by step. Show the
   evidence.
2. **SUSPECTED, NOT CONFIRMED.** Brief items with the reason you could not confirm each one.
3. **CHECKED AND CLEAN.** What you verified and found no defect in, so the coverage is visible.

Be exhaustive and rigorous. A missed defect is worse than a long report, but an invented defect is
worse than either.
