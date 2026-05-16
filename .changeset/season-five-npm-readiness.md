---
'@ascendance-hub/sapphire-core': patch
'@ascendance-hub/sapphire-bson': patch
'@ascendance-hub/sapphire-mongoose': patch
'@ascendance-hub/sapphire-json-schema': patch
'@ascendance-hub/sapphire-drizzle': patch
---

npm publish readiness.

- Precise `exports` maps — per-condition `types` so CJS consumers on
  `moduleResolution: nodenext` resolve `index.d.cts` instead of the ESM
  `index.d.ts`.
- `publishConfig.access: public` and `engines: { node: ">=20" }` on every
  package.
- Sourcemaps are no longer generated or shipped (smaller tarballs).
- The adapters' `peerDependencies` on `@ascendance-hub/sapphire-core` is a real
  range (`>=0.5.0`) instead of `*`.
- A README for `@ascendance-hub/sapphire-core` and a `LICENSE` file in every
  published package.
