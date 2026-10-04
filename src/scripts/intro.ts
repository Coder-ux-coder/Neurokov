/**
 * The boot intro: the log types itself out, the counter runs to 100, the mark
 * builds, then the shutter splits open and 'nk:intro-done' starts the hero.
 * Any key, click, wheel or touch skips it. It plays once per session.
 */
import { root, sleep } from './lib';

const el = document.querySelector<HTMLElement>('[data-intro]');
if (el && root.classList.contains('intro-play')) boot(el);

function boot(el: HTMLElement) {
  try {
    sessionStorage.setItem('nk-intro', '1');
  } catch {
    /* storage blocked: it may play again on the next page load */
  }

  const lines = [...el.querySelectorAll<HTMLElement>('[data-intro-line]')];
  const bar = el.querySelector<HTMLElement>('[data-intro-bar]');
  const count = el.querySelector<HTMLElement>('[data-intro-count]');
  const stems = [...el.querySelectorAll<SVGElement>('.intro__stem')];
  const diag = el.querySelector<SVGElement>('.intro__diag');
  // Every line lands by about 2.8s, then the full log holds for a second so it can be read. A visitor
  // whose connection took seconds to bring the page has waited enough: they get the short version.
  const DURATION = performance.now() > 3000 ? 1600 : 3900;
  const start = performance.now();
  let done = false;

  const ease = 'cubic-bezier(.7,0,.2,1)';
  stems.forEach((s, i) =>
    s.animate([{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], {
      duration: 700,
      delay: 160 + i * 240,
      easing: ease,
      fill: 'forwards',
    }),
  );
  diag?.animate([{ transform: 'scale(0)' }, { transform: 'scale(1)' }], {
    duration: 800,
    delay: 760,
    easing: ease,
    fill: 'forwards',
  });

  // Each line types itself out, then its status lands.
  const labels = lines.map((li) => li.querySelector<HTMLElement>('.intro__label')!);
  const texts = labels.map((l) => l.textContent ?? '');
  labels.forEach((l) => (l.textContent = ''));
  (async () => {
    for (let i = 0; i < lines.length && !done; i++) {
      lines[i].classList.add('is-on');
      const text = texts[i];
      for (let c = 1; c <= text.length && !done; c += 2) {
        labels[i].textContent = text.slice(0, c);
        await sleep(16);
      }
      labels[i].textContent = text;
      await sleep(120);
      lines[i].classList.add('is-ok');
      await sleep(200);
    }
  })();

  const tick = (now: number) => {
    if (done) return;
    const t = Math.min(1, (now - start) / (DURATION - 200));
    const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    if (count) count.textContent = String(Math.round(e * 100)).padStart(3, '0');
    if (bar) bar.style.clipPath = `inset(0 ${100 - e * 100}% 0 0)`;
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  const finish = () => {
    if (done) return;
    done = true;
    lines.forEach((li, i) => {
      labels[i].textContent = texts[i];
      li.classList.add('is-on', 'is-ok');
    });
    if (count) count.textContent = '100';
    if (bar) bar.style.clipPath = 'inset(0)';
    el.classList.add('is-leaving');
    document.dispatchEvent(new CustomEvent('nk:intro-done'));
    removeEventListener('keydown', finish);
    removeEventListener('wheel', finish);
    removeEventListener('touchstart', finish);
    // The shutter halves wait 180ms, then take 950ms to clear the screen.
    setTimeout(() => {
      root.classList.remove('intro-play');
      el.remove();
    }, 1150);
  };

  setTimeout(finish, DURATION);
  addEventListener('keydown', finish);
  addEventListener('wheel', finish, { passive: true });
  addEventListener('touchstart', finish, { passive: true });
  el.addEventListener('pointerdown', finish);
}
