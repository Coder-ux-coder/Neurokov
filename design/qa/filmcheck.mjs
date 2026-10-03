// Checks every story film frame by frame (every 0.1 s) for the flaws a viewer would see:
//   EDGE     text cut by the frame's edge
//   CLIP     text cut by its own box
//   OVERLAP  two texts on top of each other
//   COVERED  text with something drawn over it
//   PARTIAL  text partly hidden under a later card or plate (a sliver of letters peeking out)
//   UNDER    a screen text (headline, kicker, footnote) sitting on the drawing
//   BUBBLES  two speech bubbles or chat messages on top of each other
//   B-EDGE   a bubble cut by the frame's edge
//   SPILL    a bubble's words running out of it
//   FADED    a world label mostly in frame, faded by the frame-edge fade (listed from 0.5 s)
// Motion is not a flaw: problems shorter than 0.2 s are dropped, and so are overlaps between the
// words of one rising headline and anything under a full-frame wipe or end card.
// Then it saves a still of each problem and a frame every half second for looking at by eye.
// usage: node design/qa/filmcheck.mjs <out-dir> [names...]   (no names: every film; out-dir outside the project)
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const CLIPS = fileURLToPath(new URL('../clips/', import.meta.url));
const { launch, open } = await import(new URL('../chrome.mjs', import.meta.url).href);
const [out, ...only] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const names = only.length ? only : readdirSync(CLIPS).filter((f) => f.endsWith('.html')).map((f) => f.slice(0, -5)).sort();
const STEP = 0.1;

const TAG = String.raw`(() => {
  for (const k of ['bubble', 'chat']) {
    const f = CAST[k];
    CAST[k] = function (...a) { const g = f.apply(this, a); g.setAttribute('data-bubble', k); return g; };
  }
})()`;

const CHECK = String.raw`(() => {
  const S = window.STAGE, W = S.W, H = S.H, AREA = W * H;
  const stage = document.getElementById('stage');
  if (!document.getElementById('__pe')) {
    const st = document.createElement('style'); st.id = '__pe';
    st.textContent = '#stage, #stage * { pointer-events: auto !important; } #stage #hud, #stage #hud-cam { pointer-events: none !important; } #stage.__art #hud, #stage.__art #hud * { pointer-events: none !important; } #stage.__notext text, #stage.__notext tspan { pointer-events: none !important; }';
    document.head.append(st);
  }
  const effs = new Map();
  const eff = (el) => { if (effs.has(el)) return effs.get(el); let o = 1; for (let e = el; e && e !== document.body; e = e.parentNode) { if (e.nodeType !== 1) continue; const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') { o = 0; break; } o *= parseFloat(cs.opacity); const f = cs.filter.match(/opacity\(([\d.]+)\)/); if (f) o *= parseFloat(f[1]); } effs.set(el, o); return o; };
  // What is seen at a point: a faded prop or a word not yet risen still catches the point, so
  // look through anything invisible to what is under it.
  const seenAt = (x, y) => document.elementsFromPoint(x, y).find((e) => eff(e) > 0.05) || null;
  const name = (e) => (e.tagName + (e.getAttribute && e.getAttribute('class') ? '.' + e.getAttribute('class').split(' ')[0] : '') + (e.dataset && e.dataset.bubble ? '[' + e.dataset.bubble + ']' : '')).slice(0, 30);
  const R = (r) => [r.left, r.top, r.right, r.bottom].map(Math.round).join(',');
  const inter = (a, b) => { const ix = Math.min(a.right, b.right) - Math.max(a.left, b.left), iy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top); return ix > 0 && iy > 0 ? ix * iy : 0; };
  const area = (r) => r.width * r.height;
  // A full-frame layer (a wipe, an end card): what it hides is meant to be hidden.
  const layerEl = (el) => { for (let e = el; e && e !== stage; e = e.parentElement) { if (e.id === 'hud-cam') return null; if (e.classList && e.classList.contains('wipe')) return e; if (e.parentElement && (e.parentElement.id === 'hud')) { const r = e.getBoundingClientRect(); if (area(r) > 0.8 * AREA) return e; } } return null; };
  const layer = (el) => !!layerEl(el);
  const onFrame = (r) => r.right > 0 && r.bottom > 0 && r.left < W && r.top < H;
  const moving = (el) => { const w = el.closest && el.closest('.w'); if (!w) return false; const m = (w.style.transform || '').match(/translateY\((-?[\d.]+)px\)/); return (m && Math.abs(+m[1]) > 0.5) || (w.style.opacity !== '' && +w.style.opacity < 0.99); };
  const block = (el) => el.closest && el.closest('.headline, .endline, [data-big]');

  const items = [];
  const tw = document.createTreeWalker(stage, NodeFilter.SHOW_TEXT);
  for (let n = tw.nextNode(); n; n = tw.nextNode()) {
    const txt = n.textContent.replace(/\s+/g, ' ').trim();
    if (!txt) continue;
    const el = n.parentNode;
    if (!(el instanceof Element) || el.closest('style, script, defs, .wipe')) continue;
    const op = eff(el);
    if (op < 0.2) continue;
    let rects;
    if (el instanceof SVGElement) rects = [el.getBoundingClientRect()];
    else { const rg = document.createRange(); rg.selectNodeContents(n); rects = [...rg.getClientRects()]; }
    rects = rects.filter((r) => r.width > 1 && r.height > 1);
    if (!rects.some(onFrame)) continue;
    // under a wipe or the closing card: hidden on purpose
    const c = rects[0], top = seenAt(Math.min(W - 1, Math.max(0, (c.left + c.right) / 2)), Math.min(H - 1, Math.max(0, (c.top + c.bottom) / 2)));
    const L = top && layerEl(top);
    if (L && !L.contains(el)) continue;
    // on a layer still wiping in, and not yet uncovered here
    const own = layerEl(el);
    if (own && !(top && own.contains(top))) continue;
    items.push({ el, txt: txt.slice(0, 26), rects, op, screen: !(el instanceof SVGElement) && !el.closest('#hud-cam') });
  }
  const opaque = (e) => {
    if (eff(e) <= 0.5) return false;
    if (e instanceof SVGElement) return true;
    const cs = getComputedStyle(e);
    const bg = cs.backgroundColor.match(/[\d.]+/g);
    return (bg && (bg.length < 4 || +bg[3] > 0.5)) || cs.backgroundImage !== 'none' || e.tagName === 'IMG';
  };
  // The topmost thing at a point that hides what is under it, looking through anything faded
  // or see-through (an empty HTML box); null once the text itself (or the bottom) is reached.
  const coverAt = (x, y, self) => {
    for (const e of document.elementsFromPoint(x, y)) {
      if (self && (e === self || self.contains(e) || e.contains(self))) return null;
      if (e === stage || e.id === 'art' || e.id === 'hud' || e.id === 'hud-cam' || e === document.body || e === document.documentElement) return null;
      if (opaque(e)) return e;
    }
    return null;
  };
  const PTS = [[0.5, 0.5], [0.2, 0.5], [0.8, 0.5], [0.35, 0.3], [0.65, 0.7]];
  // Points at fractions (u, v) across a text: a drawn text's are laid out in its own frame, since
  // a tilted stamp's or phone's text has a screen box that takes in its neighbouring lines.
  const at = (it, u, v) => {
    if (it.el instanceof SVGGraphicsElement) {
      const b = it.el.getBBox(), m = it.el.getScreenCTM(), x = b.x + b.width * u, y = b.y + b.height * v;
      return [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f];
    }
    const r = it.rects[0];
    return [r.left + r.width * u, r.top + r.height * v];
  };
  // A text's own card: an SVG text's group, or an HTML text's nearest box with a background.
  const card = (el) => {
    if (el instanceof SVGElement) return el.parentNode;
    for (let e = el; e && e.id !== 'hud' && e.id !== 'hud-cam'; e = e.parentElement) { const bg = getComputedStyle(e).backgroundColor.match(/[\d.]+/g); if (bg && (bg.length < 4 || +bg[3] > 0.5)) return e; }
    return el;
  };
  const later = (a, b) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
  // Where two texts meet, the lower one hidden all over under the upper one's own opaque card
  // (a page torn off over the next): that is one card on another, not text on text.
  const hidden = (lower, upper, r) => {
    stage.classList.add('__notext');
    let n = 0, k = 0;
    for (const [fx, fy] of PTS) {
      const x = r.left + r.width * fx, y = r.top + r.height * fy;
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      n++;
      const e = coverAt(x, y, null);
      if (e && card(upper.el).contains(e) && later(lower.el, e)) k++;
    }
    stage.classList.remove('__notext');
    return n > 0 && k === n;
  };
  const issues = [];
  for (const it of items) {
    for (const r of it.rects) {
      const inside = r.right > 0 && r.bottom > 0 && r.left < W && r.top < H;
      if (inside && (r.left < -2 || r.top < -2 || r.right > W + 2 || r.bottom > H + 2)) { issues.push(['EDGE', it.txt, R(r)]); break; }
    }
    if (!(it.el instanceof SVGElement)) {
      outer: for (let p = it.el.parentElement; p && p !== stage; p = p.parentElement) {
        const cs = getComputedStyle(p);
        if (cs.overflowX === 'visible' && cs.overflowY === 'visible' && cs.clipPath === 'none') continue;
        if (cs.clipPath !== 'none') continue; // the end card's wipe-in
        const pr = p.getBoundingClientRect();
        for (const r of it.rects) if (r.left < pr.left - 2 || r.right > pr.right + 2 || r.top < pr.top - 2 || r.bottom > pr.bottom + 2) { issues.push(['CLIP', it.txt, name(p)]); break outer; }
      }
    }
  }
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
    const a = items[i], b = items[j];
    if (a.el === b.el || a.el.contains(b.el) || b.el.contains(a.el)) continue;
    // lines of one drawn label (a sticky, a stamp): their line boxes touch by design
    if (a.el instanceof SVGElement && b.el instanceof SVGElement && a.el.parentNode === b.el.parentNode) continue;
    // the same word laid exactly over itself (a tag lighting up): one label
    if (a.txt === b.txt && inter(a.rects[0], b.rects[0]) > 0.7 * Math.max(area(a.rects[0]), area(b.rects[0]))) continue;
    const ba = block(a.el), bb = block(b.el);
    if (ba && ba === bb && (moving(a.el) || moving(b.el))) continue;
    let hit = null;
    for (const ra of a.rects) for (const rb of b.rects) {
      const ix = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
      const iy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
      if (ix > 2 && iy > 2 && ix * iy > 0.1 * Math.min(area(ra), area(rb))) hit = { left: Math.max(ra.left, rb.left), top: Math.max(ra.top, rb.top), width: ix, height: iy };
    }
    if (!hit) continue;
    const [lo, up] = later(a.el, b.el) ? [a, b] : [b, a];
    if (!hidden(lo, up, hit)) issues.push(['OVERLAP', a.txt, b.txt]);
  }
  for (const it of items) {
    let covered = 0, n = 0, by = '';
    for (const [fx, fy] of PTS) {
      const [x, y] = at(it, fx, fy);
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      n++;
      const top = coverAt(x, y, it.el);
      if (!top || layer(top)) continue;
      const pos = it.el.compareDocumentPosition(top);
      if (!(pos & Node.DOCUMENT_POSITION_FOLLOWING)) continue;
      covered++; by = name(top);
    }
    // (hidden all over, under a card laid squarely on it, is fine: nothing of it shows)
    if (covered >= 3 && covered < n) issues.push(['COVERED', it.txt, by]);
  }
  for (const it of items) {
    let n = 0, k = 0, by = '';
    for (let i = 0; i < 9; i++) for (let j = 0; j < 3; j++) {
      const [x, y] = at(it, (i + 0.5) / 9, 0.25 + 0.25 * j);
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      n++;
      // (anything drawn after it counts, its own group's too: a robot's arm across its name)
      const top = coverAt(x, y, it.el);
      if (!top || layer(top) || !later(it.el, top)) continue;
      k++; by = name(top);
    }
    if (k >= 2 && n - k >= 2) issues.push(['PARTIAL', it.txt, by]);
  }
  // Screen texts must sit on open paper or wall, never on the drawing.
  stage.classList.add('__art');
  // The first thing drawn at a point, looking through faint things (a faded prop, a pattern of
  // dots) down to the set behind (null: only the set there).
  const drawnAt = (x, y) => {
    for (const e of document.elementsFromPoint(x, y)) {
      if (!(e instanceof SVGElement) || e.id === 'art' || e.id === 'cam') return null;
      if (e.closest('defs, pattern') || eff(e) < 0.3 || (e.getAttribute('fill') || '').startsWith('url(')) continue;
      const r = e.getBoundingClientRect();
      return r.width >= 0.9 * W || r.height >= 0.9 * H || area(r) >= 0.25 * AREA ? null : e;
    }
    return null;
  };
  // (a label on its own plate, like a stamp, is meant to sit on the drawing)
  const plated = (el) => { for (let e = el; e && e.id !== 'hud'; e = e.parentElement) { const bg = getComputedStyle(e).backgroundColor.match(/[\d.]+/g); if (bg && (bg.length < 4 || +bg[3] > 0.5)) return true; } return false; };
  for (const it of items) {
    if (!it.screen || layer(it.el) || plated(it.el)) continue;
    for (const r of it.rects) {
      let n = 0, what = '';
      for (const [fx, fy] of PTS) {
        const x = r.left + r.width * fx, y = r.top + r.height * fy;
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const e = drawnAt(x, y);
        if (e) { n++; what = name(e.parentNode && e.parentNode.dataset && e.parentNode.dataset.bubble ? e.parentNode : e); }
      }
      if (n >= 2) { issues.push(['UNDER', it.txt, what]); break; }
    }
  }
  stage.classList.remove('__art');
  // Bubbles and chat messages.
  const bubbles = [...stage.querySelectorAll('[data-bubble]')].map((g) => {
    const body = g.querySelector('rect');
    return { g, r: body.getBoundingClientRect(), all: g.getBoundingClientRect(), op: eff(g) };
  }).filter((b) => b.op > 0.2 && b.r.width > 24 && b.r.height > 12);
  for (let i = 0; i < bubbles.length; i++) {
    const a = bubbles[i];
    const inside = a.all.right > 0 && a.all.bottom > 0 && a.all.left < W && a.all.top < H;
    if (inside && (a.all.left < -4 || a.all.top < -4 || a.all.right > W + 4 || a.all.bottom > H + 4)) issues.push(['B-EDGE', a.g.dataset.bubble, R(a.all)]);
    for (let j = i + 1; j < bubbles.length; j++) {
      const b = bubbles[j];
      if (a.g.contains(b.g) || b.g.contains(a.g)) continue;
      const k = inter(a.all, b.all);
      if (k > 0.03 * Math.min(area(a.all), area(b.all))) issues.push(['BUBBLES', a.g.dataset.bubble + '@' + R(a.r), b.g.dataset.bubble + '@' + R(b.r)]);
    }
  }
  for (const it of items) {
    if (!it.el.closest('.say')) continue;
    const r = it.rects[0];
    const cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2;
    const home = bubbles.find((b) => cx > b.r.left && cx < b.r.right && cy > b.r.top && cy < b.r.bottom);
    if (!home) continue;
    for (const q of it.rects) if (q.left < home.r.left + 10 || q.right > home.r.right - 10 || q.top < home.r.top + 4 || q.bottom > home.r.bottom - 4) { issues.push(['SPILL', it.txt, R(home.r)]); break; }
  }
  for (const el of stage.querySelectorAll('#hud-cam .chip, #hud-cam .mono')) {
    const cs = getComputedStyle(el);
    const f = cs.filter.match(/opacity\(([\d.]+)\)/);
    if (!f || +f[1] > 0.95 || cs.visibility === 'hidden' || +cs.opacity < 0.2) continue;
    // only labels mostly in frame: one the edge cuts deep is meant to go
    const r = el.getBoundingClientRect();
    const seen = (Math.min(r.right, W) - Math.max(r.left, 0)) * (Math.min(r.bottom, H) - Math.max(r.top, 0));
    if (onFrame(r) && seen > 0.7 * area(r)) issues.push(['FADED', el.textContent.replace(/\s+/g, ' ').trim().slice(0, 26), 'k=' + (+f[1]).toFixed(2)]);
  }
  return JSON.stringify(issues);
})()`;

const report = {};
const cdp = await launch();
try {
  for (const n of names) {
    const t0 = Date.now();
    const file = join(CLIPS, `${n}.html`);
    const src = readFileSync(file, 'utf8');
    const [, w, h, dur] = src.match(/<meta name="clip" content="(\d+)x(\d+)\s+([\d.]+)s"/);
    const tab = await open(cdp, n, { width: +w, height: +h, dpr: 1, url: pathToFileURL(file).href });
    await tab.evaluate(TAG);
    await tab.evaluate('STAGE.init()');
    const runs = new Map();
    for (let t = 0; t <= +dur - STEP / 2; t = Math.round((t + STEP) * 10) / 10) {
      await tab.evaluate(`STAGE.seek(${t})`);
      const issues = JSON.parse(await tab.evaluate(CHECK));
      for (const [type, a, b] of issues) {
        const key = type === 'FADED' ? `${type} | ${a}` : `${type} | ${a} | ${b}`;
        const list = runs.get(key) ?? [];
        const last = list[list.length - 1];
        if (last && Math.abs(last[1] - (t - STEP)) < 1e-6) last[1] = t;
        else list.push([t, t]);
        runs.set(key, list);
      }
    }
    const found = [];
    for (const [key, list] of runs) for (const [a, b] of list) if (b - a >= (key.startsWith('FADED') ? 0.49 : 0.19)) found.push({ key, a, b });
    found.sort((x, y) => x.a - y.a);
    report[n] = found;
    console.log(`${n} (${dur}s, ${((Date.now() - t0) / 1000).toFixed(0)}s to check): ${found.length ? found.length + ' problems' : 'clean'}`);
    for (const f of found) console.log(`   ${f.a.toFixed(1)}-${f.b.toFixed(1)}s  ${f.key}`);
    const dir = join(out, n);
    mkdirSync(dir, { recursive: true });
    for (const [i, f] of found.entries()) {
      const t = Math.round(((f.a + f.b) / 2) * 10) / 10;
      await tab.evaluate(`STAGE.seek(${t})`);
      writeFileSync(join(dir, `p${String(i).padStart(2, '0')}-t${t.toFixed(1)}.jpg`), await tab.shot('jpeg', 85));
    }
    for (let s = 0.25; s < +dur; s += 0.5) {
      await tab.evaluate(`STAGE.seek(${s})`);
      writeFileSync(join(dir, `s-${s.toFixed(2).padStart(5, '0')}.jpg`), await tab.shot('jpeg', 80));
    }
    await tab.close();
  }
} finally {
  await cdp.close();
}
writeFileSync(join(out, `report-${names.length === 1 ? names[0] : 'all'}.json`), JSON.stringify(report, null, 1));
