// Every frame (30 fps) of each film: anything a viewer would see flicker or pop:
//   BLIP   shows (at half opacity or more) for one or two frames and is gone again
//   GAP    drops out for one or two frames, from half opacity or more, and comes back
//   SPIKE  jumps away for a single frame and comes back
//   SIZE   pops to a different size for a single frame
//   POP    a big thing, in shot, goes from shown to gone (or gone to shown) between two frames:
//          no fade, no slide, nothing covering it
// Every drawn thing (the drawing's shapes, and the screen's texts and panels) is followed by
// identity from frame to frame in the page itself, so a camera move changes nothing. Sizes are
// measured in the shape's own frame (a spinning shape's screen box grows and shrinks; it doesn't).
// What a wipe or the closing card hides is left out: nobody sees it. Saves a frame of each, marked.
// usage: node design/qa/pops.mjs <out-dir> [film names, or paths to .html copies...]
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const CLIPS = fileURLToPath(new URL('../clips/', import.meta.url));
const { launch, open } = await import(new URL('../chrome.mjs', import.meta.url).href);
const [out, ...only] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const films = (only.length ? only : readdirSync(CLIPS).filter((f) => f.endsWith('.html')).map((f) => f.slice(0, -5)).sort())
  .map((a) => (a.endsWith('.html') ? { name: basename(a, '.html'), file: a } : { name: a, file: join(CLIPS, `${a}.html`) }));
const FPS = 30;
const POP_AREA = 1500; // px2: smaller things switching (a mouth, a spark) are part of the drawing's life

// One frame: every drawn thing touching the frame as [id, opacity%, cx, cy, w, h, size, inFrame%],
// plus a description of any new one.
const PROBE = String.raw`(() => {
  const W = STAGE.W, H = STAGE.H;
  const P = window.__pops || (window.__pops = { ids: new WeakMap(), n: 0 });
  const stage = document.getElementById('stage');
  const effs = new Map();
  const eff = (e) => {
    if (!e || e === stage || e.nodeType !== 1) return 1;
    if (effs.has(e)) return effs.get(e);
    const cs = getComputedStyle(e);
    let o = cs.display === 'none' || cs.visibility === 'hidden' ? 0 : parseFloat(cs.opacity);
    const f = cs.filter.match(/opacity\(([\d.]+)\)/);
    if (f) o *= parseFloat(f[1]);
    if (o > 0) o *= eff(e.parentNode);
    effs.set(e, o);
    return o;
  };
  const els = [];
  for (const e of stage.querySelectorAll('svg *')) {
    if (!(e instanceof SVGGraphicsElement) || e instanceof SVGGElement || e instanceof SVGSVGElement) continue;
    if (e.closest('defs, pattern, clipPath, mask, symbol, marker')) continue;
    els.push(e);
  }
  for (const e of document.querySelectorAll('#hud *')) {
    if (!(e instanceof HTMLElement)) continue;
    const own = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    const bg = getComputedStyle(e).backgroundColor.match(/[\d.]+/g);
    if (own || (bg && (bg.length < 4 || +bg[3] > 0.3))) els.push(e);
  }
  const v = [], d = {};
  for (const e of els) {
    let id = P.ids.get(e);
    if (id === undefined) {
      id = ++P.n; P.ids.set(e, id);
      const fill = e.getAttribute && (e.getAttribute('fill') || e.getAttribute('stroke')) || (e instanceof HTMLElement ? getComputedStyle(e).backgroundColor : '');
      const txt = (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 24);
      d[id] = e.tagName.toLowerCase() + (fill ? '[' + fill + ']' : '') + (txt ? ' "' + txt + '"' : '') + (e.closest('#hud') ? ' (screen)' : '');
    }
    const r = e.getBoundingClientRect();
    if (r.width + r.height < 4 || r.right <= 0 || r.bottom <= 0 || r.left >= W || r.top >= H) continue;
    // size in the shape's own frame, times the scale it's drawn at: a turn doesn't change it
    let s = r.width + r.height;
    if (e instanceof SVGGraphicsElement) {
      try { const b = e.getBBox(), m = e.getScreenCTM(); s = (b.width + b.height) * Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)); } catch (x) {}
    }
    // the part inside the frame, and inside any clip-path reveal round it (the closing card slides in by clip)
    let L = Math.max(r.left, 0), T = Math.max(r.top, 0), R = Math.min(r.right, W), B = Math.min(r.bottom, H);
    for (let a = e; a && a !== stage; a = a.parentElement) {
      const cp = a.nodeType === 1 && getComputedStyle(a).clipPath;
      const m = cp && cp.match(/^inset\(([^)]*)\)/);
      if (!m) continue;
      const tok = m[1].trim().split(/\s+/);
      // each side as px: a percentage of the box's width (left, right) or height (top, bottom)
      const side = (i, size) => { const x = tok[i] ?? tok[i === 3 ? 1 : 0] ?? tok[0]; return x.endsWith('%') ? (parseFloat(x) / 100) * size : parseFloat(x) || 0; };
      const q = a.getBoundingClientRect();
      L = Math.max(L, q.left + side(3, q.width)); R = Math.min(R, q.right - side(1, q.width));
      T = Math.max(T, q.top + side(0, q.height)); B = Math.min(B, q.bottom - side(2, q.height));
    }
    const iw = Math.max(0, R - L), ih = Math.max(0, B - T);
    const inside = r.width >= 3 && r.height >= 3 ? (iw * ih) / (r.width * r.height) : Math.max(iw, ih) / Math.max(r.width, r.height);
    v.push(id, Math.round(eff(e) * 100), Math.round((r.left + r.right) / 2), Math.round((r.top + r.bottom) / 2), Math.round(r.width), Math.round(r.height), Math.round(s), Math.round(inside * 100));
  }
  return JSON.stringify({ v, d });
})()`;

// Is the point under a wipe or the closing card (a full-frame panel on top)?
const COVERED = (x, y) => String.raw`(() => {
  const vis = (e) => { for (let a = e; a && a.id !== 'stage'; a = a.parentElement) { const cs = getComputedStyle(a); if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < 0.05) return false; } return true; };
  // the first thing actually drawn there (not the empty screen layers), and is it a wipe or a
  // full-frame panel on the screen layer (the closing card)?
  for (const e of document.elementsFromPoint(${x}, ${y})) {
    if (['hud', 'hud-cam', 'stage'].includes(e.id) || e === document.body || e === document.documentElement || !vis(e)) continue;
    for (let a = e; a && a.id !== 'stage'; a = a.parentElement) {
      if (a.classList && a.classList.contains('wipe')) return true;
      if (a.parentElement && a.parentElement.id === 'hud' && a.id !== 'hud-cam') { const r = a.getBoundingClientRect(); return r.width >= 0.9 * STAGE.W && r.height >= 0.9 * STAGE.H; }
    }
    return false;
  }
  return false;
})()`;
const MARK = (x, y, w, h) => `(() => { const m = document.createElement('div'); m.id = '__mark'; Object.assign(m.style, { position: 'fixed', left: '${x - w / 2 - 14}px', top: '${y - h / 2 - 14}px', width: '${w + 28}px', height: '${h + 28}px', border: '4px solid #00c040', borderRadius: '12px', pointerEvents: 'none', zIndex: 99 }); document.body.append(m); })()`;
const N = 8; // numbers per thing per frame

const report = {};
const cdp = await launch();
try {
  for (const { name, file } of films) {
    const t0 = Date.now();
    const src = readFileSync(file, 'utf8');
    const [, w, h, dur] = src.match(/<meta name="clip" content="(\d+)x(\d+)\s+([\d.]+)s"/);
    const tab = await open(cdp, name, { width: +w, height: +h, dpr: 1, url: pathToFileURL(file).href });
    await tab.evaluate('STAGE.init()');
    // (wipes are pointer-events: none; the covered test needs every drawn thing hit-testable)
    await tab.evaluate(`(() => { const st = document.createElement('style'); st.textContent = '#stage, #stage * { pointer-events: auto !important; }'; document.head.append(st); })()`);
    const n = Math.round(+dur * FPS);
    const data = new Map(), desc = {};
    for (let f = 0; f < n; f++) {
      await tab.evaluate(`STAGE.seek(${f / FPS})`);
      const { v, d } = JSON.parse(await tab.evaluate(PROBE));
      Object.assign(desc, d);
      for (let k = 0; k < v.length; k += N) {
        const id = v[k];
        if (!data.has(id)) data.set(id, new Int32Array(n * N).fill(-1));
        data.get(id).set(v.slice(k, k + N), f * N);
      }
    }
    const events = [];
    for (const [id, q] of data) {
      const at = (f) => ({ o: q[f * N + 1], x: q[f * N + 2], y: q[f * N + 3], w: q[f * N + 4], h: q[f * N + 5], s: q[f * N + 6], inside: q[f * N + 7] });
      const here = (f) => q[f * N] === id;
      // seen: clearly drawn, and not just a sliver at the frame's edge
      const seen = (f) => here(f) && at(f).o >= 10 && at(f).inside >= 20;
      const runs = [];
      for (let f = 0; f < n; f++) if (seen(f) && (f === 0 || !seen(f - 1))) { let b = f; while (b + 1 < n && seen(b + 1)) b++; runs.push([f, b]); }
      // (a flicker is a jump: a fade that dips under the line for a frame, a clock's cycle, isn't one)
      const peak = (a, b) => Math.max(...Array.from({ length: b - a + 1 }, (_, k) => at(a + k).o));
      for (const [a, b] of runs) if (b - a + 1 <= 2 && a > 0 && b < n - 1 && peak(a, b) >= 50) events.push({ kind: 'BLIP', id, f: a, len: b - a + 1, ...at(a) });
      for (let k = 1; k < runs.length; k++) {
        const g0 = runs[k - 1][1] + 1, g1 = runs[k][0] - 1;
        const [pa, pb] = [at(g0 - 1), at(g1 + 1)];
        if (g1 - g0 + 1 <= 2 && pa.o >= 50 && pb.o >= 50 && pa.inside >= 90 && pb.inside >= 90) events.push({ kind: 'GAP', id, f: g0, len: g1 - g0 + 1, ...pa });
      }
      for (let f = 1; f < n; f++) {
        // POP: shown to gone (or back) between two frames, in place and in shot
        if (here(f - 1) && here(f)) {
          const [a, b] = [at(f - 1), at(f)];
          const big = Math.max(a.w * a.h, b.w * b.h) >= POP_AREA && a.inside >= 70 && b.inside >= 70;
          if (big && a.o >= 60 && b.o <= 10) events.push({ kind: 'POP', dir: 'out', id, f, len: 1, ...a });
          if (big && a.o <= 10 && b.o >= 60) events.push({ kind: 'POP', dir: 'in', id, f, len: 1, ...b });
        }
        if (f >= n - 1 || !(seen(f - 1) && seen(f) && seen(f + 1))) continue;
        const [a, b, c] = [at(f - 1), at(f), at(f + 1)];
        const d1 = Math.hypot(b.x - a.x, b.y - a.y), d2 = Math.hypot(c.x - b.x, c.y - b.y), d0 = Math.hypot(c.x - a.x, c.y - a.y);
        if (Math.min(d1, d2) > 30 && d0 < 0.35 * Math.min(d1, d2)) events.push({ kind: 'SPIKE', id, f, len: 1, ...b, jump: Math.round(Math.min(d1, d2)) });
        if (Math.max(a.s, b.s, c.s) > 20 && c.s / a.s > 0.85 && c.s / a.s < 1.18 && ((b.s > 1.5 * a.s && b.s > 1.5 * c.s) || (b.s < 0.67 * a.s && b.s < 0.67 * c.s))) events.push({ kind: 'SIZE', id, f, len: 1, ...b, ratio: +(b.s / a.s).toFixed(2) });
      }
    }
    // leave out what a wipe or the closing card hides (checked where it was, while it was shown)
    const kept = [];
    const clampXY = (e) => [Math.min(+w - 1, Math.max(0, e.x)), Math.min(+h - 1, Math.max(0, e.y))];
    for (const e of events.sort((a, b) => a.f - b.f)) {
      const frames = e.kind === 'GAP' ? [e.f - 1, e.f] : e.kind === 'POP' ? [e.f - 1, e.f] : [e.f];
      let hidden = false;
      for (const f of frames) {
        await tab.evaluate(`STAGE.seek(${f / FPS})`);
        if (await tab.evaluate(COVERED(...clampXY(e)))) { hidden = true; break; }
      }
      if (!hidden) kept.push(e);
    }
    // one line per kind and frame: many shapes of one thing flicker together (a card is ~20 shapes)
    const groups = new Map();
    for (const e of kept) {
      const key = `${e.kind}${e.dir ? '-' + e.dir : ''} f${e.f}`;
      const gr = groups.get(key) || { ...e, count: 0, ids: [] };
      gr.count++; gr.ids.push(e.id);
      if (e.w * e.h > gr.w * gr.h) Object.assign(gr, { id: e.id, x: e.x, y: e.y, w: e.w, h: e.h });
      groups.set(key, gr);
    }
    // a thing that flickers again and again is one cyclic thing (a flame, a talking mouth): list it once
    const byThing = new Map();
    for (const gr of groups.values()) { const k = `${gr.kind}|${gr.id}|${gr.dir || ''}`; byThing.set(k, (byThing.get(k) || []).concat(gr)); }
    report[name] = [...groups.values()].map((g) => ({ kind: g.kind, dir: g.dir, f: g.f, t: +(g.f / FPS).toFixed(3), shapes: g.count, what: desc[g.id], x: g.x, y: g.y, w: g.w, h: g.h }));
    console.log(`${name} (${dur}s, ${n} frames, ${data.size} things, ${((Date.now() - t0) / 1000).toFixed(0)}s): ${groups.size ? groups.size + ' events' : 'clean'}`);
    const dir = join(out, name);
    mkdirSync(dir, { recursive: true });
    let k = 0;
    for (const list of byThing.values()) {
      const e = list[0];
      const kind = e.kind + (e.dir ? '-' + e.dir : '');
      const more = list.length > 1 ? `  (x${list.length}: ${list.slice(1, 6).map((x) => (x.f / FPS).toFixed(2)).join(' ')}${list.length > 6 ? ' ...' : ''})` : '';
      console.log(`   ${kind.padEnd(7)} ${(e.f / FPS).toFixed(2)}s f${e.f}${e.len > 1 ? '-' + (e.f + e.len - 1) : ''}  ${desc[e.id]}${e.count > 1 ? ' +' + (e.count - 1) + ' shapes' : ''}  at ${e.x},${e.y} ${e.w}x${e.h}${e.jump ? ' jump ' + e.jump : ''}${e.ratio ? ' x' + e.ratio : ''}${more}`);
      const f = e.kind === 'GAP' || (e.kind === 'POP' && e.dir === 'out') ? e.f - 1 : e.f;
      await tab.evaluate(`STAGE.seek(${f / FPS})`);
      await tab.evaluate(MARK(e.x, e.y, e.w, e.h));
      writeFileSync(join(dir, `p${String(k++).padStart(2, '0')}-${kind.toLowerCase()}-f${e.f}.jpg`), await tab.shot('jpeg', 85));
      await tab.evaluate(`document.getElementById('__mark')?.remove()`);
    }
    await tab.close();
  }
} finally {
  await cdp.close();
}
writeFileSync(join(out, `report-${films.length === 1 ? films[0].name : 'all'}.json`), JSON.stringify(report, null, 1));
