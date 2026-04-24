import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://sellyourbusiness.com',
  output: 'static',
  adapter: vercel({
    webAnalytics: { enabled: false },
    imageService: false,
  }),
  integrations: [
    sitemap({
      // /report is a dynamic post-submit page with noindex — keep it out of the sitemap too.
      filter: (page) => !page.includes('/report'),
    }),
  ],
  trailingSlash: 'ignore',
});
