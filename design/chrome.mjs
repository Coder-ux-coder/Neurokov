// Headless Chrome over the DevTools protocol, for the renderers in design/
// (screens/capture.mjs, clips/render.mjs). Node 24's global WebSocket talks to
// it; no dependencies.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Set CHROME to use another browser binary (on Linux or a Mac, say).
const CHROME = process.env.CHROME ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

export async function launch() {
  const profile = mkdtempSync(join(tmpdir(), 'nk-capture-'));
  const proc = spawn(CHROME, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--allow-file-access-from-files',
    '--font-render-hinting=none',
    '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    // Chrome refuses to run as root (in a container, say) with its sandbox on.
    ...(process.getuid?.() === 0 ? ['--no-sandbox'] : []),
    'about:blank',
  ]);
  const url = await new Promise((resolve, reject) => {
    let log = '';
    proc.stderr.on('data', (d) => {
      log += d;
      const m = log.match(/DevTools listening on (ws:\/\/\S+)/);
      if (m) resolve(m[1]);
    });
    proc.on('exit', () => reject(new Error(`Chrome exited:\n${log}`)));
  });
  const ws = new WebSocket(url);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  let id = 0;
  const pending = new Map();
  const listeners = new Set();
  ws.addEventListener('message', (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    } else listeners.forEach((fn) => fn(msg));
  });
  // A call Chrome never answers fails after a minute, so a stalled render stops
  // with an error instead of hanging for good.
  const send = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      const i = ++id;
      const timer = setTimeout(() => {
        pending.delete(i);
        reject(new Error(`Chrome did not answer ${method} within 60 s`));
      }, 60_000);
      const settle = (fn) => (value) => {
        clearTimeout(timer);
        fn(value);
      };
      pending.set(i, { resolve: settle(resolve), reject: settle(reject) });
      ws.send(JSON.stringify({ id: i, method, params, sessionId }));
    });
  const close = async () => {
    ws.close();
    const exited = new Promise((r) => proc.once('exit', r));
    proc.kill();
    await exited;
    try {
      rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
    } catch {
      // Chrome's helpers can hold the temp profile a little longer; the OS clears temp
    }
  };
  return { send, listeners, close };
}

// Opens file in a new tab at width x height (CSS px) and returns helpers bound
// to it: send (CDP in the tab), evaluate (awaits promises, returns values), shot
// (a screenshot as a Buffer) and close.
export async function open(cdp, file, { width, height, dpr = 1, url }) {
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  const send = (method, params) => cdp.send(method, params, sessionId);
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(`${file}: ${r.exceptionDetails.exception?.description || r.exceptionDetails.text}`);
    return r.result.value;
  };
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: dpr, mobile: false });
  const errors = [];
  const onMsg = (msg) => {
    if (msg.sessionId !== sessionId) return;
    if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text);
  };
  cdp.listeners.add(onMsg);
  const loaded = new Promise((resolve) => {
    const fn = (msg) => {
      if (msg.sessionId === sessionId && msg.method === 'Page.loadEventFired') {
        cdp.listeners.delete(fn);
        resolve();
      }
    };
    cdp.listeners.add(fn);
  });
  await send('Page.navigate', { url });
  await loaded;
  if (errors.length) throw new Error(`${file}: ${errors.join('\n')}`);
  const shot = async (format = 'jpeg', quality = 95) => {
    const { data } = await send('Page.captureScreenshot', { format, quality: format === 'png' ? undefined : quality });
    return Buffer.from(data, 'base64');
  };
  const close = async () => {
    cdp.listeners.delete(onMsg);
    await cdp.send('Target.closeTarget', { targetId });
  };
  return { send, evaluate, shot, close };
}
