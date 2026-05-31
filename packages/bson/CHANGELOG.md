# @ascendance-hub/sapphire-bson

## 1.2.0

## 1.1.0

### Minor Changes

- e6ec4ae: Drizzle adapter: composite primary keys, plus two fixes.
  - The `primaryKey` adapter option now accepts a `string[]` — it emits a
    table-level composite `PRIMARY KEY(...)` (no implicit `id` column). Every name
    must be a declared field, and at least two are required.
  - Fix: a column `.default(true)` was silently dropped. `applyCommon` routed the
    default through the `callChain` helper, whose `args === true` branch means
    "call the method with no arguments" (the escape-hatch convention), so
    `default(true)` became `default()`. The default value is now passed directly.
  - Fix: the MySQL implicit primary key is now `int autoincrement`, not `serial`
    (`bigint unsigned`). A `serial` PK mismatched the `int` type of `ref` foreign
    key columns and broke foreign keys into implicit-PK tables (MySQL errno 150).

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
