// Render a clip (design/clips/<name>.html, run by engine.js) to video: steps t
// from 0 to its duration at FPS in headless Chrome and pipes each frame to
// ffmpeg. Writes design/clips/out/<name>.mp4 and a poster, <name>.jpg, taken at
// the clip's <meta name="poster" content="seconds">. A busy clip can trade a
// little detail for size with <meta name="crf" content="27"> (default 23).
//
// usage: node render.mjs <name ...> [--install] [--scale 0.5] [--only 1,4.5]
//   --install  also copies the mp4 and poster into src/assets/clips/, and notes
//              the poster's time in clips.json there (the site starts a preview
//              from that frame, so the still turns into motion without a jump)
//   --scale    renders smaller, for a quick look
//   --only     just stills at those times, to design/clips/stills/<name>/
import { spawn } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { launch, open } from '../chrome.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE = join(HERE, '../../src/assets/clips');
const FPS = 30;

async function render(cdp, name, { scale, only, install }) {
  const file = join(HERE, `${name}.html`);
  const src = readFileSync(file, 'utf8');
  const [, w, h, dur] = src.match(/<meta name="clip" content="(\d+)x(\d+)\s+([\d.]+)s"/);
  const poster = Number(src.match(/<meta name="poster" content="([\d.]+)"/)?.[1] ?? 0);
  const crf = src.match(/<meta name="crf" content="(\d+)"/)?.[1] ?? '23';
  const tab = await open(cdp, name, { width: +w, height: +h, dpr: scale, url: pathToFileURL(file).href });
  await tab.evaluate('STAGE.init()');

  if (only) {
    const dir = join(HERE, 'stills', name);
    mkdirSync(dir, { recursive: true });
    for (const t of only) {
      await tab.evaluate(`STAGE.seek(${t})`);
      writeFileSync(join(dir, `t${t.toFixed(2)}.png`), await tab.shot('png'));
    }
    await tab.close();
    console.log(`${name}: ${only.length} stills -> design/clips/stills/${name}/`);
    return;
  }

  const out = join(HERE, 'out');
  mkdirSync(out, { recursive: true });
  const mp4 = join(out, `${name}.mp4`);
  const ff = spawn('ffmpeg', [
    '-y', '-loglevel', 'error', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(FPS), '-i', '-',
    // Chrome's JPEG frames are full range; video players expect TV range (ffmpeg 8 and later keep the
    // range unless told), so convert it here, as older ffmpeg did by itself.
    '-vf', 'scale=out_range=tv', '-c:v', 'libx264', '-preset', 'slow', '-tune', 'animation', '-crf', crf, '-pix_fmt', 'yuv420p',
    '-profile:v', 'high', '-movflags', '+faststart', '-an', mp4,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((resolve, reject) => ff.on('exit', (code) => (code ? reject(new Error(`ffmpeg exited ${code}`)) : resolve())));
  const frames = Math.round(+dur * FPS);
  const started = Date.now();
  for (let i = 0; i < frames; i++) {
    await tab.evaluate(`STAGE.seek(${i / FPS})`);
    const jpg = await tab.shot('jpeg', 95);
    if (!ff.stdin.write(jpg)) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % 90 === 89) console.log(`  ${name} ${i + 1}/${frames}`);
  }
  ff.stdin.end();
  await done;
  await tab.evaluate(`STAGE.seek(${poster})`);
  const jpg = join(out, `${name}.jpg`);
  writeFileSync(jpg, await tab.shot('jpeg', 90));
  await tab.close();
  const kb = Math.round(statSync(mp4).size / 1024);
  console.log(`${name}: ${frames} frames in ${((Date.now() - started) / 1000).toFixed(0)}s -> ${kb} KB`);
  if (install) {
    mkdirSync(SITE, { recursive: true });
    copyFileSync(mp4, join(SITE, `${name}.mp4`));
    copyFileSync(jpg, join(SITE, `${name}.jpg`));
    note(name, { poster, duration: +dur });
    console.log(`  -> src/assets/clips/${name}.mp4 (+ .jpg)`);
  }
}

function note(name, facts) {
  const file = join(SITE, 'clips.json');
  let all = {};
  try {
    all = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    /* first clip */
  }
  all[name] = facts;
  const sorted = Object.fromEntries(Object.entries(all).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(file, JSON.stringify(sorted, null, 2) + '\n');
}

const args = process.argv.slice(2);
const opt = (flag) => {
  const i = args.indexOf(flag);
  return i < 0 ? undefined : args.splice(i, 2)[1];
};
const flag = (f) => {
  const i = args.indexOf(f);
  return i >= 0 && args.splice(i, 1).length > 0;
};
const scale = Number(opt('--scale') ?? 1);
const only = opt('--only')?.split(',').map(Number);
const install = flag('--install');
const cdp = await launch();
try {
  for (const name of args) await render(cdp, name, { scale, only, install });
} finally {
  await cdp.close();
}
