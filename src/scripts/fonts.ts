/**
 * The web fonts, once they're in the cache (fonts.css). A first visit paints at once in fonts the
 * visitor already has, sized to take the same room (fallback.css): the head script (Base.astro) marks
 * the page .cold, and global.css sets it in those. With the page up, this fetches the web fonts into
 * the cache and notes that it has, and from the next page on the pages are set in them from their first
 * paint (with nothing to wait for, so nothing moves).
 */
import archivo from '../assets/fonts/archivo.woff2?url';
import archivoSigns from '../assets/fonts/archivo-signs.woff2?url';
import plex400 from '../assets/fonts/plex-mono-400.woff2?url';
import plex500 from '../assets/fonts/plex-mono-500.woff2?url';
import plex600 from '../assets/fonts/plex-mono-600.woff2?url';
import { root } from './lib';

/** The localStorage key the head script reads (Base.astro). */
const CACHED = 'nk-fonts';

export function warmFonts() {
  if (!root.classList.contains('cold')) return;
  // With data saver on, the fonts the visitor has will do.
  if ((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) return;
  Promise.all(
    [archivo, archivoSigns, plex400, plex500, plex600].map((url) =>
      // Fetched the way the browser fetches a font (CORS, same-origin credentials), so the cache can
      // hand the next page this copy.
      fetch(url, { mode: 'cors', credentials: 'same-origin' }).then((response) => {
        if (!response.ok) throw new Error(`${url}: ${response.status}`);
        return response.arrayBuffer();
      }),
    ),
  ).then(
    () => {
      try {
        localStorage.setItem(CACHED, '1');
      } catch {
        // Storage blocked: the head script can't read it either, and sets pages in the web fonts.
      }
    },
    // Offline or blocked: the next page tries again.
    () => {},
  );
}
