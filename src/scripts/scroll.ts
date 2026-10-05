/**
 * Scroll-driven pieces: the ruler on the right edge, the process page's pinned
 * step counter, and the case study contents that follow along.
 */
import { Flap } from './flap';
import { calm } from './lib';

/* ---------- Ruler ---------- */

const ruler = document.querySelector<HTMLElement>('[data-ruler]');
const rulerRead = ruler?.querySelector<HTMLElement>('[data-ruler-read]');
if (ruler) {
  let queued = false;
  const paint = () => {
    queued = false;
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? Math.min(1, scrollY / max) : 0;
    ruler.style.setProperty('--p', p.toFixed(4));
    if (rulerRead) rulerRead.textContent = String(Math.round(p * 100)).padStart(3, '0');
  };
  const queue = () => {
    if (!queued) requestAnimationFrame(paint);
    queued = true;
  };
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue, { passive: true });
  queue();
}

/* ---------- Process page: the step you're reading lights up and the counter flips ---------- */

const scrolly = document.querySelector<HTMLElement>('[data-scrolly]');
if (scrolly && 'IntersectionObserver' in window) {
  const steps = [...scrolly.querySelectorAll<HTMLElement>('[data-step]')];
  const flapEl = scrolly.querySelector<HTMLElement>('[data-flap]');
  const flap = flapEl ? new Flap(flapEl) : null;
  const rail = scrolly.querySelector<HTMLElement>('[data-rail]');
  const name = scrolly.querySelector<HTMLElement>('[data-step-name]');
  // Step one is lit from the start, as the counter already reads 01.
  let current = 0;
  steps[0]?.classList.add('is-current');
  const setStep = (i: number) => {
    if (i === current) return;
    current = i;
    // With reduced motion every step stays lit (below); only the counter follows along.
    steps.forEach((s, k) => s.classList.toggle('is-current', calm || k === i));
    flap?.set(String(i + 1).padStart(2, '0'), { flips: 3 });
    rail?.style.setProperty('--p', String((i + 1) / steps.length));
    if (name) name.textContent = steps[i].dataset.step ?? '';
  };
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) if (e.isIntersecting) setStep(steps.indexOf(e.target as HTMLElement));
    },
    { rootMargin: '-45% 0px -45% 0px' },
  );
  steps.forEach((s) => io.observe(s));
  if (calm) steps.forEach((s) => s.classList.add('is-current'));
}

/* ---------- Case study contents ---------- */

const toc = document.querySelector<HTMLElement>('[data-toc]');
if (toc && 'IntersectionObserver' in window) {
  const links = [...toc.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')];
  const sections = links.map((a) => document.querySelector<HTMLElement>(a.hash)).filter(Boolean) as HTMLElement[];
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        links.forEach((a) => a.classList.toggle('is-current', a.hash === `#${e.target.id}`));
      }
    },
    { rootMargin: '-30% 0px -60% 0px' },
  );
  sections.forEach((s) => io.observe(s));
}
