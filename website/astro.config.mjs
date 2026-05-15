import { defineConfig } from 'astro/config'
import { fileURLToPath } from 'node:url'
import { remarkRewriteLinks } from './src/lib/remark-rewrite-links.ts'

const BASE = '/Sapphire'

export default defineConfig({
  site: 'https://ascendance-hub.github.io',
  base: BASE,
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
