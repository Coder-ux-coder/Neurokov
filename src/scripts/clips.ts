/**
 * Story clips (Clip.astro). An "auto" clip plays while it's on screen and
 * pauses when it isn't; with reduced motion or save-data it waits for its play
 * button. A "hover" clip plays while the pointer is over its card, and fades
 * back to its poster when the pointer leaves. "manual" clips belong to the hero
 * reel (slides.ts), the case index (studies.ts) and the welcome guide
 * (guide.ts), which run them.
 */
import { calm, fine, liveOk, loop, playLive, playPreview, watchVisible } from './lib';

document.querySelectorAll<HTMLElement>('[data-clip="auto"]').forEach((host) => {
  const film = player(host);
  watchVisible(host, film.want, { threshold: 0.4 });
});
if (fine && !calm) document.querySelectorAll<HTMLElement>('[data-clip="hover"]').forEach(hover);

/**
 * Runs a clip with controls: it plays while its page wants it (on screen, in
 * an open dialog) unless the visitor paused it. A clip that doesn't loop ends
 * on its play button, which starts it again.
 */
export function player(host: HTMLElement) {
  const video = host.querySelector('video')!;
  const toggle = host.querySelector<HTMLButtonElement>('[data-clip-toggle]');
  const label = host.querySelector<HTMLElement>('[data-clip-label]');
  const bar = host.querySelector<HTMLElement>('[data-clip-bar]');
  const full = host.querySelector<HTMLButtonElement>('[data-clip-full]');
  let held = !liveOk;
  let wanted = false;

  const meter = loop(() => {
    if (bar) bar.style.transform = `scaleX(${(video.currentTime / (video.duration || 1)).toFixed(4)})`;
  });
  const sync = () => {
    if (wanted && !held && !document.hidden) {
      playLive(video);
      meter.start();
    } else {
      video.pause();
      meter.stop();
    }
    host.classList.toggle('is-held', held);
    toggle?.setAttribute('aria-pressed', String(held));
    if (label) label.textContent = held ? 'Play the story' : 'Pause the story';
  };

  toggle?.addEventListener('click', () => {
    held = !held;
    sync();
  });
  video.addEventListener('ended', () => {
    held = true;
    sync();
  });

  // Full screen: the whole frame where the browser allows it (an iPhone only
  // lets the video itself go full screen). Going full screen starts the story.
  full?.addEventListener('click', () => {
    if (document.fullscreenElement) return void document.exitFullscreen().catch(() => {});
    if (held) {
      held = false;
      sync();
    }
    if (host.requestFullscreen) host.requestFullscreen().catch(() => {});
    else (video as HTMLVideoElement & { webkitEnterFullscreen?: () => void }).webkitEnterFullscreen?.();
  });
  document.addEventListener('fullscreenchange', () => {
    full?.setAttribute('aria-label', document.fullscreenElement === host ? 'Exit full screen' : 'Watch full screen');
  });
  document.addEventListener('visibilitychange', sync);
  sync();

  return {
    /** Whether the page wants the clip running just now. */
    want(on: boolean) {
      wanted = on;
      sync();
    },
    /** Back to the first frame; it plays unless reduced motion holds it. */
    restart() {
      video.currentTime = 0;
      held = !liveOk;
      sync();
    },
  };
}

function hover(host: HTMLElement) {
  const video = host.querySelector('video')!;
  const card = host.closest<HTMLElement>('a') ?? host;
  card.addEventListener('pointerenter', () => playPreview(video));
  card.addEventListener('pointerleave', () => {
    video.pause();
    video.classList.remove('is-playing');
  });
}
