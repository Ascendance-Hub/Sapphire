import { defineConfig } from 'astro/config'
import { fileURLToPath } from 'node:url'

// Project page: https://ascendance-hub.github.io/Sapphire
export default defineConfig({
  site: 'https://ascendance-hub.github.io',
  base: '/Sapphire',
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
