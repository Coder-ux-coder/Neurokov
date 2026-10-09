/**
 * Starts the bar and its menu at once (shell.ts), and the rest of the site's script (site.ts) once
 * the first screen is up. Everything the first screen shows is in the page and its stylesheet, so
 * the browser paints it as soon as the page arrives; the script, which nothing there waits for, is
 * fetched and run after that instead of holding it up. Should it fail, the page falls back to how it
 * reads without JavaScript.
 */
import './shell';

const root = document.documentElement;

// Claims the page for the script: the head script (Base.astro) otherwise shows it as it reads
// without JavaScript once the page has loaded, and the script may well arrive after that.
root.dataset.ready = '';

// Content below the first screen waits hidden for the site's script to reveal it. Should the script
// fail, or still not have arrived after this long (a stalled connection), the page shows as it reads
// without JavaScript instead.
const GIVE_UP_AFTER = 8000;
const start = () => {
  const giveUp = setTimeout(() => root.classList.remove('js'), GIVE_UP_AFTER);
  import('./site').then(
    () => clearTimeout(giveUp),
    () => {
      clearTimeout(giveUp);
      root.classList.remove('js');
    },
  );
};

// The rest waits until the page has loaded and its first paint has reached the screen (as the
// browser reports it), and two frames more: nothing then competes with the first screen for the
// connection or holds up its paint. A page whose loading waits on another site's frame (the booking
// page, say) holds it back no longer than 2.5 s once its own content is in.
let loaded = document.readyState === 'complete';
let painted = typeof PerformanceObserver === 'undefined' || !(PerformanceObserver.supportedEntryTypes ?? []).includes('paint');
let started = false;
const go = () => {
  if (!loaded || !painted || started) return;
  started = true;
  requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(start)));
};
if (!painted) {
  new PerformanceObserver((list, observer) => {
    if (!list.getEntriesByName('first-contentful-paint').length) return;
    observer.disconnect();
    painted = true;
    go();
  }).observe({ type: 'paint', buffered: true });
}
if (!loaded) {
  const done = () => {
    loaded = true;
    go();
  };
  addEventListener('load', done);
  const soon = () => setTimeout(done, 2500);
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', soon);
  else soon();
}
go();
