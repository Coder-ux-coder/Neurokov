// Is any text cut off by a box around it? Every box that clips and holds text (overflow other than
// visible: a headline word's mask, the CTA's ticker, a label's box) is shot as it is and again set to
// show everything; pixels that differ were cut. On a first visit (the stand-in fonts, whose shapes
// stand out of the lines further) and a later one (the web fonts). Boxes that cut on purpose are
// skipped (SKIP), and what moves by script is too, or the two shots would differ for that.
// Found 2026-10-10: the ticker's tops on a first visit, and every headline word's last letter shaved
// at the right. Proven: copies with the old mask and the old ticker box were flagged.
// usage: node textclip.mjs <base> <out-dir> <WxH,...> <path...>   (INJECT='css' adds a style first)
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { SAFE_ARGS, EXE } from './safe.mjs';
const [, , base, out, sizeList, ...paths] = process.argv;
mkdirSync(out, { recursive: true });
const sizes = sizeList.split(',').map((s) => s.split('x').map(Number));
// Boxes that cut on purpose: a button label's second copy rolling in, the flip tiles' halves, closed
// answers, the scrolling ticker's ends, films and photos.
const SKIP = '.machine, .btn__label, .fc, .fc *, details:not([open]) > :not(summary), .sr-only, video, picture, .clip, .ruler, .nav, .skip-link';
const b = await chromium.launch({ executablePath: EXE, args: SAFE_ARGS });
let flagged = 0;
for (const mode of ['cold', 'warm']) {
  for (const [w, h] of sizes) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: w < 1000, hasTouch: w < 1000, reducedMotion: 'no-preference' });
    await ctx.addInitScript((warm) => {
      try {
        if (warm) localStorage.setItem('nk-fonts', '1');
      } catch {}
    }, mode === 'warm');
    const p = await ctx.newPage();
    for (const path of paths) {
      await p.goto(base + path);
      await p.waitForTimeout(800);
      const H = await p.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < H; y += Math.round(h * 0.5)) {
        await p.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), y);
        await p.waitForTimeout(90);
      }
      await p.waitForTimeout(2500);
      // Stop what loops, so two shots of the same place match.
      await p.addStyleTag({ content: '*,*::before,*::after{animation-play-state:paused!important;caret-color:transparent!important} .cta__track{animation:none!important}' + (process.env.INJECT ?? '') });
      await p.evaluate(() => document.querySelectorAll('video').forEach((v) => v.pause()));
      const boxes = await p.evaluate((SKIP) => {
        const clips = (el) => {
          const s = getComputedStyle(el);
          return s.overflowX !== 'visible' || s.overflowY !== 'visible';
        };
        const found = new Set();
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let n;
        while ((n = walker.nextNode())) {
          if (!n.textContent.trim()) continue;
          const el = n.parentElement;
          if (!el || el.closest(SKIP) || el.closest('[hidden], template, script, style, dialog:not([open])')) continue;
          const s = getComputedStyle(el);
          if (s.visibility === 'hidden' || +s.opacity === 0) continue;
          // The nearest box that clips it, below the page itself.
          for (let a = el; a && a !== document.body && a !== document.documentElement; a = a.parentElement) {
            if (a.matches('main, main > section, .section, .footer, .cta, .hero')) break; // sections clip only their far edges
            if (clips(a) && !a.closest(SKIP)) {
              found.add(a);
              break;
            }
          }
        }
        // Headline words: one entry per headline (all its masks at once).
        const groups = new Map();
        for (const a of found) {
          const key = a.classList.contains('w') ? a.parentElement : a;
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key).push(a);
        }
        let i = 0;
        const out = [];
        for (const [key, els] of groups) {
          const tag = `clipdiff-${i++}`;
          els.forEach((e) => e.setAttribute('data-clipdiff', tag));
          const r = key.getBoundingClientRect();
          // A box that crops a picture: its edge is anti-aliased differently once it stops clipping.
          const media = !!key.querySelector('img, canvas, video');
          out.push({ tag, media, label: `${key.tagName.toLowerCase()}.${[...key.classList].join('.')}`, text: key.textContent.trim().replace(/\s+/g, ' ').slice(0, 50), top: r.top + scrollY, left: r.left, width: r.width, height: r.height });
        }
        return out;
      }, SKIP);
      for (const box of boxes) {
        if (box.width < 2 || box.height < 2) continue;
        // Bring it into view, with room around it.
        await p.evaluate((t) => scrollTo({ top: Math.max(0, t - 140), behavior: 'instant' }), box.top);
        await p.waitForTimeout(60);
        const rect = await p.evaluate((tag) => {
          const els = [...document.querySelectorAll(`[data-clipdiff="${tag}"]`)];
          const rs = els.map((e) => e.getBoundingClientRect());
          const x0 = Math.min(...rs.map((r) => r.left)), y0 = Math.min(...rs.map((r) => r.top));
          const x1 = Math.max(...rs.map((r) => r.right)), y1 = Math.max(...rs.map((r) => r.bottom));
          return { x0, y0, x1, y1 };
        }, box.tag);
        const pad = 40;
        const clip = {
          x: Math.max(0, Math.floor(rect.x0 - pad)),
          y: Math.max(0, Math.floor(rect.y0 - pad)),
        };
        clip.width = Math.min(w, Math.ceil(rect.x1 + pad)) - clip.x;
        clip.height = Math.min(h, Math.ceil(rect.y1 + pad)) - clip.y;
        if (clip.width < 4 || clip.height < 4) continue;
        const a = await p.screenshot({ clip, animations: 'disabled' });
        await p.evaluate((tag) => document.querySelectorAll(`[data-clipdiff="${tag}"]`).forEach((e) => e.style.setProperty('overflow', 'visible', 'important')), box.tag);
        await p.waitForTimeout(30);
        const bshot = await p.screenshot({ clip, animations: 'disabled' });
        await p.evaluate((tag) => document.querySelectorAll(`[data-clipdiff="${tag}"]`).forEach((e) => e.style.removeProperty('overflow')), box.tag);
        const [ra, rb] = [PNG.sync.read(a).data, PNG.sync.read(bshot).data];
        let diff = 0;
        // Around a cropped picture, a pixel's sliver on the box's own edge doesn't count (cut text runs
        // further past it).
        const edge = (i) => {
          if (!box.media) return false;
          const x = ((i / 4) % clip.width) + clip.x + 0.5;
          const y = Math.floor(i / 4 / clip.width) + clip.y + 0.5;
          return Math.min(Math.abs(x - rect.x0), Math.abs(x - rect.x1), Math.abs(y - rect.y0), Math.abs(y - rect.y1)) < 2;
        };
        for (let i = 0; i < ra.length; i += 4) {
          if (Math.abs(ra[i] - rb[i]) + Math.abs(ra[i + 1] - rb[i + 1]) + Math.abs(ra[i + 2] - rb[i + 2]) > 60 && !edge(i)) diff++;
        }
        if (diff > 6) {
          flagged++;
          const name = `${mode}-${w}-${(path.replace(/\//g, '_').replace(/^_|_$/g, '') || 'home')}-${box.tag}`;
          writeFileSync(`${out}/${name}-a.png`, a);
          writeFileSync(`${out}/${name}-b.png`, bshot);
          console.log(`${mode} ${w}x${h} ${path}  ${box.label}  "${box.text}"  ${diff} px differ  -> ${name}`);
        }
      }
    }
    await ctx.close();
  }
}
console.log(`${flagged} flagged`);
await b.close();
