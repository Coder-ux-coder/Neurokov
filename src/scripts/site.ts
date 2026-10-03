/**
 * The site's behaviour. This file holds the basics (nav, theme, review mode);
 * booking and each effect live in their own modules, imported below.
 */
import { currentTheme, root, store, type Theme } from './lib';
import './intro';
import './reveal';
import './flap';
import './slides';
import './clips';
import './guide';
import './booking';
import './machine';
import './dither';
import './live';
import './circuit';
import './studies';
import './scroll';
import './cursor';

/* ---------- Nav: solid background once scrolled, mobile menu ---------- */

const nav = document.querySelector<HTMLElement>('[data-nav]');
const burger = document.querySelector<HTMLButtonElement>('[data-burger]');
const mobileMenu = document.querySelector<HTMLElement>('[data-mobile-menu]');

const onScroll = () => nav?.classList.toggle('is-scrolled', window.scrollY > 8);
onScroll();
addEventListener('scroll', onScroll, { passive: true });

const setMenu = (open: boolean) => {
  nav?.classList.toggle('is-open', open);
  burger?.setAttribute('aria-expanded', String(open));
  document.body.style.overflow = open ? 'hidden' : '';
  // While the menu covers the page, the page behind it can't be tabbed into or read out.
  for (const el of document.body.children) {
    if (el !== nav && el !== mobileMenu && el instanceof HTMLElement) el.inert = open;
  }
};
burger?.addEventListener('click', () => setMenu(!nav?.classList.contains('is-open')));
mobileMenu?.addEventListener('click', (e) => {
  if ((e.target as Element).closest('a')) setMenu(false);
});
addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || !nav?.classList.contains('is-open')) return;
  setMenu(false);
  burger?.focus();
});
// Wide enough for the links again (the breakpoint in global.css): the menu closes.
matchMedia('(max-width: 62.5em)').addEventListener('change', (e) => !e.matches && setMenu(false));
// Back to a page kept in memory (the back button): the menu that led away from it is closed again.
addEventListener('pageshow', (e) => e.persisted && setMenu(false));

/* ---------- Big type that fills its line ---------- */

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
  document.fonts?.ready.then(fit);
  // Watch the parents: their width doesn't depend on the type size, so fitting can't loop. The
  // observer's first call, before the first paint, does the first fit.
  const ro = new ResizeObserver(fit);
  fitEls.forEach((el) => el.parentElement && ro.observe(el.parentElement));
}

/* ---------- Theme toggle ---------- */

const themeMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
const applyTheme = (theme: Theme) => {
  if (theme === 'dark') root.dataset.theme = 'dark';
  else delete root.dataset.theme;
  themeMeta?.setAttribute('content', theme === 'dark' ? '#0f0f0e' : '#f2efe8');
  document.dispatchEvent(new CustomEvent('nk:theme', { detail: theme }));
};
document.querySelector('[data-theme-toggle]')?.addEventListener('click', () => {
  const next: Theme = currentTheme() === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  store.set('nk-theme', next);
});

/* ---------- Review mode: ?review outlines every placeholder ---------- */

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

// Everything above ran: the head script's no-JavaScript fallback can stand down (Base.astro).
root.dataset.ready = '';
