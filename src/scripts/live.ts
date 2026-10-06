/**
 * Living photos: the loop over a [data-live] photo plays while the photo is on
 * screen (and, if it develops out of a dither, once it has) and pauses when it
 * isn't.
 */
import { liveOk, playLive, settled, watchVisible } from './lib';

if (liveOk) document.querySelectorAll<HTMLVideoElement>('video[data-live]').forEach(live);

function live(video: HTMLVideoElement) {
  const media = video.parentElement!;
  let visible = false;
  const sync = () => {
    const ready = !media.hasAttribute('data-dither') || media.classList.contains('is-developed');
    if (visible && ready && !document.hidden) playLive(video);
    else video.pause();
  };
  settled.then(() => watchVisible(media, (v) => ((visible = v), sync()), { threshold: 0.15 }));
  document.addEventListener('visibilitychange', sync);
  if (media.hasAttribute('data-dither')) new MutationObserver(sync).observe(media, { attributeFilter: ['class'] });
}
