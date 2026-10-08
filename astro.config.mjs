// @ts-check
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { pageStyles } from './scripts/page-styles.mjs';

/**
 * The site's script (src/scripts/boot.ts) waits for the first paint before it does anything, so it
 * shouldn't hold a phone's connection ahead of the fonts and the first screen's picture either:
 * every page asks for it at low priority. (Astro writes the script tag itself, so the attribute is
 * added to the built pages.)
 */
const lowPriorityScripts = {
  name: 'low-priority-scripts',
  hooks: {
    'astro:build:done': async ({ dir }) => {
      const walk = async (d) => {
        for (const e of await readdir(d, { withFileTypes: true })) {
          const path = join(d, e.name);
          if (e.isDirectory()) await walk(path);
          else if (e.name.endsWith('.html')) {
            const html = await readFile(path, 'utf8');
            const out = html.replaceAll('<script type="module" src=', '<script type="module" fetchpriority="low" src=');
            if (out !== html) await writeFile(path, out);
          }
        }
      };
      await walk(fileURLToPath(dir));
    },
  },
};

// The live domain. Canonical URLs, the sitemap and social cards are built from it.
const SITE = 'https://neurokov.com';

export default defineConfig({
  site: SITE,
  integrations: [
    lowPriorityScripts,
    pageStyles,
    sitemap({
      // Not the 404, nor the step a visitor without JavaScript reaches after the booking form.
      filter: (page) => !page.endsWith('/404/') && !page.endsWith('/book/pick-a-time/'),
    }),
  ],
  devToolbar: { enabled: false },
  // The stylesheet goes inside each page instead of in a file of its own: a phone can paint as soon as
  // the page arrives, without a second round trip first. Each page then keeps only the rules it can use
  // (scripts/page-styles.mjs): 7 to 11 KB compressed.
  build: { inlineStylesheets: 'always' },
});
