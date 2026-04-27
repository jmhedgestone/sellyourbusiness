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
  // 301 the old funnel URL to /valuation so any external links, ads, or
  // existing IG posts pointing at /funnel keep working and SEO authority
  // transfers cleanly. Astro emits a permanent redirect at the static layer.
  redirects: {
    '/funnel': '/valuation',
  },
  integrations: [
    sitemap({
      // /report is a dynamic post-submit page with noindex — keep it out of the sitemap too.
      filter: (page) => !page.includes('/report'),
    }),
  ],
  trailingSlash: 'ignore',
});
