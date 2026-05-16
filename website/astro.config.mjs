import { defineConfig } from 'astro/config'
import { fileURLToPath } from 'node:url'
import { remarkRewriteLinks } from './src/lib/remark-rewrite-links.ts'

const BASE = '/Sapphire'

export default defineConfig({
  site: 'https://ascendance-hub.github.io',
  base: BASE,
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'pt-br'],
    routing: { prefixDefaultLocale: false },
  },
  markdown: {
    remarkPlugins: [[remarkRewriteLinks, { base: BASE }]],
  },
  vite: {
    resolve: {
      alias: {
        '@ascendance-hub/sapphire-core': fileURLToPath(
          new URL('../packages/core/src/index.ts', import.meta.url),
        ),
        '@ascendance-hub/sapphire-json-schema': fileURLToPath(
          new URL('../packages/json-schema/src/index.ts', import.meta.url),
        ),
      },
    },
  },
})
