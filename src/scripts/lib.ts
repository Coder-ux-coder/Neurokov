/** Small helpers shared by the site's scripts. */

export const root = document.documentElement;
export const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
/** A mouse or trackpad, as opposed to a touch screen. */
export const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

/** Whether the browser lets the site keep notes at all (blocked storage, some private modes don't). */
export const storageWorks = (() => {
  try {
    localStorage.setItem('nk-test', '1');
    localStorage.removeItem('nk-test');
    return true;
  } catch {
    return false;
  }
})();

export const store = {
  get(key: string) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* private mode or blocked storage: the setting just won't persist */
    }
  },
};

/** Living photos play unless motion is reduced or the visitor asked to save data. */
export const liveOk = !calm && !(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;

/** The visitor has paused the site's moving parts with the motion button (the head script, Base.astro). */
export const still = () => root.classList.contains('still');
/** Calls fn each time the visitor pauses or restarts the moving parts. */
export const onMotion = (fn: () => void) => document.addEventListener('nk-motion', fn);

/**
 * Once the page has loaded and the browser has a moment to spare. Films and loops start no sooner, so a
 * phone fetches the page, its fonts and its first screen before any video, and nothing looks different
 * while they wait: each one's poster is its first frame.
 */
export const settled = new Promise<void>((resolve) => {
  const idle = () => ('requestIdleCallback' in window ? requestIdleCallback(() => resolve(), { timeout: 1000 }) : setTimeout(resolve, 100));
  if (document.readyState === 'complete') idle();
  else addEventListener('load', idle, { once: true });
});

/** Plays a living photo's loop, fetching it first if need be; it fades in once it runs. */
export function playLive(video: HTMLVideoElement) {
  if (!('bound' in video.dataset)) {
    video.dataset.bound = '';
    video.addEventListener('playing', () => video.classList.add('is-playing'));
  }
  video.play().catch(() => {
    /* autoplay refused (a power saver, say): the still stays */
  });
}

/** Plays a story clip's preview: the first time, from its poster's frame (Clip.astro), so the still turns into motion without a jump. */
export function playPreview(video: HTMLVideoElement) {
  if (!('bound' in video.dataset)) video.currentTime = Number(video.dataset.at ?? 0);
  playLive(video);
}

/** Calls fn the first time el scrolls into view. */
export function onceVisible(el: Element, fn: () => void, options: IntersectionObserverInit = { threshold: 0.25 }) {
  if (!('IntersectionObserver' in window)) return fn();
  const io = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    io.disconnect();
    fn();
  }, options);
  io.observe(el);
}

/** Tells cb whenever el enters or leaves the viewport. */
export function watchVisible(el: Element, cb: (visible: boolean) => void, options: IntersectionObserverInit = {}) {
  if (!('IntersectionObserver' in window)) return cb(true);
  new IntersectionObserver((entries) => cb(entries[entries.length - 1].isIntersecting), options).observe(el);
}

export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
export const pad = (n: number, len = 3) => String(Math.max(0, Math.round(n))).padStart(len, '0');

/** One requestAnimationFrame loop that pauses itself while the page is hidden. */
export function loop(step: (dt: number, now: number) => void) {
  let raf = 0;
  let last = 0;
  let wanted = false;
  const frame = (now: number) => {
    const dt = Math.min(64, now - (last || now));
    last = now;
    step(dt, now);
    raf = requestAnimationFrame(frame);
  };
  const run = () => {
    if (raf || !wanted || document.hidden) return;
    last = 0;
    raf = requestAnimationFrame(frame);
  };
  const halt = () => {
    cancelAnimationFrame(raf);
    raf = 0;
  };
  document.addEventListener('visibilitychange', () => (document.hidden ? halt() : run()));
  return {
    start() {
      wanted = true;
      run();
    },
    stop() {
      wanted = false;
      halt();
    },
  };
}
