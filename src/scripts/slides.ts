/**
 * The homepage reel. Each case study's story clip plays through, then hands
 * over to the next; the segment under the reel fills as the story plays, and
 * the split-flap readout flips to the story's number. Pausing (the button, a
 * click on the film, scrolling away, a hidden tab) holds the story where it
 * is. With reduced motion or save-data, nothing plays until asked.
 */
import { Flap } from './flap';
import { afterIntro, liveOk, loop, playLive, settled, watchVisible } from './lib';
import { decode } from './reveal';

const host = document.querySelector<HTMLElement>('[data-slides]');
if (host) reel(host);

function reel(host: HTMLElement) {
  const slides = [...host.querySelectorAll<HTMLElement>('.slide')];
  const films = slides.map((s) => s.querySelector('video')!);
  const dots = [...host.querySelectorAll<HTMLButtonElement>('[data-slide-to]')];
  const fills = dots.map((d) => d.querySelector('span')!);
  const flap = new Flap(host.querySelector<HTMLElement>('[data-flap]')!);
  const q = <T extends HTMLElement>(s: string) => host.querySelector<T>(s)!;
  const label = q('[data-slide-label]');
  const title = q('[data-slide-title]');
  const num = q('[data-slide-n]');
  const link = q<HTMLAnchorElement>('[data-slide-link]');
  const say = q('[data-slide-say]');
  const pauseBtn = q<HTMLButtonElement>('[data-slide-pause]');
  const viewport = q('.slides__viewport');

  let i = 0;
  let held = !liveOk;
  let visible = true;
  let started = false;
  let ready = false; // the page has settled (lib.ts): until then no film loads

  const running = () => started && ready && !held && visible && !document.hidden;

  const meter = loop(() => {
    const v = films[i];
    fills[i].style.transform = `scaleX(${(v.currentTime / (v.duration || 20)).toFixed(4)})`;
    // fetch the next story while this one plays, so the hand-over is instant
    if (v.currentTime > 6) films[(i + 1) % films.length].preload = 'auto';
  });

  const sync = () => {
    const run = running();
    films.forEach((v, k) => {
      if (k === i && run) playLive(v);
      else v.pause();
    });
    if (run) meter.start();
    else meter.stop();
    host.classList.toggle('is-paused', !run);
    pauseBtn.setAttribute('aria-pressed', String(held));
    pauseBtn.setAttribute('aria-label', held ? 'Play the story' : 'Pause the story');
  };

  // `asked`: the visitor changed story, so a screen reader hears which one (not when the reel moves on by itself).
  const go = (n: number, { instant = false, asked = false } = {}) => {
    films[i].pause();
    i = (n + slides.length) % slides.length;
    slides.forEach((s, k) => {
      s.classList.toggle('is-active', k === i);
      if (k === i) s.removeAttribute('aria-hidden');
      else s.setAttribute('aria-hidden', 'true');
    });
    dots.forEach((d, k) => {
      d.classList.toggle('is-active', k === i);
      d.setAttribute('aria-current', String(k === i));
      fills[k].style.transform = `scaleX(${k < i ? 1 : 0})`;
    });
    const d = slides[i].dataset;
    flap.set(d.stat ?? '', { flips: instant ? 7 : 4 });
    decode(label, d.label, 650);
    num.textContent = d.n ?? '';
    title.textContent = d.title ?? '';
    link.href = d.href ?? '#';
    if (asked) say.textContent = `Case ${d.n}, ${d.title}: ${d.stat} ${d.label}.`;
    if (ready) films[i].preload = 'auto';
    films[i].currentTime = 0;
    sync();
  };
  const pick = (n: number) => go(n, { asked: true });

  films.forEach((v, k) => v.addEventListener('ended', () => k === i && go(i + 1)));
  dots.forEach((d, k) => d.addEventListener('click', () => pick(k)));
  q('[data-slide-prev]').addEventListener('click', () => pick(i - 1));
  q('[data-slide-next]').addEventListener('click', () => pick(i + 1));
  const toggle = () => {
    held = !held;
    sync();
  };
  pauseBtn.addEventListener('click', toggle);

  host.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') pick(i - 1);
    if (e.key === 'ArrowRight') pick(i + 1);
  });

  // A click on the film pauses or plays it; a swipe on a touch screen changes story.
  let x0: number | null = null;
  viewport.addEventListener('pointerdown', (e) => (x0 = e.clientX));
  viewport.addEventListener('pointerup', (e) => {
    if (x0 === null) return;
    const dx = e.clientX - x0;
    x0 = null;
    if (Math.abs(dx) > 45) pick(dx < 0 ? i + 1 : i - 1);
    else toggle();
  });
  // A touch the browser takes over for scrolling ends in a cancel, not a tap.
  viewport.addEventListener('pointercancel', () => (x0 = null));

  watchVisible(host, (v) => ((visible = v), sync()), { threshold: 0.2 });
  document.addEventListener('visibilitychange', sync);

  flap.blank();
  sync();
  afterIntro(() => {
    started = true;
    go(0, { instant: true });
  });
  settled.then(() => {
    ready = true;
    films[i].preload = 'auto';
    sync();
  });
}
