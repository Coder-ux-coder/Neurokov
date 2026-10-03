// Every frame (30 fps) of each film: anything drawn under a screen text (headline, kicker,
// footnote), tested on an 8 px grid over each word, so a prop that only grazes a letter is
// caught, however briefly. A label on a plate (a chip, a stamp) is tested over its whole
// plate, since a prop sliding under it hides behind it. Saves a frame from the middle of
// each run, with the spot marked.
// usage: node design/qa/intrude.mjs <out-dir> [--world] [names...]   (--world: the world labels, letters only)
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const CLIPS = fileURLToPath(new URL('../clips/', import.meta.url));
const { launch, open } = await import(new URL('../chrome.mjs', import.meta.url).href);
const args = process.argv.slice(2);
const WORLD = args.includes('--world');
const [out, ...only] = args.filter((a) => a !== '--world');
mkdirSync(out, { recursive: true });
const names = only.length ? only : readdirSync(CLIPS).filter((f) => f.endsWith('.html')).map((f) => f.slice(0, -5)).sort();
const FPS = 30;

const CHECK = String.raw`((WORLD) => {
  const S = window.STAGE, W = S.W, H = S.H, AREA = W * H;
  const stage = document.getElementById('stage');
  if (!document.getElementById('__pe')) {
    const st = document.createElement('style'); st.id = '__pe';
    st.textContent = '#stage, #stage * { pointer-events: auto !important; } #stage.__art #hud, #stage.__art #hud * { pointer-events: none !important; } #__mark { position: fixed; border: 4px solid #00c040; border-radius: 50%; width: 40px; height: 40px; pointer-events: none !important; z-index: 99; }';
    document.head.append(st);
  }
  const effs = new Map();
  const eff = (el) => { if (effs.has(el)) return effs.get(el); let o = 1; for (let e = el; e && e !== document.body; e = e.parentNode) { if (e.nodeType !== 1) continue; const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') { o = 0; break; } o *= parseFloat(cs.opacity); const f = cs.filter.match(/opacity\(([\d.]+)\)/); if (f) o *= parseFloat(f[1]); } effs.set(el, o); return o; };
  const area = (r) => r.width * r.height;
  const layerEl = (el) => { for (let e = el; e && e !== stage; e = e.parentElement) { if (e.id === 'hud-cam') return null; if (e.classList && e.classList.contains('wipe')) return e; if (e.parentElement && (e.parentElement.id === 'hud')) { const r = e.getBoundingClientRect(); if (area(r) > 0.8 * AREA) return e; } } return null; };
  // the box with a background a label sits on (a chip, a stamp), if any
  const plateOf = (el) => { for (let e = el; e && e.id !== 'hud' && e.id !== 'hud-cam'; e = e.parentElement) { const bg = getComputedStyle(e).backgroundColor.match(/[\d.]+/g); if (bg && (bg.length < 4 || +bg[3] > 0.5)) return e; } return null; };
  const big = (r) => r.width >= 0.9 * W || r.height >= 0.9 * H || area(r) >= 0.25 * AREA;
  // The first thing drawn at a point: a faded prop still catches the point, so look through
  // anything faint (and a pattern of dots) down to the set behind (null: only the set there).
  const drawnAt = (x, y) => {
    for (const e of document.elementsFromPoint(x, y)) {
      if (!(e instanceof SVGElement) || e.id === 'art' || e.id === 'cam') return null;
      if (e.closest('defs, pattern') || eff(e) < 0.3 || (e.getAttribute('fill') || '').startsWith('url(')) continue;
      return big(e.getBoundingClientRect()) ? null : e;
    }
    return null;
  };
  const desc = (e) => {
    const r = e.getBoundingClientRect();
    const f = e.getAttribute('fill') || e.getAttribute('stroke') || '';
    return e.tagName + (f ? '[' + f + ']' : '') + '@' + [r.left, r.top, r.right, r.bottom].map(Math.round).join(',');
  };
  document.getElementById('__mark')?.remove();

  // the screen texts, less any a wipe or the closing card covers right now
  const items = [];
  const seen = new Set();
  const tw = document.createTreeWalker(document.getElementById(WORLD ? 'hud-cam' : 'hud'), NodeFilter.SHOW_TEXT);
  for (let n = tw.nextNode(); n; n = tw.nextNode()) {
    const txt = n.textContent.replace(/\s+/g, ' ').trim();
    if (!txt) continue;
    const el = n.parentNode;
    if (!(el instanceof Element) || el.closest('style, script, .wipe') || (!WORLD && el.closest('#hud-cam'))) continue;
    // (a bubble's words sit on the bubble by design)
    if (WORLD && el.closest('.say')) continue;
    if (eff(el) < 0.2 || layerEl(el)) continue;
    // a label on a plate: the whole plate, since a prop sliding under it hides behind it
    const plate = plateOf(el);
    if (plate && seen.has(plate)) continue;
    if (plate) seen.add(plate);
    const rg = document.createRange(); rg.selectNodeContents(n);
    const rects = (plate ? [plate.getBoundingClientRect()] : [...rg.getClientRects()]).filter((r) => r.width > 1 && r.height > 1 && r.right > 0 && r.bottom > 0 && r.left < W && r.top < H);
    if (!rects.length) continue;
    const c = rects[0], top = document.elementsFromPoint(Math.min(W - 1, Math.max(0, (c.left + c.right) / 2)), Math.min(H - 1, Math.max(0, (c.top + c.bottom) / 2))).find((e) => eff(e) > 0.05);
    const L = top && layerEl(top);
    if (L && !L.contains(el)) continue;
    items.push({ el, txt: (plate ? '[plate] ' : '') + txt.slice(0, 26), rects, plate: !!plate });
  }
  // the drawing's leaves that could reach a text at all (a cheap first pass)
  const leaves = [];
  for (const e of document.querySelectorAll('#art *')) {
    if (!(e instanceof SVGGraphicsElement) || e instanceof SVGGElement || e.closest('defs, pattern, clipPath, mask')) continue;
    const r = e.getBoundingClientRect();
    if (r.width < 1 && r.height < 1) continue;
    if (big(r)) continue;
    leaves.push(r);
  }
  const near = (r) => leaves.some((q) => q.right > r.left && q.left < r.right && q.bottom > r.top && q.top < r.bottom);

  stage.classList.add('__art');
  const issues = [];
  for (const it of items) {
    let hit = null;
    for (const r of it.rects) {
      // the letters (the line box less its slack top and bottom), and a margin round
      // them: a prop right against a letter crowds it as much as one on it
      const M = WORLD || it.plate ? 0 : 10, trim = it.plate ? 0 : 0.15;
      const x0 = Math.max(0, r.left - M), x1 = Math.min(W - 1, r.right + M);
      const y0 = Math.max(0, r.top + r.height * trim - M), y1 = Math.min(H - 1, r.bottom - r.height * trim + M);
      if (!near({ left: x0, right: x1, top: y0, bottom: y1 })) continue;
      for (let y = y0; y <= y1 && !hit; y += 8) for (let x = x0; x <= x1 && !hit; x += 8) {
        const e = drawnAt(x, y);
        if (e) hit = [e, x, y];
      }
      if (hit) break;
    }
    if (hit) issues.push([it.txt, desc(hit[0]), Math.round(hit[1]), Math.round(hit[2])]);
  }
  stage.classList.remove('__art');
  return JSON.stringify(issues);
})(${WORLD})`;

const MARK = (x, y) => `(() => { const m = document.createElement('div'); m.id = '__mark'; m.style.left = '${x - 20}px'; m.style.top = '${y - 20}px'; document.body.append(m); })()`;

const report = {};
const cdp = await launch();
try {
  for (const n of names) {
    const t0 = Date.now();
    const file = join(CLIPS, `${n}.html`);
    const src = readFileSync(file, 'utf8');
    const [, w, h, dur] = src.match(/<meta name="clip" content="(\d+)x(\d+)\s+([\d.]+)s"/);
    const tab = await open(cdp, n, { width: +w, height: +h, dpr: 1, url: pathToFileURL(file).href });
    await tab.evaluate('STAGE.init()');
    const runs = new Map();
    const frames = Math.round(+dur * FPS);
    for (let f = 0; f < frames; f++) {
      const t = f / FPS;
      await tab.evaluate(`STAGE.seek(${t})`);
      for (const [txt, what, x, y] of JSON.parse(await tab.evaluate(CHECK))) {
        const key = `${txt} | ${what.replace(/@.*/, '')}`;
        const list = runs.get(key) ?? [];
        const last = list[list.length - 1];
        if (last && last.b === f - 1) Object.assign(last, { b: f });
        else list.push({ a: f, b: f, what, x, y });
        runs.set(key, list);
      }
    }
    const found = [];
    for (const [key, list] of runs) for (const r of list) found.push({ key, ...r });
    found.sort((p, q) => p.a - q.a);
    report[n] = found.map((r) => ({ from: +(r.a / FPS).toFixed(3), to: +(r.b / FPS).toFixed(3), key: r.key, what: r.what }));
    console.log(`${n} (${dur}s, ${frames} frames, ${((Date.now() - t0) / 1000).toFixed(0)}s): ${found.length ? found.length + ' runs' : 'clean'}`);
    const dir = join(out, n);
    mkdirSync(dir, { recursive: true });
    for (const [i, r] of found.entries()) {
      console.log(`   ${(r.a / FPS).toFixed(2)}-${(r.b / FPS).toFixed(2)}s (${r.b - r.a + 1} fr)  ${r.key}  ${r.what}`);
      const f = Math.round((r.a + r.b) / 2);
      await tab.evaluate(`STAGE.seek(${f / FPS})`);
      // mark where it was first seen in the run's middle frame
      const hits = JSON.parse(await tab.evaluate(CHECK)).filter(([txt, what]) => `${txt} | ${what.replace(/@.*/, '')}` === r.key);
      const [, , x, y] = hits[0] ?? [0, 0, r.x, r.y];
      await tab.evaluate(MARK(x, y));
      writeFileSync(join(dir, `i${String(i).padStart(2, '0')}-t${(f / FPS).toFixed(2)}.jpg`), await tab.shot('jpeg', 85));
      await tab.evaluate(`document.getElementById('__mark')?.remove()`);
    }
    await tab.close();
  }
} finally {
  await cdp.close();
}
writeFileSync(join(out, `report-${names.length === 1 ? names[0] : 'all'}.json`), JSON.stringify(report, null, 1));
