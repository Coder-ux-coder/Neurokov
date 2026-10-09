/**
 * The bar at the top and the phone menu. Started with the page (boot.ts), not after its first screen
 * like the rest of the site's script: a menu button has to work the moment it can be pressed. Until
 * this runs (and without JavaScript), a link to the footer's list of pages stands in for the button.
 */
// No imports: this goes in the small script every page loads first (boot.ts), on its own.
const root = document.documentElement;
const nav = document.querySelector<HTMLElement>('[data-nav]');
const burger = document.querySelector<HTMLButtonElement>('[data-burger]');
const mobileMenu = document.querySelector<HTMLElement>('[data-mobile-menu]');

/* ---------- Solid background once scrolled ---------- */

const onScroll = () => nav?.classList.toggle('is-scrolled', window.scrollY > 8);
// In the next frame, not now: reading the scroll position while the page starts would lay it out an
// extra time before its first paint.
requestAnimationFrame(onScroll);
addEventListener('scroll', onScroll, { passive: true });

/* ---------- The phone menu ---------- */

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
// A link in the menu closes it, and so does one in the bar above it: the bar's booking button, shown
// beside the menu button on a tablet, opens the booking form, which can't be used while the menu keeps
// the rest of the page inert. On the menu and the bar, so it runs before booking.ts's handler on the document.
const closeOnLink = (e: Event) => {
  if (nav?.classList.contains('is-open') && (e.target as Element).closest('a')) setMenu(false);
};
mobileMenu?.addEventListener('click', closeOnLink);
nav?.addEventListener('click', closeOnLink);
addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || !nav?.classList.contains('is-open')) return;
  setMenu(false);
  burger?.focus();
});
// Wide enough for the links again (the breakpoint in global.css): the menu closes.
const wide = matchMedia('(max-width: 62.5em)');
const onWidth = (e: MediaQueryListEvent) => !e.matches && setMenu(false);
// addListener: Safari before 14 has no addEventListener here.
if (wide.addEventListener) wide.addEventListener('change', onWidth);
else wide.addListener(onWidth);
// Back to a page kept in memory (the back button): the menu that led away from it is closed again.
addEventListener('pageshow', (e) => e.persisted && setMenu(false));

/* ---------- Focus kept in view ---------- */

// Up to 1100px wide, sections off screen hold a placeholder height until they're shown (global.css;
// wider, only until the visitor's first move, below). Tab to something past a few of them and the
// browser scrolls to where it would be at those heights; the sections around it then take their real
// heights, over a few frames, and it can end up off screen or under the bar. It's watched until it
// holds still in view, and brought back each time it isn't.
const placeholders = matchMedia('(max-width: 1100px)');
// Keyboard focus only (a click lands on what's in view); a browser without :focus-visible counts all.
const byKeyboard = (el: Element) => {
  try {
    return el.matches(':focus-visible');
  } catch {
    return true;
  }
};
document.addEventListener('focusin', (e) => {
  const el = e.target as Element;
  if (!placeholders.matches || !byKeyboard(el) || el.closest('dialog')) return;
  let frames = 0;
  let steady = 0;
  const check = () => {
    if (document.activeElement !== el) return;
    const box = el.getBoundingClientRect();
    const css = getComputedStyle(root);
    const top = parseFloat(css.scrollPaddingTop) || 0;
    const bottom = innerHeight - (parseFloat(css.scrollPaddingBottom) || 0);
    if (box.top < top || box.bottom > bottom) {
      el.scrollIntoView({ block: 'nearest' });
      steady = 0;
    } else steady++;
    if (++frames < 40 && steady < 4) requestAnimationFrame(check);
  };
  requestAnimationFrame(check);
});

/* ---------- Every section laid out at the first move, wider than a tablet ---------- */

// There the scroll ruler reads the page's full height and a link scrolls smoothly to its target, so
// the placeholder heights go at the visitor's first move (the pointer, a key, a wheel, a touch), before
// any scroll: every section is laid out (global.css: .laid-out). Until then the first screen is all
// there is to lay out.
const MOVES = ['pointermove', 'pointerdown', 'wheel', 'keydown', 'touchstart', 'focusin', 'scroll'];
const layOut = () => {
  if (placeholders.matches) return;
  root.classList.add('laid-out');
  for (const type of MOVES) removeEventListener(type, layOut, true);
};
for (const type of MOVES) addEventListener(type, layOut, { capture: true, passive: true });

// The button works now: it takes over from the link (global.css).
root.classList.add('menu-ready');
