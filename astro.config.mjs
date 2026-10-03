// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// The live domain. Canonical URLs, the sitemap and social cards are built from it.
const SITE = 'https://neurokov.com';

export default defineConfig({
  site: SITE,
  integrations: [
    sitemap({
      filter: (page) => !page.endsWith('/404/'),
    }),
  ],
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover',
  },
  devToolbar: { enabled: false },
});
