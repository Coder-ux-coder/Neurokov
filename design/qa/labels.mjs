// Every frame (30 fps) of each film: any drawn label (an SVG text: a tag, a flag, a name on a
// robot) with something drawn over part of it, however briefly. The 0.1 s checker drops what
// lasts under 0.2 s, and a hand or a burst line that clips a letter for three frames is still
// seen. Only part of a label counts: one hidden whole under a card laid on it is not a flaw.
// Each text is sampled in its own frame (a tilted label's screen box takes in its neighbours).
// Wipes and the closing card are left out: they cover a whole frame on purpose.
// Saves a frame from the middle of each run, with the spot marked.
// usage: node design/qa/labels.mjs <out-dir> [names...]
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const CLIPS = fileURLToPath(new URL('../clips/', import.meta.url));
const { launch, open } = await import(new URL('../chrome.mjs', import.meta.url).href);
const [out, ...only] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const names = only.length ? only : readdirSync(CLIPS).filter((f) => f.endsWith('.html')).map((f) => f.slice(0, -5)).sort();
const FPS = 30;

const CHECK = String.raw`(() => {
  const W = STAGE.W, H = STAGE.H, stage = document.getElementById('stage');
  if (!document.getElementById('__pe')) {
    const st = document.createElement('style'); st.id = '__pe';
    st.textContent = '#stage, #stage * { pointer-events: auto !important; } #stage #hud, #stage #hud-cam { pointer-events: none !important; } #__mark { position: fixed; border: 4px solid #00c040; border-radius: 50%; width: 40px; height: 40px; pointer-events: none !important; z-index: 99; }';
    document.head.append(st);
  }
  document.getElementById('__mark')?.remove();
  const effs = new Map();
  const eff = (el) => { if (effs.has(el)) return effs.get(el); let o = 1; for (let e = el; e && e !== document.body; e = e.parentNode) { if (e.nodeType !== 1) continue; const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') { o = 0; break; } o *= parseFloat(cs.opacity); } effs.set(el, o); return o; };
  const opaque = (e) => { if (eff(e) <= 0.5) return false; if (e instanceof SVGElement) return true; const cs = getComputedStyle(e); const bg = cs.backgroundColor.match(/[\d.]+/g); return (bg && (bg.length < 4 || +bg[3] > 0.5)) || cs.backgroundImage !== 'none'; };
  const later = (a, b) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
  // the topmost thing at a point that hides what is under it, looking through anything faded
  const coverAt = (x, y, self) => { for (const e of document.elementsFromPoint(x, y)) { if (e === self || self.contains(e) || e.contains(self)) return null; if (e === stage || e.id === 'art' || e === document.body || e === document.documentElement) return null; if (opaque(e)) return e; } return null; };
  const out = [];
  for (const el of document.querySelectorAll('#art text')) {
    const txt = el.textContent.trim();
    if (!txt || eff(el) < 0.2) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.right < 0 || r.bottom < 0 || r.left > W || r.top > H) continue;
    const b = el.getBBox(), m = el.getScreenCTM();
    let k = 0, n = 0, by = null, at = null;
    for (let i = 0; i < 9; i++) for (let j = 0; j < 3; j++) {
      const lx = b.x + (b.width * (i + 0.5)) / 9, ly = b.y + b.height * (0.25 + 0.25 * j);
      const x = m.a * lx + m.c * ly + m.e, y = m.b * lx + m.d * ly + m.f;
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      n++;
      const c = coverAt(x, y, el);
      if (c && c instanceof SVGElement && later(el, c)) { k++; by = c; at = [x, y]; }
    }
    if (k && k < n) out.push([txt.slice(0, 20), by.tagName + '[' + (by.getAttribute('fill') || by.getAttribute('stroke') || '') + ']', k, n, Math.round(at[0]), Math.round(at[1])]);
  }
  return JSON.stringify(out);
})()`;

const MARK = (x, y) => `(() => { const m = document.createElement('div'); m.id = '__mark'; m.style.left = '${x - 20}px'; m.style.top = '${y - 20}px'; document.body.append(m); })()`;

const report = {};
const cdp = await launch();
try {
  for (const n of names) {
    const t0 = Date.now();
    const file = join(CLIPS, `${n}.html`);
    const [, w, h, dur] = readFileSync(file, 'utf8').match(/<meta name="clip" content="(\d+)x(\d+)\s+([\d.]+)s"/);
    const tab = await open(cdp, n, { width: +w, height: +h, dpr: 1, url: pathToFileURL(file).href });
    await tab.evaluate('STAGE.init()');
    const runs = new Map();
    const frames = Math.round(+dur * FPS);
    for (let f = 0; f < frames; f++) {
      await tab.evaluate(`STAGE.seek(${f / FPS})`);
      for (const [txt, by, k, cells, x, y] of JSON.parse(await tab.evaluate(CHECK))) {
        const key = `${txt} | ${by}`;
        const list = runs.get(key) ?? [];
        const last = list[list.length - 1];
        if (last && last.b === f - 1) Object.assign(last, { b: f, k: Math.max(last.k, k) });
        else list.push({ a: f, b: f, k, cells, x, y });
        runs.set(key, list);
      }
    }
    const found = [];
    for (const [key, list] of runs) for (const r of list) found.push({ key, ...r });
    found.sort((p, q) => p.a - q.a);
    report[n] = found.map((r) => ({ from: +(r.a / FPS).toFixed(3), to: +(r.b / FPS).toFixed(3), key: r.key, cells: `${r.k}/${r.cells}` }));
    console.log(`${n} (${dur}s, ${frames} frames, ${((Date.now() - t0) / 1000).toFixed(0)}s): ${found.length ? found.length + ' runs' : 'clean'}`);
    const dir = join(out, n);
    mkdirSync(dir, { recursive: true });
    for (const [i, r] of found.entries()) {
      console.log(`   ${(r.a / FPS).toFixed(2)}-${(r.b / FPS).toFixed(2)}s (${r.b - r.a + 1} fr, up to ${r.k}/${r.cells})  ${r.key}`);
      const f = Math.round((r.a + r.b) / 2);
      await tab.evaluate(`STAGE.seek(${f / FPS})`);
      const hit = JSON.parse(await tab.evaluate(CHECK)).find(([txt, by]) => `${txt} | ${by}` === r.key);
      await tab.evaluate(MARK(hit ? hit[4] : r.x, hit ? hit[5] : r.y));
      writeFileSync(join(dir, `l${String(i).padStart(2, '0')}-t${(f / FPS).toFixed(2)}.jpg`), await tab.shot('jpeg', 85));
      await tab.evaluate(`document.getElementById('__mark')?.remove()`);
    }
    await tab.close();
  }
} finally {
  await cdp.close();
}
writeFileSync(join(out, `report-${names.length === 1 ? names[0] : 'all'}.json`), JSON.stringify(report, null, 1));
