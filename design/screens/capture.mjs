// Capture a product screen's motion (anim.js) as frames for the living photos:
// steps the screen from t = -PRE to LOOP at FPS in headless Chrome, over the
// DevTools protocol, and saves a JPEG per frame to design/screens/frames/<name>/.
// The PRE seconds before 0 are what design/composite/video.py fades from at
// the end of the loop, so it closes without a jump.
//
// usage: node capture.mjs <name ...> [--dpr 1] [--only 0,2.5,6]   (--only: a few test frames)
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { launch, open } from '../chrome.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
export const FPS = 24;
export const LOOP = 8;
export const PRE = 0.75;

async function capture(cdp, name, { dpr, only }) {
  const file = join(HERE, `${name}.html`);
  const [, w, h] = readFileSync(file, 'utf8').match(/<meta name="size" content="(\d+)x(\d+)@([\d.]+)"/);
  const tab = await open(cdp, name, { width: +w, height: +h, dpr, url: pathToFileURL(file).href });
  await tab.evaluate('ANIM.init()');

  const dir = join(HERE, 'frames', name);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const times = only ?? Array.from({ length: Math.round((LOOP + PRE) * FPS) }, (_, i) => -PRE + i / FPS);
  for (const [i, t] of times.entries()) {
    await tab.evaluate(`ANIM.seek(${t})`);
    const label = only ? `t${t.toFixed(2)}` : `f${String(i).padStart(4, '0')}`;
    writeFileSync(join(dir, `${label}.jpg`), await tab.shot('jpeg', 94));
  }
  await tab.close();
  console.log(`${name}: ${times.length} frames, ${w}x${h}@${dpr}`);
}

const args = process.argv.slice(2);
const opt = (flag) => {
  const i = args.indexOf(flag);
  return i < 0 ? undefined : args.splice(i, 2)[1];
};
const dpr = Number(opt('--dpr') ?? 1);
const only = opt('--only')?.split(',').map(Number);
const cdp = await launch();
try {
  for (const name of args) await capture(cdp, name, { dpr, only });
} finally {
  await cdp.close();
}
