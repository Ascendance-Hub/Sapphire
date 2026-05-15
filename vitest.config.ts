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
    include: ['packages/*/tests/**/*.test.ts', 'packages/*/tests/**/*.test-d.ts'],
    environment: 'node',
    setupFiles: [
      'packages/core/tests/_setup.ts',
      'packages/mongo/tests/_setup.ts',
      'packages/json-schema/tests/_setup.ts',
      'packages/drizzle/tests/_setup.ts',
    ],
    // Audit-pass setup — see specs/AUDIT_TESTING_COVERAGE.md. Thresholds are
    // intentionally floors, not aspirations: any drop below them fails CI.
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['packages/*/src/**/*.ts'],
      exclude: [
        '**/*.test.ts',
        '**/*.test-d.ts',
        '**/*.bench.ts',
        '**/dist/**',
        '**/node_modules/**',
        // Type-only barrel files (no runtime code).
        'packages/core/src/index.ts',
        'packages/core/src/schema/**',
        'packages/core/src/types/**',
        'packages/core/src/interfaces/**',
        'packages/core/src/adapters/index.ts',
        'packages/core/src/core/index.ts',
        'packages/core/src/lib/issue-codes.ts',
        'packages/core/src/lib/types.ts',
      ],
      // Thresholds are calibrated to the baseline captured in
      // specs/AUDIT_TESTING_COVERAGE.md (2026-05-12). They are regression
      // guards, not aspirations — raise them only when the audit confirms a
      // sustained lift. Function coverage trails because the duplicated
      // modifier methods across fields (vide S1 / SPEC_FIX_SMELLS) are
      // exercised on a few fields and just inherited on the rest.
      // season-three lifted these to the new floor after the modifier-surface
      // + edge-case + adapter-edge coverage pass. They are regression guards,
      // kept just under the measured values (≈98.3 / 92.7 / 99.4 / 98.3). The
      // remaining gap is defensive `default: throw` exhaustiveness guards that
      // TypeScript's `never` type already enforces at compile time — not worth
      // runtime tests.
      thresholds: {
        lines: 97,
        branches: 90,
        functions: 98,
        statements: 97,
      },
    },
    // Benchmarks live under packages/*/bench/. Use `npm run bench`.
    benchmark: {
      include: ['packages/*/bench/**/*.bench.ts'],
    },
  },
})
