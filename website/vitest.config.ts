import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
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
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
})
