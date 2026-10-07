/**
 * Starts the bar and its menu at once (shell.ts), and the rest of the site's script (site.ts) once
 * the first screen is up. Everything the first screen shows is in the page and its stylesheet, so
 * the browser paints it as soon as the page arrives; the script, which nothing there waits for, is
 * fetched and run after that (the head script in Base.astro says when) instead of holding it up.
 * Should it fail, the page falls back to how it reads without JavaScript.
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
const later = (root as HTMLElement & { nkLater?: (fn: () => void) => void }).nkLater;
if (later) later(start);
else start();
