import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://bhaskarsuper9000.github.io',
  base: '/',
  trailingSlash: 'always',
  devToolbar: { enabled: false },
  markdown: { shikiConfig: { theme: 'github-dark' } },
  // three.js (~530 kB, ~130 kB gzip) is a lazy chunk loaded by the home hero only
  vite: { build: { chunkSizeWarningLimit: 600 } },
});
