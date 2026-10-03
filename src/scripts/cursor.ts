/**
 * A small tag that rides beside the pointer over anything clickable and says
 * what the click does: a link's own data-cursor text ('Read case'), or 'Book',
 * 'Open'. The system pointer always stays visible. Mouse and trackpad only,
 * and never with reduced motion.
 */
import { calm, fine } from './lib';

const el = document.querySelector<HTMLElement>('[data-pointer-tag]');
if (el && fine && !calm) tag(el);

function tag(el: HTMLElement) {
  const read = el.querySelector<HTMLElement>('[data-pointer-read]')!;
  let x = -100;
  let y = -100;
  let queued = false;

  const paint = () => {
    queued = false;
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  };

  const DARK = '[data-dark], .footer, .board, .section--ink, .media';
  addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse') return;
      x = e.clientX;
      y = e.clientY;
      const target = e.target as Element;
      // A modal dialog sits in the top layer, above the tag, so over one (or its backdrop) the tag stands down.
      const hot = target.closest('dialog') ? null : target.closest<HTMLElement>('a, button, summary, [data-tip], label');
      const label = hot
        ? hot.dataset.cursor ??
          (hot.hasAttribute('data-book') ? 'Book' : hot.dataset.tip !== undefined ? 'Inspect' : hot.tagName === 'A' ? 'Open' : 'Click')
        : '';
      if (label) read.textContent = label;
      el.classList.toggle('is-on', !!label);
      el.classList.toggle('is-dark', !!target.closest(DARK));
      if (!queued) requestAnimationFrame(paint);
      queued = true;
    },
    { passive: true },
  );
  document.documentElement.addEventListener('pointerleave', () => el.classList.remove('is-on'));
  addEventListener('blur', () => el.classList.remove('is-on'));
}
