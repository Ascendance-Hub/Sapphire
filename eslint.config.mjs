import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'

export default [
  {
    ignores: ['dist/**', '**/dist/**', 'node_modules/**', '**/node_modules/**', 'coverage/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      // TS já trata unused via noUnusedLocals quando habilitado; aqui os Fields
      // declaram genéricos como `IsOptional` que são consumidos por type-only
      // (InferSchema) e o ESLint não enxerga esse uso.
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
]
