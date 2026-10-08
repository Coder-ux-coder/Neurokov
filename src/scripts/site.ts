/**
 * The site's behaviour, started once the first screen is up (boot.ts). Booking and each effect live
 * in their own modules; this one starts them, one at a time with a breath between, so no single
 * piece of work holds up a tap or a scroll (each takes a few milliseconds on a phone). The bar and
 * its menu start with the page (shell.ts), and the theme button with the head script (Base.astro).
 */
import { startBooking } from './booking';
import { startCircuits } from './circuit';
import { startClips } from './clips';
import { startDither } from './dither';
import { startFlaps } from './flap';
import { root } from './lib';
import { startLive } from './live';
import { startMachine } from './machine';
import { startReveal } from './reveal';
import { startScroll } from './scroll';
import { startVsl } from './vsl';

/* ---------- Big type that fills its line ---------- */

function startFit() {
  const fitEls = [...document.querySelectorAll<HTMLElement>('[data-fit]')];
  // Type width grows in step with its size, so one measurement at the current size gives the size
  // that fills the line. Every read comes before any write: a read after a write forces a layout.
  const fit = () => {
    const sizes = fitEls.map((el) => {
      const w = el.firstElementChild?.getBoundingClientRect().width ?? 0;
      return w > 0 ? Math.floor((parseFloat(getComputedStyle(el).fontSize) * el.clientWidth) / w) - 0.5 : 0;
    });
    fitEls.forEach((el, i) => sizes[i] > 0 && (el.style.fontSize = `${sizes[i]}px`));
  };
  if (fitEls.length) {
    // Watch the parents' widths: only those call for a new size (their heights follow the type, so a
    // change there is the fit's own doing). The fit waits for the next frame: resizing the type inside
    // the observer's call would have it report again within the same frame, which browsers log as an
    // error. The observer's first call does the first fit.
    const widths = new WeakMap<Element, number>();
    let queued = 0;
    const ro = new ResizeObserver((entries) => {
      let wider = false;
      for (const entry of entries) {
        if (widths.get(entry.target) === entry.contentRect.width) continue;
        widths.set(entry.target, entry.contentRect.width);
        wider = true;
      }
      if (wider && !queued)
        queued = requestAnimationFrame(() => {
          queued = 0;
          fit();
        });
    });
    fitEls.forEach((el) => el.parentElement && ro.observe(el.parentElement));
  }
}

/* ---------- Tool marks ---------- */

function startToolMarks() {
  // The tools' logos come from one file (data/tools.ts), fetched only now that the first screen is up:
  // they're all further down the page, and it shouldn't share the connection with that first screen.
  document.querySelectorAll<SVGUseElement>('use[data-href]').forEach((use) => use.setAttribute('href', use.dataset.href!));
}

/* ---------- Review mode: ?review outlines every placeholder ---------- */

function startReview() {
  const params = new URLSearchParams(location.search);
  try {
    if (params.get('review') === '0') sessionStorage.removeItem('nk-review');
    else if (params.has('review')) sessionStorage.setItem('nk-review', '1');
  } catch {
    /* storage blocked: review mode lasts for this page only */
  }
  let reviewing = params.has('review') && params.get('review') !== '0';
  try {
    reviewing ||= sessionStorage.getItem('nk-review') === '1';
  } catch {
    /* ignore */
  }
  if (reviewing) {
    root.classList.add('review');
    const marked = [...document.querySelectorAll<HTMLElement>('body [data-ph]')];
    marked.forEach((el) => (el.title = `Placeholder: ${el.dataset.ph}`));
    const keys = [...new Set(marked.map((el) => el.dataset.ph))];
    const badge = document.createElement('div');
    badge.className = 'review-badge';
    badge.textContent = marked.length
      ? `Review mode: ${marked.length} placeholder${marked.length === 1 ? '' : 's'} on this page (${keys.join(', ')})`
      : 'Review mode: no placeholders on this page';
    document.body.append(badge);
  }
}

/* ---------- Start, most wanted first ---------- */

// Booking first: a button pressed now opens the form instead of following its link. Then what
// comes into view as the visitor scrolls, then the first screen's moving parts, then the rest.
const steps = [
  startBooking,
  startReveal,
  startVsl,
  startClips,
  startFlaps,
  startScroll,
  startFit,
  startToolMarks,
  startLive,
  startDither,
  startMachine,
  startCircuits,
  startReview,
];

/** Hands the main thread back to the browser (input, painting) before the next piece of work. */
const breathe = () =>
  (window as Window & { scheduler?: { yield?: () => Promise<void> } }).scheduler?.yield?.() ??
  new Promise<void>((resolve) => setTimeout(resolve, 0));

(async () => {
  for (const step of steps) {
    step();
    await breathe();
  }
})();
