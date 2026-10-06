/**
 * Starts the site's script (site.ts) once the first screen is up. Everything the first screen shows
 * is in the page and its stylesheet, so the browser paints it as soon as the page arrives; the
 * script, which nothing there waits for, is fetched and run after that (the head script in
 * Base.astro says when) instead of holding it up. Should it fail, the page falls back to how it
 * reads without JavaScript.
 */
const root = document.documentElement;

// Claims the page for the script: the head script (Base.astro) otherwise shows it as it reads
// without JavaScript once the page has loaded, and the script may well arrive after that.
root.dataset.ready = '';

const start = () =>
  import('./site').catch(() => {
    root.classList.remove('js');
  });
const later = (root as HTMLElement & { nkLater?: (fn: () => void) => void }).nkLater;
if (later) later(start);
else start();
