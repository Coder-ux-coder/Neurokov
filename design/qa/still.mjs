// Stills of one film at given times: node design/qa/still.mjs <out-dir> <name> <t1,t2,...> [scale]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const CLIPS = fileURLToPath(new URL('../clips/', import.meta.url));
const { launch, open } = await import(new URL('../chrome.mjs', import.meta.url).href);
const [out, name, times, scale = '1'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const file = join(CLIPS, `${name}.html`);
const [, w, h] = readFileSync(file, 'utf8').match(/<meta name="clip" content="(\d+)x(\d+)\s+([\d.]+)s"/);
const cdp = await launch();
try {
  const tab = await open(cdp, name, { width: +w, height: +h, dpr: +scale, url: pathToFileURL(file).href });
  await tab.evaluate('STAGE.init()');
  for (const t of times.split(',').map(Number)) {
    await tab.evaluate(`STAGE.seek(${t})`);
    const f = join(out, `${name}-${t.toFixed(2)}.png`);
    writeFileSync(f, await tab.shot('png'));
    console.log(f);
  }
  await tab.close();
} finally { await cdp.close(); }
