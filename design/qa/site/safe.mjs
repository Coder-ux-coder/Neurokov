// Chromium flags that keep every test browser on this machine. --no-proxy-server is not enough here:
// browser contexts that Playwright creates still picked up the environment's proxy for navigations
// (page.goto reached https://example.com through it). So everything but localhost goes to a proxy
// that isn't there (port 9: nothing listens), and every host but localhost is unresolvable as well.
export const SAFE_ARGS = [
  '--proxy-server=http://127.0.0.1:9',
  '--proxy-bypass-list=localhost;127.0.0.1',
  '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost, EXCLUDE 127.0.0.1',
];

// The browser the checks drive. Playwright's own Chromium by default; set QA_CHROMIUM to another
// Chromium or Chrome (for example on a machine whose Playwright browsers are a different build).
export const EXE = process.env.QA_CHROMIUM || undefined;
