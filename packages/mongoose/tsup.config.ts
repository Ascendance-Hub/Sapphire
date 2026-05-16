import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: false,
  clean: true,
  target: 'es2020',
  outDir: 'dist',
  external: ['@ascendance-hub/sapphire-core', 'mongoose'],
})
