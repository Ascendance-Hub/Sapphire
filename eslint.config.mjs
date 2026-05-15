import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'

export default [
  {
    ignores: [
      'dist/**',
      '**/dist/**',
      'node_modules/**',
      '**/node_modules/**',
      'coverage/**',
      // Tipos gerados pelo Astro (triple-slash reference é obrigatório aqui).
      '**/.astro/**',
      '**/env.d.ts',
    ],
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
  {
    // Arquivos de config em JS (astro.config.mjs, eslint.config.mjs) rodam em Node.
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      globals: globals.node,
    },
  },
]
