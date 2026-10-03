/**
 * The welcome guide (Guide.astro). On a first visit to the homepage NK-01 says
 * hello in the corner; "Show me" plays the welcome clip in a dialog, and from
 * there a spotlight walks the page one stop at a time (Back, Next, Esc to
 * leave). The guide remembers that it said hello (nk-guide) and waits in the
 * corner afterwards; ?guide in the address shows the hello again. With reduced
 * motion nothing bounces or glides, and the clip waits for its play button.
 */
import { player } from './clips';
import { afterIntro, calm, clamp, fine, loop, root, store } from './lib';
import { decode } from './reveal';

type Stop = { target: string; title: string; text: string; hint?: string };

const host = document.querySelector<HTMLElement>('[data-guide]');
if (host) guide(host);

function guide(host: HTMLElement) {
  const $ = <T extends HTMLElement>(s: string) => host.querySelector<T>(s)!;
  const hello = $('[data-guide-hello]');
  const dock = $<HTMLButtonElement>('[data-guide-dock]');
  const dialog = $<HTMLDialogElement>('[data-guide-film]');
  const film = player(dialog.querySelector<HTMLElement>('.clip')!);
  const layer = $('[data-tour]');
  const hole = $('[data-tour-hole]');
  const tip = $('[data-tour-tip]');
  const next = $<HTMLButtonElement>('[data-tour-next]');
  const back = $<HTMLButtonElement>('[data-tour-back]');
  const stops = (JSON.parse(host.dataset.stops ?? '[]') as Stop[])
    .map((s) => ({ ...s, el: document.querySelector<HTMLElement>(s.target) }))
    .filter((s): s is Stop & { el: HTMLElement } => !!s.el);

  const remember = () => store.set('nk-guide', 'seen');

  /* ---------- Hello, and the dock it retires to ---------- */

  // Focus moves to the hello only when the visitor asked for it (the dock), not when it pops up.
  const showHello = (focus = false) => {
    dock.hidden = true;
    hello.hidden = false;
    hello.inert = false;
    hello.classList.remove('is-out');
    decode($('[data-guide-title]'), undefined, 900);
    if (focus) $<HTMLButtonElement>('[data-guide-show]').focus({ preventScroll: true });
  };
  // Inert while it leaves, so a second click (Show me, then Not now) can't start a second action.
  const hideHello = () =>
    new Promise<void>((done) => {
      if (hello.hidden) return done();
      hello.inert = true;
      hello.classList.add('is-out');
      setTimeout(
        () => {
          hello.hidden = true;
          done();
        },
        calm ? 0 : 280,
      );
    });
  const toDock = (focus = false) => {
    dock.hidden = false;
    if (focus) dock.focus({ preventScroll: true });
  };

  host.querySelectorAll('[data-guide-later]').forEach((b) =>
    b.addEventListener('click', async () => {
      remember();
      await hideHello();
      toDock(true);
    }),
  );
  dock.addEventListener('click', () => showHello(true));

  /* ---------- The welcome clip ---------- */

  $('[data-guide-show]').addEventListener('click', async () => {
    if (hello.inert) return;
    remember();
    await hideHello();
    // A browser without modal dialogs (Safari before 15.4) goes straight to the tour.
    if (typeof dialog.showModal !== 'function') return startTour();
    if (!dialog.open) dialog.showModal();
    film.restart();
    film.want(true);
  });
  let handingOver = false;
  dialog.addEventListener('close', () => {
    film.want(false);
    if (document.fullscreenElement && dialog.contains(document.fullscreenElement)) document.exitFullscreen().catch(() => {});
    if (!handingOver) toDock(true);
    handingOver = false;
  });
  // Esc while the film is full screen only leaves full screen: the dialog stays open. The two can
  // arrive in either order, so a cancel just after leaving full screen counts too.
  let leftFullscreen = -Infinity;
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) leftFullscreen = performance.now();
  });
  dialog.addEventListener('cancel', (e) => {
    if (document.fullscreenElement) {
      e.preventDefault();
      document.exitFullscreen().catch(() => {});
    } else if (performance.now() - leftFullscreen < 400) e.preventDefault();
  });
  // A click on the backdrop (the dialog itself, outside its box) closes it. Only a click that
  // started there too: selecting text in the box and letting go outside it isn't one.
  let pressedOutside = false;
  dialog.addEventListener('pointerdown', (e) => (pressedOutside = e.target === dialog));
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog && pressedOutside) dialog.close();
    pressedOutside = false;
  });
  $('[data-guide-close]').addEventListener('click', () => dialog.close());
  // Cal.com's booking popup can't sit above a modal dialog, so the dialog steps aside.
  dialog.querySelectorAll('[data-book]').forEach((b) => b.addEventListener('click', () => dialog.close()));
  $('[data-guide-tour]').addEventListener('click', () => {
    handingOver = true;
    dialog.close();
    startTour();
  });

  /* ---------- The tour: a spotlight on one part of the page at a time ---------- */

  const GAP = 16;
  const PAD = 12;
  let at = -1;
  // The spotlight and the tip live in page coordinates, so they ride along
  // with the page as it scrolls; only the move between stops glides.
  const spot = { x: 0, y: 0, w: 0, h: 0 };
  let tipY = 0;
  // Where the tip sits against its stop: under it, over it, beside it, or (a stop too
  // big for any of those) floating over the stop's lower part.
  let side: 'below' | 'above' | 'left' | 'right' | 'over' = 'below';
  let snap = true;

  const navH = () => parseFloat(getComputedStyle(root).getPropertyValue('--nav-h')) || 72;
  const docked = () => innerWidth < 700;
  const rectOf = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    return { x: r.left + scrollX - PAD, y: r.top + scrollY - PAD, w: r.width + 2 * PAD, h: r.height + 2 * PAD };
  };
  // Where a stop will sit once it has scrolled in: its layout position, since
  // until then its reveal (reveal.ts) may still have it shifted down.
  const settledRect = (el: HTMLElement) => {
    let y = 0;
    for (let e: HTMLElement | null = el; e; e = e.offsetParent as HTMLElement | null) y += e.offsetTop;
    return { ...rectOf(el), y: y - PAD, h: el.offsetHeight + 2 * PAD };
  };

  const place = () => {
    if (at < 0) return;
    const t = rectOf(stops[at].el);
    const k = snap || calm ? 1 : 0.2;
    snap = false;
    spot.x += (t.x - spot.x) * k;
    spot.y += (t.y - spot.y) * k;
    spot.w += (t.w - spot.w) * k;
    spot.h += (t.h - spot.h) * k;
    hole.style.transform = `translate3d(${(spot.x - scrollX).toFixed(1)}px, ${(spot.y - scrollY).toFixed(1)}px, 0)`;
    hole.style.width = `${spot.w.toFixed(1)}px`;
    hole.style.height = `${spot.h.toFixed(1)}px`;
    if (docked()) {
      tip.style.transform = '';
      return;
    }
    const w = tip.offsetWidth;
    const tx = side === 'left' ? t.x - GAP - w : side === 'right' ? t.x + t.w + GAP : t.x;
    const x = clamp(tx - scrollX, GAP, innerWidth - w - GAP);
    const y = clamp(tipY - scrollY, navH() + 8, innerHeight - tip.offsetHeight - GAP);
    tip.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
  };
  const engine = loop(place);

  const label = (btn: HTMLElement, text: string) =>
    btn.querySelectorAll('.btn__label > span').forEach((s) => (s.textContent = text));

  const go = (n: number) => {
    at = clamp(n, 0, stops.length - 1);
    const s = stops[at];
    $('[data-tour-n]').textContent = String(at + 1).padStart(2, '0');
    $('[data-tour-title]').textContent = s.title;
    $('[data-tour-text]').textContent = s.hint && fine ? `${s.text} ${s.hint}` : s.text;
    back.disabled = at === 0;
    label(next, at === stops.length - 1 ? 'Finish' : 'Next');
    tip.classList.remove('is-new');
    void tip.offsetWidth;
    tip.classList.add('is-new');
    frame(calm ? 'auto' : 'smooth');
    next.focus({ preventScroll: true });
  };

  // Scroll so the stop and its tip fit on screen together, the tip below the
  // stop. A stop too tall for that has the tip beside it if there's room at
  // its side; if not, it starts under the nav and the tip floats over its
  // lower part. Near the ends of the page, the tip goes above.
  const frame = (behavior: ScrollBehavior) => {
    const t = settledRect(stops[at].el);
    const top = navH() + GAP;
    const tipH = tip.offsetHeight;
    // On a phone the tip is docked at the bottom of the screen, so the stop gets the rest.
    const room = innerHeight - top - GAP - (docked() ? tipH + GAP : 0);
    const stacked = t.h + GAP + tipH;
    const pair = docked() || (stacked > room && besideRoom(t)) ? t.h : stacked;
    const want = pair <= room ? t.y - top - (room - pair) / 2 : t.y - top;
    const y = clamp(want, 0, root.scrollHeight - innerHeight);
    aim(y);
    scrollTo({ top: y, behavior });
  };

  // Which side of the stop has room for the tip, if either.
  const besideRoom = (t: { x: number; w: number }) => {
    const w = tip.offsetWidth;
    const x = t.x - scrollX;
    if (x - GAP - w >= GAP) return 'left';
    if (innerWidth - (x + t.w) - GAP - w >= GAP) return 'right';
    return null;
  };

  // Where the tip sits, in page coordinates, once the page is scrolled to y.
  const aim = (y: number) => {
    const t = settledRect(stops[at].el);
    const tipH = tip.offsetHeight;
    const top = navH() + GAP;
    const beside = besideRoom(t);
    if (t.y + t.h + GAP - y + tipH <= innerHeight - GAP) {
      side = 'below';
      tipY = t.y + t.h + GAP;
    } else if (t.y - y - GAP - tipH >= top) {
      side = 'above';
      tipY = t.y - GAP - tipH;
    } else if (beside) {
      side = beside;
      tipY = Math.max(t.y, y + top);
    } else {
      side = 'over';
      tipY = t.y + t.h + GAP;
    }
  };
  // A new width reflows the page, so once it settles the stop is framed again. A new height alone
  // (a phone's address bar sliding away as the visitor scrolls) only moves the tip: re-framing
  // then would fight their scrolling.
  let lastW = innerWidth;
  let settle = 0;
  addEventListener(
    'resize',
    () => {
      const widened = innerWidth !== lastW;
      lastW = innerWidth;
      if (at < 0) return;
      aim(scrollY);
      if (!widened) return;
      clearTimeout(settle);
      settle = window.setTimeout(() => at >= 0 && frame('auto'), 160);
    },
    { passive: true },
  );

  function startTour() {
    if (!stops.length) return;
    dock.hidden = true;
    layer.hidden = false;
    root.classList.add('touring');
    snap = true;
    go(0);
    place();
    engine.start();
  }

  const endTour = () => {
    if (layer.hidden) return;
    engine.stop();
    at = -1;
    layer.hidden = true;
    root.classList.remove('touring');
    toDock(true);
  };

  next.addEventListener('click', () => (at === stops.length - 1 ? endTour() : go(at + 1)));
  back.addEventListener('click', () => go(at - 1));
  $('[data-tour-end]').addEventListener('click', endTour);
  // Booking from inside the tour (the last stop's button) ends it, so the booking popup has the
  // page; so does opening the phone menu, which covers the page the tour is pointing at.
  document.addEventListener('click', (e) => (e.target as Element).closest?.('[data-book], [data-burger]') && endTour());
  addEventListener('keydown', (e) => {
    if (layer.hidden || document.fullscreenElement) return;
    if (e.key === 'Escape') endTour();
    else if (e.key === 'ArrowRight') next.click();
    else if (e.key === 'ArrowLeft' && at > 0) go(at - 1);
  });

  /* ---------- First visit ---------- */

  const asked = new URLSearchParams(location.search).has('guide');
  if (store.get('nk-guide') && !asked) toDock();
  else afterIntro(() => setTimeout(showHello, calm ? 400 : 1400));
}
