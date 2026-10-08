/**
 * Everything that animates in on scroll:
 * - [data-reveal] gets .is-in when it enters the viewport (CSS does the rest).
 * - [data-split] headlines are cut into words that rise one after another.
 * - [data-decode] labels scramble through glyphs and resolve, left to right.
 */
import { calm } from './lib';

/* ---------- Split headlines into words ---------- */

function split(el: HTMLElement) {
  let i = 0;
  let word: HTMLSpanElement | null = null;
  const out = document.createDocumentFragment();
  const startWord = () => {
    const w = document.createElement('span');
    w.className = 'w';
    const inner = document.createElement('span');
    inner.style.setProperty('--wi', String(i++));
    w.append(inner);
    out.append(w);
    word = inner;
  };
  for (const node of [...el.childNodes]) {
    if (node.nodeType === Node.TEXT_NODE) {
      for (const part of (node.textContent ?? '').split(/(\s+)/)) {
        if (!part) continue;
        if (/^\s+$/.test(part)) {
          out.append(' ');
          word = null;
          continue;
        }
        if (!word) startWord();
        word!.append(part);
      }
    } else if ((node as Element).tagName === 'BR') {
      out.append(node);
      word = null;
    } else {
      // An inline element (like the orange full stop) stays glued to its word.
      if (!word) startWord();
      word!.append(node);
    }
  }
  el.replaceChildren(out);
  el.classList.add('is-split'); // the CSS kept it hidden until now
}


/* ---------- Decode: scramble, then resolve ---------- */

const GLYPHS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&*+/<=>';
const running = new WeakMap<HTMLElement, number>();

export function decode(el: HTMLElement, text?: string, duration = 700) {
  const final = text ?? el.dataset.text ?? el.textContent ?? '';
  el.dataset.text = final;
  cancelAnimationFrame(running.get(el) ?? 0);
  if (calm) {
    el.textContent = final;
    return;
  }
  const start = performance.now();
  const n = final.length || 1;
  const frame = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    let s = '';
    for (let i = 0; i < final.length; i++) {
      const c = final[i];
      s += c === ' ' || t >= (i / n) * 0.7 + 0.3 ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0];
    }
    el.textContent = s;
    if (t < 1) running.set(el, requestAnimationFrame(frame));
  };
  running.set(el, requestAnimationFrame(frame));
}

/* ---------- One observer for all of it ---------- */

export function startReveal() {
  // Not on the first screen ([data-hold]): its headline is there from the first frame (global.css).
  if (!calm) document.querySelectorAll<HTMLElement>('[data-split]:not([data-hold], [data-hold] *)').forEach(split);

  const reveals = [...document.querySelectorAll<HTMLElement>('[data-reveal]')];
  const decodes = [...document.querySelectorAll<HTMLElement>('[data-decode]')];

  if (calm || !('IntersectionObserver' in window)) {
    reveals.forEach((el) => el.classList.add('is-in'));
  } else {
    // A label already on screen when this starts has been read as it is since the first paint:
    // only the ones scrolled to later decode.
    const seen = new WeakSet<Element>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = entry.target as HTMLElement;
          const first = !seen.has(el);
          seen.add(el);
          if (!entry.isIntersecting) continue;
          io.unobserve(el);
          if (el.hasAttribute('data-reveal')) el.classList.add('is-in');
          if (el.hasAttribute('data-decode') && !first) decode(el);
        }
      },
      // Any part in view counts: a share of a block taller than a short screen might never be.
      { rootMargin: '0px 0px -8% 0px', threshold: 0 },
    );
    new Set([...reveals, ...decodes]).forEach((el) => io.observe(el));
  }
}
