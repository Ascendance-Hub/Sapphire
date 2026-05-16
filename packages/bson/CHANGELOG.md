# @ascendance-hub/sapphire-bson

## 1.0.0

### Minor Changes

- be74f85: Split the Mongo adapter into two packages: `@ascendance-hub/sapphire-mongoose`
  (the Mongoose adapter, formerly the workspace-local `sapphire-mongo`) and a new
  `@ascendance-hub/sapphire-bson` for the native MongoDB driver, which emits
  `$jsonSchema` collection validators via `toBsonSchema`.

### Patch Changes

- b13eb00: npm publish readiness.
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

- Updated dependencies [34a794d]
- Updated dependencies [42106b3]
- Updated dependencies [3fe52c9]
- Updated dependencies [4caea16]
- Updated dependencies [3324207]
- Updated dependencies [56b03ae]
- Updated dependencies [bf9d99b]
- Updated dependencies [4c48719]
- Updated dependencies [f74b02b]
- Updated dependencies [ff3af0c]
- Updated dependencies [b13eb00]
- Updated dependencies [51e6d32]
- Updated dependencies [ad51f39]
  - @ascendance-hub/sapphire-core@1.0.0
