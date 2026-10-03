/**
 * The case study index on the homepage: on a desktop, the story clip for the
 * row under the cursor plays in a frame that follows it down the list, leaning
 * into the movement. With reduced motion the frame shows the clip's poster.
 */
import { calm, fine, liveOk, loop, playPreview } from './lib';

const host = document.querySelector<HTMLElement>('[data-studies]');
if (host && fine) studies(host);

function studies(host: HTMLElement) {
  const preview = host.querySelector<HTMLElement>('.studies__preview')!;
  const frame = host.querySelector<HTMLElement>('.studies__frame')!;
  const frames = [...frame.querySelectorAll<HTMLElement>('.media')];
  const films = frames.map((f) => f.querySelector('video')!);
  // In a narrow window the rows show their posters inline and the frame is hidden (CSS), so nothing plays in it.
  const wide = matchMedia('(min-width: 901px)');
  const show = (i: number) =>
    films.forEach((v, k) => {
      if (k === i && liveOk && wide.matches) playPreview(v);
      else v.pause();
    });
  const label = host.querySelector<HTMLElement>('[data-studies-label]');
  const rows = [...host.querySelectorAll<HTMLAnchorElement>('.row')];

  let tx = 0;
  let ty = 0;
  let x = 0;
  let y = 0;
  let on = false;

  const engine = loop(() => {
    const k = calm ? 1 : 0.16;
    const dx = tx - x;
    x += dx * k;
    y += (ty - y) * k;
    const w = preview.offsetWidth;
    const h = preview.offsetHeight;
    preview.style.transform = `translate3d(${(x - w / 2).toFixed(1)}px, ${(y - h / 2).toFixed(1)}px, 0)`;
    frame.style.setProperty('--tilt', `${Math.max(-7, Math.min(7, dx * 0.05)).toFixed(2)}deg`);
    if (!on && Math.abs(dx) < 0.5) engine.stop();
  });

  rows.forEach((row, i) => {
    row.addEventListener('pointerenter', (e) => {
      frames.forEach((f, k) => f.classList.toggle('is-on', k === i));
      show(i);
      if (label) label.textContent = `Case ${String(i + 1).padStart(2, '0')}`;
      if (!on) {
        x = tx = e.clientX + 60;
        y = ty = e.clientY;
      }
      on = true;
      preview.classList.add('is-on');
      engine.start();
    });
  });
  host.addEventListener('pointermove', (e) => {
    // Sit to the right of the pointer, so the row text stays readable.
    tx = e.clientX + Math.min(260, innerWidth * 0.16);
    ty = e.clientY;
  });
  host.addEventListener('pointerleave', () => {
    on = false;
    preview.classList.remove('is-on');
    show(-1);
  });
}
