import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

// Em dev/test, resolve `@ascendance-hub/sapphire-core` direto para o src do
// workspace (sem precisar buildar antes). Em consumo real (e no consumer
// example), o resolve passa pelo package.json/dist.
export default defineConfig({
  resolve: {
    alias: {
      '@ascendance-hub/sapphire-core': resolve(__dirname, 'packages/core/src/index.ts'),
    },
  },
  test: {
    include: ['packages/*/tests/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['packages/core/tests/_setup.ts'],
  },
})
