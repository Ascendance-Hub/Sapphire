# Season-Four — Sub-lib Separation (`sapphire-mongo` vs `sapphire-mongoose`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the current `@ascendance-hub/sapphire-mongo` package (which is really a Mongoose adapter) into two packages — `@ascendance-hub/sapphire-mongoose` (the Mongoose adapter, renamed) and a new `@ascendance-hub/sapphire-mongo` (native MongoDB driver, emitting a `$jsonSchema` validator).

**Architecture:** Phase A renames the existing package mechanically (`packages/mongo/` → `packages/mongoose/`, `toMongoSchema` → `toMongooseSchema`, registry key `'mongo'` → `'mongoose'`). Phase B creates a fresh `packages/mongo/` whose `toMongoValidator` mirrors the existing `packages/json-schema` adapter but emits MongoDB `$jsonSchema` (`bsonType` instead of `type`, BSON types, everything inlined — no `$ref`). Phase C extends cross-adapter tests, rewrites docs, and updates release config.

**Tech Stack:** TypeScript, npm workspaces, `tsup` (ESM+CJS+DTS), `vitest`, `mongodb-memory-server` (new devDep for round-trip tests), `changesets`.

**Source spec:** `specs/v1/season-four/SPEC_SUBLIB_SEPARATION.md`

---

## Design Decisions (resolving the spec's open questions)

These resolve the four "Open questions" in the spec. Review these before approving the plan — they shape Phase B.

**D1 — `bsonType` for `number` (spec Q1).** Smart mapping: IR `number` with `int: true` → `bsonType: 'int'`; otherwise → `bsonType: 'number'` (MongoDB's `'number'` alias matches `int`/`long`/`double`/`decimal`, so plain numbers stay permissive). We do not attempt `long`/`decimal` — the IR has no carrier for that distinction.

**D2 — `union` → `anyOf` (spec Q2).** Emit `anyOf`. MongoDB's `$jsonSchema` has supported `anyOf` since MongoDB 5.0. The package documents "MongoDB 5.0+" as the minimum. No 4.x fallback (a v1.0 library in 2026 can assume 5.0+).

**D3 — modifiers with no `$jsonSchema` equivalent (spec Q3).** MongoDB's `$jsonSchema` has **no `format` keyword** and **rejects unknown keywords**. Therefore:

- `string().format('email')` → `pattern` built from core's `EMAIL_RE`; `format('uuid')` → `pattern` from core's `UUID_RE`.
- `string().format('url')` → **omitted** from the validator (no exported URL regex); enforced client-side via `parse()`. Documented as a known gap.
- `string().startsWith/endsWith/regex` → `pattern` (already JSON-Schema-expressible). Multiple patterns combine via `allOf`.
- `transforms` (`trim`/`toLowerCase`/`toUpperCase`) → **dropped**. Transforms mutate input; a server-side validator only checks. Documented as "Mongoose-only — applied client-side via `parse()`."
- `default` → **dropped**. `$jsonSchema` validators do not inject defaults. Documented.
- Never emit `$where` (deprecated, slow).

**D4 — escape hatch `adapter('mongo', {...})` (spec Q4).** `meta.mongo` keys merge into the emitted node object (same pattern as `meta['json-schema']` in the json-schema adapter), with a blacklist of keys the adapter computes (`bsonType`, `type`, `required`, `enum`, `properties`, `items`). **Caveat documented:** because MongoDB rejects unknown `$jsonSchema` keywords, the user is responsible for only passing valid `$jsonSchema` keywords through the hatch.

**D5 — no `$ref`/`$defs`.** A collection validator is self-contained server-side. Named objects are **inlined** wherever they appear (no `collectNamed`/`$defs` machinery from the json-schema adapter). The `ref` IR kind → `bsonType: 'objectId'` (a foreign-key reference is stored as an ObjectId).

**D6 — tuple emit.** MongoDB does not support JSON-Schema-2020-12 `prefixItems`. Use the draft-4 tuple form: `items` as an **array** of schemas + `additionalItems: false` + `minItems`/`maxItems` pinned to the tuple length.

**D7 — `toMongoDocShape` (spec Output B).** The spec itself calls this "more documentation than code" and notes the real typing flows through `Infer<typeof X>`. To avoid shipping dead, uncovered runtime code (the package has a 98% coverage floor), Output B ships as a **type-only** export: `export type MongoDoc<F extends Field<any, any>> = Infer<F>`. No runtime function named `toMongoDocShape`. _If you want a runtime symbol instead, raise it at plan review._

**D8 — no deprecation shim.** The spec's migration story floats keeping `toMongoSchema` as a deprecated re-export. `V1_DESIGN.md §14` states the lib has no published consumers, so we make the break cleanly: `toMongoSchema` simply becomes `toMongooseSchema` with no alias.

---

## File Structure

**Renamed (Phase A) — `git mv packages/mongo packages/mongoose`:**

- `packages/mongoose/package.json` — name → `@ascendance-hub/sapphire-mongoose`, description, keywords, `repository.directory`.
- `packages/mongoose/src/index.ts` — `toMongoSchema`→`toMongooseSchema`, `MongoAdapterOptions`→`MongooseAdapterOptions`.
- `packages/mongoose/tests/*.test.ts` + `tests/_setup.ts` — registry key `'mongo'`→`'mongoose'`, import-name updates.
- `packages/mongoose/tsup.config.ts`, `tsconfig.json` — unchanged content; move only.
- `packages/mongoose/README.md` — Mongoose-named.

**Created (Phase B) — new `packages/mongo/`:**

- `packages/mongo/package.json` — `@ascendance-hub/sapphire-mongo`, peerDep `mongodb` (not Mongoose).
- `packages/mongo/tsup.config.ts`, `packages/mongo/tsconfig.json` — copied from json-schema package.
- `packages/mongo/src/index.ts` — `toMongoValidator`, `MongoValidatorOptions`, `MongoValidator`, `MongoDoc<F>` type.
- `packages/mongo/tests/_setup.ts` — registers `'mongo'` adapter.
- `packages/mongo/tests/validator-primitives.test.ts`
- `packages/mongo/tests/validator-composites.test.ts`
- `packages/mongo/tests/validator-refs.test.ts`
- `packages/mongo/tests/validator-meta-nullable.test.ts`
- `packages/mongo/tests/validator-id.test.ts`
- `packages/mongo/tests/validator-roundtrip.test.ts`
- `packages/mongo/README.md`

**Modified (Phases A/C):**

- `vitest.config.ts` — `setupFiles` array: `packages/mongo/tests/_setup.ts` → `packages/mongoose/tests/_setup.ts`, and add a new `packages/mongo/tests/_setup.ts` entry.
- `examples/consumer/package.json` + `examples/consumer/index.ts` — depend on / import `sapphire-mongoose`.
- `packages/core/tests/multi-adapter/{single-definition,refs,composition}.test.ts` — add a mongo-validator column.
- `docs/adapters/mongo.md` (rewrite), `docs/adapters/mongoose.md` (new), `docs/meta/design-decisions.md`, `README.md`, and any `docs/**` referencing the `'mongo'` adapter.
- `website/src/components/Sidebar.astro` (or the docs nav source) — add the `adapters/mongoose` entry if the sidebar is hand-maintained.
- `.changeset/config.json` — add `@ascendance-hub/sapphire-mongoose` to the `fixed` group.

**Not modified (verified):** root `tsconfig.json` (`include: ["packages/*/src", ...]` is a glob), root `package.json` `workspaces` (`packages/*` glob), `vitest.config.ts` `test.include` (`packages/*/tests/**` glob) — all auto-pick-up the new/renamed package.

---

## PHASE A — Rename `mongo` → `mongoose`

Phase A produces working software: the Mongoose adapter, renamed, all existing tests green.

### Task A1: Move the package directory and rewrite its `package.json`

**Files:**

- Move: `packages/mongo/` → `packages/mongoose/`
- Modify: `packages/mongoose/package.json`

- [ ] **Step 1: Move the directory with git**

```bash
git mv packages/mongo packages/mongoose
```

- [ ] **Step 2: Rewrite `packages/mongoose/package.json`**

Change exactly these fields (leave everything else untouched):

```json
{
  "name": "@ascendance-hub/sapphire-mongoose",
  "description": "Mongoose adapter for Sapphire.",
  "keywords": ["typescript", "schema", "mongoose", "mongodb", "sapphire"],
  "repository": {
    "type": "git",
    "url": "git+https://github.com/Ascendance-Hub/Sapphire.git",
    "directory": "packages/mongoose"
  }
}
```

`peerDependencies` (`mongoose`) and `devDependencies` stay as-is.

- [ ] **Step 3: Reinstall workspaces so the symlink name updates**

Run: `npm install --no-audit --no-fund`
Expected: completes; `node_modules/@ascendance-hub/sapphire-mongoose` now exists.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor(mongoose): rename sapphire-mongo package to sapphire-mongoose"
```

### Task A2: Rename the public exports

**Files:**

- Modify: `packages/mongoose/src/index.ts`

- [ ] **Step 1: Rename the options interface and the function**

In `packages/mongoose/src/index.ts`:

- Rename `export interface MongoAdapterOptions` → `export interface MongooseAdapterOptions`.
- Update the two internal references (`function applyCommon(... _options: MongoAdapterOptions)` and `function buildField(node, options: MongoAdapterOptions)`, `buildSubdoc`, `buildSchema`, `toMongoSchema` signatures) to `MongooseAdapterOptions`.
- Rename `export function toMongoSchema` → `export function toMongooseSchema`.

- [ ] **Step 2: Typecheck the package**

Run: `npm run typecheck --workspace @ascendance-hub/sapphire-mongoose`
Expected: PASS (no emit, no errors).

- [ ] **Step 3: Commit**

```bash
git add packages/mongoose/src/index.ts
git commit -m "refactor(mongoose): rename toMongoSchema to toMongooseSchema"
```

### Task A3: Update the test suite (registry key + imports)

**Files:**

- Modify: `packages/mongoose/tests/_setup.ts`
- Modify: every `packages/mongoose/tests/*.test.ts`

- [ ] **Step 1: Rewrite `packages/mongoose/tests/_setup.ts`**

```ts
import { registerAdapter } from '@ascendance-hub/sapphire-core'
import { toMongooseSchema } from '../src'

// Registers the mongoose adapter explicitly for tests. In real applications,
// the consumer is expected to call this in their entry point.
registerAdapter('mongoose', toMongooseSchema)

/**
 * Unique Mongoose model name. Mongoose's model registry is process-global;
 * naming models with `Date.now()` risks an `OverwriteModelError` flake when
 * two `model()` calls land in the same millisecond. A monotonic counter is
 * collision-free.
 */
let modelSeq = 0
export function uniqueModelName(prefix: string): string {
  return `${prefix}_${modelSeq++}`
}
```

- [ ] **Step 2: Update every test file in `packages/mongoose/tests/`**

Apply these substitutions across all `*.test.ts` files in the directory:

- `toMongoSchema` → `toMongooseSchema`
- `getSchema('mongo'` → `getSchema('mongoose'` (and any `getSchema("mongo"`)
- `MongoAdapterOptions` → `MongooseAdapterOptions`
- `registerAdapter('mongo'` → `registerAdapter('mongoose'`

Verify nothing is missed:

Run: `grep -rn "toMongoSchema\|'mongo'\|\"mongo\"\|MongoAdapterOptions" packages/mongoose/`
Expected: no output (empty).

- [ ] **Step 3: Run the mongoose package tests**

Run: `npx vitest run packages/mongoose/tests`
Expected: all tests PASS (note — the suite also needs Task A4's vitest config change to run via `npm test`; running the directory directly works now).

- [ ] **Step 4: Commit**

```bash
git add packages/mongoose/tests
git commit -m "test(mongoose): update tests for the mongoose rename"
```

### Task A4: Update `vitest.config.ts` and the consumer example

**Files:**

- Modify: `vitest.config.ts:14-19` (the `setupFiles` array)
- Modify: `examples/consumer/package.json`
- Modify: `examples/consumer/index.ts`

- [ ] **Step 1: Fix the `setupFiles` path in `vitest.config.ts`**

The `setupFiles` array hard-codes package paths. Change the `mongo` entry to `mongoose`:

```ts
    setupFiles: [
      'packages/core/tests/_setup.ts',
      'packages/mongoose/tests/_setup.ts',
      'packages/json-schema/tests/_setup.ts',
      'packages/drizzle/tests/_setup.ts',
    ],
```

(A second entry for the _new_ `packages/mongo/tests/_setup.ts` is added in Task B1.)

- [ ] **Step 2: Update `examples/consumer/package.json`**

Change the dependency key `@ascendance-hub/sapphire-mongo` → `@ascendance-hub/sapphire-mongoose` (the consumer example uses Mongoose). Keep `"mongoose": "^9.6.1"`.

- [ ] **Step 3: Update `examples/consumer/index.ts`**

Replace any `from '@ascendance-hub/sapphire-mongo'` with `from '@ascendance-hub/sapphire-mongoose'` and `toMongoSchema` → `toMongooseSchema`, `registerAdapter('mongo', ...)` → `registerAdapter('mongoose', ...)`, `getSchema('mongo')` → `getSchema('mongoose')`.

- [ ] **Step 4: Reinstall and verify the whole suite**

Run: `npm install --no-audit --no-fund && npm test`
Expected: all tests PASS (same count as before the rename — no tests added/removed yet).

- [ ] **Step 5: Run typecheck on the consumer**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts examples/consumer
git commit -m "chore: point vitest setup and consumer example at sapphire-mongoose"
```

### Task A5: Phase A gate

- [ ] **Step 1: Full verification**

Run: `npm run lint && npm run build && npm run typecheck && npm test`
Expected: all four PASS. `npm run build` produces `packages/mongoose/dist/`.

- [ ] **Step 2: Confirm no stale `mongo` references remain for the Mongoose adapter**

Run: `grep -rn "sapphire-mongo'" --include=*.ts --include=*.json packages examples | grep -v sapphire-mongoose`
Expected: no output. (Docs are handled in Phase C.)

---

## PHASE B — New `@ascendance-hub/sapphire-mongo` native-driver package

Phase B produces working software: a new package emitting MongoDB `$jsonSchema` validators, fully tested.

### Task B1: Scaffold the new package

**Files:**

- Create: `packages/mongo/package.json`
- Create: `packages/mongo/tsup.config.ts`
- Create: `packages/mongo/tsconfig.json`
- Create: `packages/mongo/src/index.ts` (stub)
- Create: `packages/mongo/tests/_setup.ts`
- Modify: `vitest.config.ts` (`setupFiles`)

- [ ] **Step 1: Create `packages/mongo/package.json`**

```json
{
  "name": "@ascendance-hub/sapphire-mongo",
  "version": "0.5.0",
  "description": "Native MongoDB driver adapter for Sapphire — emits $jsonSchema collection validators.",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    },
    "./package.json": "./package.json"
  },
  "files": ["dist"],
  "sideEffects": false,
  "scripts": {
    "build": "tsup",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "peerDependencies": {
    "@ascendance-hub/sapphire-core": "*",
    "mongodb": "^6"
  },
  "peerDependenciesMeta": {
    "mongodb": { "optional": true }
  },
  "devDependencies": {
    "@ascendance-hub/sapphire-core": "*",
    "mongodb": "^6.12.0",
    "mongodb-memory-server": "^10.1.2"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/Ascendance-Hub/Sapphire.git",
    "directory": "packages/mongo"
  },
  "keywords": ["typescript", "schema", "mongodb", "jsonschema", "sapphire"],
  "author": { "name": "Alexandre Damas Murata", "email": "alexandre_murata@hotmail.com" },
  "license": "BSD-3-Clause",
  "bugs": { "url": "https://github.com/Ascendance-Hub/Sapphire/issues" },
  "homepage": "https://github.com/Ascendance-Hub/Sapphire#readme"
}
```

Note: `mongodb` is an **optional** peerDep — `toMongoValidator` emits a plain object and never imports `mongodb` at runtime. It is listed so users get a hint, and as a devDep for the round-trip test.

- [ ] **Step 2: Create `packages/mongo/tsup.config.ts`**

```ts
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'es2020',
  outDir: 'dist',
  external: ['@ascendance-hub/sapphire-core'],
})
```

- [ ] **Step 3: Create `packages/mongo/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"],
  "exclude": ["dist", "tests"]
}
```

- [ ] **Step 4: Create the stub `packages/mongo/src/index.ts`**

```ts
import type { SapphireSchemaNode } from '@ascendance-hub/sapphire-core'

export interface MongoValidatorOptions {
  /** Sets `additionalProperties` on every emitted object schema. Omitted when undefined. */
  additionalProperties?: boolean
}

export interface MongoValidator {
  $jsonSchema: Record<string, unknown>
}

export function toMongoValidator(
  _node: SapphireSchemaNode,
  _options: MongoValidatorOptions = {},
): MongoValidator {
  throw new Error('not implemented')
}
```

- [ ] **Step 5: Create `packages/mongo/tests/_setup.ts`**

```ts
import { registerAdapter } from '@ascendance-hub/sapphire-core'
import { toMongoValidator } from '../src'

// Registers the native-driver mongo adapter explicitly for tests.
registerAdapter('mongo', toMongoValidator)
```

- [ ] **Step 6: Add the new setup file to `vitest.config.ts`**

`setupFiles` array becomes:

```ts
    setupFiles: [
      'packages/core/tests/_setup.ts',
      'packages/mongoose/tests/_setup.ts',
      'packages/mongo/tests/_setup.ts',
      'packages/json-schema/tests/_setup.ts',
      'packages/drizzle/tests/_setup.ts',
    ],
```

- [ ] **Step 7: Install the new dev dependencies**

Run: `npm install --no-audit --no-fund`
Expected: `mongodb` and `mongodb-memory-server` installed under the workspace.

- [ ] **Step 8: Commit**

```bash
git add packages/mongo vitest.config.ts package-lock.json
git commit -m "feat(mongo): scaffold the native-driver sapphire-mongo package"
```

### Task B2: `toMongoValidator` — primitives (string, number, boolean, date)

**Files:**

- Create: `packages/mongo/tests/validator-primitives.test.ts`
- Modify: `packages/mongo/src/index.ts`

- [ ] **Step 1: Write the failing test**

`packages/mongo/tests/validator-primitives.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { Sapphire } from '@ascendance-hub/sapphire-core'
import { toMongoValidator } from '../src'

const a = new Sapphire()

describe('toMongoValidator — primitives', () => {
  it('wraps the root output in $jsonSchema', () => {
    const out = toMongoValidator(a.string().toSchema())
    expect(out).toHaveProperty('$jsonSchema')
  })

  it('emits bsonType string with length constraints', () => {
    const node = a.string().minLength(2).maxLength(8).toSchema()
    expect(toMongoValidator(node).$jsonSchema).toEqual({
      bsonType: 'string',
      minLength: 2,
      maxLength: 8,
    })
  })

  it('emits a pattern for startsWith', () => {
    const node = a.string().startsWith('SKU-').toSchema()
    expect(toMongoValidator(node).$jsonSchema).toEqual({
      bsonType: 'string',
      pattern: '^SKU\\-',
    })
  })

  it('combines multiple string patterns with allOf', () => {
    const node = a.string().startsWith('a').endsWith('z').toSchema()
    const schema = toMongoValidator(node).$jsonSchema as Record<string, unknown>
    expect(schema.allOf).toEqual([{ pattern: '^a' }, { pattern: 'z$' }])
  })

  it('maps format email/uuid to a pattern and omits url', () => {
    expect((toMongoValidator(a.string().email().toSchema()).$jsonSchema as any).pattern).toBeTypeOf(
      'string',
    )
    expect((toMongoValidator(a.string().uuid().toSchema()).$jsonSchema as any).pattern).toBeTypeOf(
      'string',
    )
    expect(
      (toMongoValidator(a.string().url().toSchema()).$jsonSchema as any).pattern,
    ).toBeUndefined()
  })

  it('maps plain number to bsonType number and int() to int', () => {
    expect(toMongoValidator(a.number().toSchema()).$jsonSchema).toMatchObject({
      bsonType: 'number',
    })
    expect(toMongoValidator(a.number().int().toSchema()).$jsonSchema).toMatchObject({
      bsonType: 'int',
    })
  })

  it('emits number range keywords', () => {
    const node = a.number().min(0).max(10).toSchema()
    expect(toMongoValidator(node).$jsonSchema).toMatchObject({
      bsonType: 'number',
      minimum: 0,
      maximum: 10,
    })
  })

  it('maps boolean to bool and date to date', () => {
    expect(toMongoValidator(a.boolean().toSchema()).$jsonSchema).toEqual({ bsonType: 'bool' })
    expect(toMongoValidator(a.date().toSchema()).$jsonSchema).toEqual({ bsonType: 'date' })
  })
})
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npx vitest run packages/mongo/tests/validator-primitives.test.ts`
Expected: FAIL with `not implemented`.

- [ ] **Step 3: Implement the primitive emitters**

Replace `packages/mongo/src/index.ts` with the full adapter so far (primitives + dispatch skeleton):

```ts
import type { SapphireSchemaNode } from '@ascendance-hub/sapphire-core'
import { EMAIL_RE, UUID_RE } from '@ascendance-hub/sapphire-core'

export interface MongoValidatorOptions {
  /** Sets `additionalProperties` on every emitted object schema. Omitted when undefined. */
  additionalProperties?: boolean
}

export interface MongoValidator {
  $jsonSchema: Record<string, unknown>
}

/** $jsonSchema keys the adapter computes; `meta.mongo` cannot override these. */
const META_BLACKLIST = new Set(['bsonType', 'type', 'required', 'enum', 'properties', 'items'])

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function applyCommon(out: Record<string, any>, node: SapphireSchemaNode): void {
  if (node.description !== undefined) out.description = node.description
  const meta = node.meta?.mongo as Record<string, unknown> | undefined
  if (meta) {
    for (const [k, v] of Object.entries(meta)) {
      if (META_BLACKLIST.has(k)) continue
      out[k] = v
    }
  }
}

function wrapNullable(out: Record<string, any>, node: SapphireSchemaNode): Record<string, any> {
  if (!node.nullable) return out
  if (typeof out.bsonType === 'string' && out.enum === undefined) {
    return { ...out, bsonType: [out.bsonType, 'null'] }
  }
  return { anyOf: [out, { bsonType: 'null' }] }
}

function emit(node: SapphireSchemaNode, options: MongoValidatorOptions): Record<string, any> {
  switch (node.kind) {
    case 'string': {
      const out: Record<string, any> = { bsonType: 'string' }
      if (node.minLength !== undefined) out.minLength = node.minLength
      if (node.maxLength !== undefined) out.maxLength = node.maxLength
      if (node.length !== undefined) {
        out.minLength = node.length
        out.maxLength = node.length
      }
      const patterns: string[] = []
      if (node.regex) patterns.push(node.regex.source)
      if (node.startsWith !== undefined) patterns.push(`^${escapeRegex(node.startsWith)}`)
      if (node.endsWith !== undefined) patterns.push(`${escapeRegex(node.endsWith)}$`)
      if (node.format === 'email') patterns.push(EMAIL_RE.source)
      if (node.format === 'uuid') patterns.push(UUID_RE.source)
      // `format: 'url'` has no $jsonSchema equivalent — enforced client-side via parse().
      if (patterns.length === 1) out.pattern = patterns[0]
      else if (patterns.length > 1) out.allOf = patterns.map((p) => ({ pattern: p }))
      applyCommon(out, node)
      return wrapNullable(out, node)
    }
    case 'number': {
      const out: Record<string, any> = { bsonType: node.int ? 'int' : 'number' }
      if (node.min !== undefined) out.minimum = node.min
      if (node.max !== undefined) out.maximum = node.max
      if (node.exclusiveMin !== undefined) out.exclusiveMinimum = node.exclusiveMin
      if (node.exclusiveMax !== undefined) out.exclusiveMaximum = node.exclusiveMax
      if (node.multipleOf !== undefined) out.multipleOf = node.multipleOf
      applyCommon(out, node)
      return wrapNullable(out, node)
    }
    case 'boolean': {
      const out: Record<string, any> = { bsonType: 'bool' }
      applyCommon(out, node)
      return wrapNullable(out, node)
    }
    case 'date': {
      const out: Record<string, any> = { bsonType: 'date' }
      applyCommon(out, node)
      return wrapNullable(out, node)
    }
    default:
      throw new Error(`[sapphire-mongo] unsupported IR kind: ${(node as SapphireSchemaNode).kind}`)
  }
}

export function toMongoValidator(
  node: SapphireSchemaNode,
  options: MongoValidatorOptions = {},
): MongoValidator {
  return { $jsonSchema: emit(node, options) }
}
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npx vitest run packages/mongo/tests/validator-primitives.test.ts`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/mongo/src/index.ts packages/mongo/tests/validator-primitives.test.ts
git commit -m "feat(mongo): toMongoValidator for primitive IR kinds"
```

### Task B3: `toMongoValidator` — composites (object, array, tuple, record)

**Files:**

- Create: `packages/mongo/tests/validator-composites.test.ts`
- Modify: `packages/mongo/src/index.ts`

- [ ] **Step 1: Write the failing test**

`packages/mongo/tests/validator-composites.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { Sapphire } from '@ascendance-hub/sapphire-core'
import { toMongoValidator } from '../src'

const a = new Sapphire()

describe('toMongoValidator — composites', () => {
  it('emits an object with properties and required', () => {
    const node = a.object({ name: a.string(), age: a.number().optional() }).toSchema()
    expect(toMongoValidator(node).$jsonSchema).toEqual({
      bsonType: 'object',
      properties: { name: { bsonType: 'string' }, age: { bsonType: 'number' } },
      required: ['name'],
    })
  })

  it('omits required when no property is required', () => {
    const node = a.object({ a: a.string().optional() }).toSchema()
    const schema = toMongoValidator(node).$jsonSchema as Record<string, unknown>
    expect(schema.required).toBeUndefined()
  })

  it('applies the additionalProperties option to objects', () => {
    const node = a.object({ a: a.string() }).toSchema()
    const schema = toMongoValidator(node, { additionalProperties: false }).$jsonSchema as any
    expect(schema.additionalProperties).toBe(false)
  })

  it('emits arrays with item schema and bounds', () => {
    const node = a.array(a.string()).minItems(1).maxItems(3).toSchema()
    expect(toMongoValidator(node).$jsonSchema).toEqual({
      bsonType: 'array',
      items: { bsonType: 'string' },
      minItems: 1,
      maxItems: 3,
    })
  })

  it('emits tuples with an items array and additionalItems false', () => {
    const node = a.tuple([a.string(), a.number()]).toSchema()
    expect(toMongoValidator(node).$jsonSchema).toEqual({
      bsonType: 'array',
      items: [{ bsonType: 'string' }, { bsonType: 'number' }],
      additionalItems: false,
      minItems: 2,
      maxItems: 2,
    })
  })

  it('emits records as objects with additionalProperties schema', () => {
    const node = a.record(a.string(), a.number()).toSchema()
    expect(toMongoValidator(node).$jsonSchema).toEqual({
      bsonType: 'object',
      additionalProperties: { bsonType: 'number' },
    })
  })

  it('inlines nested named objects (no $ref)', () => {
    const address = a.object({ city: a.string() }).name('Address')
    const node = a.object({ home: address }).toSchema()
    const schema = toMongoValidator(node).$jsonSchema as any
    expect(schema.properties.home).toEqual({
      bsonType: 'object',
      properties: { city: { bsonType: 'string' } },
      required: ['city'],
    })
    expect(JSON.stringify(schema)).not.toContain('$ref')
  })
})
```

> Verify the modifier names (`.optional()`, `.minItems()`, `.name()`, `a.record(keys, values)`, `a.tuple([...])`) against `packages/core/src/core/*` before running — adjust if the core API differs.

- [ ] **Step 2: Run the test, verify it fails**

Run: `npx vitest run packages/mongo/tests/validator-composites.test.ts`
Expected: FAIL (`unsupported IR kind: object`).

- [ ] **Step 3: Add the composite emitters**

In `packages/mongo/src/index.ts`, add an `emitObject` helper above `emit`, and add four `case` blocks to the `switch` (before `default`):

```ts
function emitObject(
  node: Extract<SapphireSchemaNode, { kind: 'object' }>,
  options: MongoValidatorOptions,
): Record<string, any> {
  const properties: Record<string, any> = {}
  const required: string[] = []
  for (const [key, child] of Object.entries(node.properties)) {
    properties[key] = emit(child, options)
    if (child.required) required.push(key)
  }
  const out: Record<string, any> = { bsonType: 'object', properties }
  if (required.length > 0) out.required = required
  if (options.additionalProperties !== undefined) {
    out.additionalProperties = options.additionalProperties
  }
  applyCommon(out, node)
  return out
}
```

```ts
    case 'object':
      return wrapNullable(emitObject(node, options), node)
    case 'array': {
      const out: Record<string, any> = { bsonType: 'array', items: emit(node.items, options) }
      if (node.minItems !== undefined) out.minItems = node.minItems
      if (node.maxItems !== undefined) out.maxItems = node.maxItems
      if (node.length !== undefined) {
        out.minItems = node.length
        out.maxItems = node.length
      }
      applyCommon(out, node)
      return wrapNullable(out, node)
    }
    case 'tuple': {
      const out: Record<string, any> = {
        bsonType: 'array',
        items: node.items.map((item) => emit(item, options)),
        additionalItems: false,
        minItems: node.items.length,
        maxItems: node.items.length,
      }
      applyCommon(out, node)
      return wrapNullable(out, node)
    }
    case 'record': {
      const out: Record<string, any> = {
        bsonType: 'object',
        additionalProperties: emit(node.values, options),
      }
      applyCommon(out, node)
      return wrapNullable(out, node)
    }
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npx vitest run packages/mongo/tests/validator-composites.test.ts`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/mongo/src/index.ts packages/mongo/tests/validator-composites.test.ts
git commit -m "feat(mongo): toMongoValidator for object/array/tuple/record"
```

### Task B4: `toMongoValidator` — union, literal, enum, nullable, refs, meta

**Files:**

- Create: `packages/mongo/tests/validator-refs.test.ts`
- Create: `packages/mongo/tests/validator-meta-nullable.test.ts`
- Modify: `packages/mongo/src/index.ts`

- [ ] **Step 1: Write `packages/mongo/tests/validator-refs.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { Sapphire } from '@ascendance-hub/sapphire-core'
import { toMongoValidator } from '../src'

const a = new Sapphire()

describe('toMongoValidator — union/literal/enum/ref', () => {
  it('emits unions as anyOf', () => {
    const node = a.union([a.string(), a.number()]).toSchema()
    expect(toMongoValidator(node).$jsonSchema).toEqual({
      anyOf: [{ bsonType: 'string' }, { bsonType: 'number' }],
    })
  })

  it('emits a literal as a single-value enum', () => {
    expect(toMongoValidator(a.literal('ACTIVE').toSchema()).$jsonSchema).toEqual({
      enum: ['ACTIVE'],
    })
  })

  it('emits an enum as a multi-value enum', () => {
    expect(toMongoValidator(a.enum(['a', 'b', 'c']).toSchema()).$jsonSchema).toEqual({
      enum: ['a', 'b', 'c'],
    })
  })

  it('emits a ref as bsonType objectId', () => {
    const node = a.object({ author: a.ref('User') }).toSchema()
    const schema = toMongoValidator(node).$jsonSchema as any
    expect(schema.properties.author).toEqual({ bsonType: 'objectId' })
  })
})
```

- [ ] **Step 2: Write `packages/mongo/tests/validator-meta-nullable.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { Sapphire } from '@ascendance-hub/sapphire-core'
import { toMongoValidator } from '../src'

const a = new Sapphire()

describe('toMongoValidator — nullable & meta escape hatch', () => {
  it('lifts a nullable primitive into a bsonType array', () => {
    const node = a.string().nullable().toSchema()
    expect(toMongoValidator(node).$jsonSchema).toEqual({ bsonType: ['string', 'null'] })
  })

  it('wraps a nullable composite in anyOf with bsonType null', () => {
    const node = a.object({ a: a.string() }).nullable().toSchema()
    const schema = toMongoValidator(node).$jsonSchema as any
    expect(schema.anyOf).toHaveLength(2)
    expect(schema.anyOf[1]).toEqual({ bsonType: 'null' })
  })

  it('carries description through', () => {
    const node = a.string().describe('the user handle').toSchema()
    expect((toMongoValidator(node).$jsonSchema as any).description).toBe('the user handle')
  })

  it('merges meta.mongo keys but not blacklisted ones', () => {
    const node = a
      .string()
      .meta({ mongo: { title: 'Handle', bsonType: 'object' } })
      .toSchema()
    const schema = toMongoValidator(node).$jsonSchema as any
    expect(schema.title).toBe('Handle')
    expect(schema.bsonType).toBe('string') // blacklisted — not overridden
  })
})
```

> Confirm the core modifier names `.nullable()`, `.describe()`, `.meta()` against `packages/core/src/core/*` and `packages/json-schema/tests/` usage; adjust the test calls if they differ.

- [ ] **Step 3: Run both tests, verify they fail**

Run: `npx vitest run packages/mongo/tests/validator-refs.test.ts packages/mongo/tests/validator-meta-nullable.test.ts`
Expected: FAIL (`unsupported IR kind: union`).

- [ ] **Step 4: Add the remaining emitters**

Add these `case` blocks to the `switch` in `emit` (before `default`):

```ts
    case 'union': {
      const out: Record<string, any> = {
        anyOf: node.options.map((opt) => emit(opt, options)),
      }
      applyCommon(out, node)
      return wrapNullable(out, node)
    }
    case 'literal': {
      const out: Record<string, any> = { enum: [node.value] }
      applyCommon(out, node)
      return wrapNullable(out, node)
    }
    case 'enum': {
      const out: Record<string, any> = { enum: [...node.values] }
      applyCommon(out, node)
      return wrapNullable(out, node)
    }
    case 'ref': {
      const out: Record<string, any> = { bsonType: 'objectId' }
      applyCommon(out, node)
      return wrapNullable(out, node)
    }
```

The `default` branch is now unreachable (all 12 IR kinds handled). Add `/* v8 ignore next 2 */` above it so it does not count against branch coverage (the repo uses this pattern — see `vitest.config.ts` comment).

- [ ] **Step 5: Run both tests, verify they pass**

Run: `npx vitest run packages/mongo/tests/validator-refs.test.ts packages/mongo/tests/validator-meta-nullable.test.ts`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/mongo/src/index.ts packages/mongo/tests/validator-refs.test.ts packages/mongo/tests/validator-meta-nullable.test.ts
git commit -m "feat(mongo): toMongoValidator for union/literal/enum/ref + nullable + meta"
```

### Task B5: `_id` story + `MongoDoc` type + barrel exports

**Files:**

- Create: `packages/mongo/tests/validator-id.test.ts`
- Modify: `packages/mongo/src/index.ts`

The `_id` behaviour (spec "`sapphire-mongo`" section): no special-casing is needed in `toMongoValidator` — an `_id` field declared in the object simply emits like any other property (and lands in `required` if required). If the schema declares no `_id`, the validator says nothing about `_id` and MongoDB injects one server-side. This task adds a **test** locking that behaviour in, plus the `MongoDoc` type export.

- [ ] **Step 1: Write `packages/mongo/tests/validator-id.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { Sapphire } from '@ascendance-hub/sapphire-core'
import { toMongoValidator } from '../src'

const a = new Sapphire()

describe('toMongoValidator — _id', () => {
  it('emits a declared _id field like any other property', () => {
    const node = a.object({ _id: a.string(), name: a.string() }).toSchema()
    const schema = toMongoValidator(node).$jsonSchema as any
    expect(schema.properties._id).toEqual({ bsonType: 'string' })
    expect(schema.required).toContain('_id')
  })

  it('says nothing about _id when the schema does not declare it', () => {
    const node = a.object({ name: a.string() }).toSchema()
    const schema = toMongoValidator(node).$jsonSchema as any
    expect(schema.properties).not.toHaveProperty('_id')
    expect(schema.required ?? []).not.toContain('_id')
  })

  it('emits an _id ref as objectId', () => {
    const node = a.object({ _id: a.ref('User') }).toSchema()
    const schema = toMongoValidator(node).$jsonSchema as any
    expect(schema.properties._id).toEqual({ bsonType: 'objectId' })
  })
})
```

- [ ] **Step 2: Run the test, verify it passes immediately**

Run: `npx vitest run packages/mongo/tests/validator-id.test.ts`
Expected: PASS (no `_id` special-casing needed — this test documents and locks the behaviour).

- [ ] **Step 3: Add the `MongoDoc` type export**

Append to `packages/mongo/src/index.ts`:

````ts
import type { Field, Infer } from '@ascendance-hub/sapphire-core'

/**
 * The typed document shape for a Sapphire schema, for use with the native
 * driver's `Collection<TSchema>`:
 *
 * ```ts
 * import type { Collection } from 'mongodb'
 * import type { MongoDoc } from '@ascendance-hub/sapphire-mongo'
 * const users: Collection<MongoDoc<typeof User>> = db.collection('users')
 * ```
 *
 * This is a thin alias over core's `Infer` — there is no runtime helper,
 * since the document shape is a purely type-level concern.
 */
export type MongoDoc<F extends Field<any, any>> = Infer<F>
````

> Verify `Field`'s type parameters against `packages/core/src/interfaces/field.ts` — if `Field` takes a different arity, adjust `Field<any, any>` to match (or use `Field<any>`).

- [ ] **Step 4: Typecheck the package**

Run: `npm run typecheck --workspace @ascendance-hub/sapphire-mongo`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/mongo/src/index.ts packages/mongo/tests/validator-id.test.ts
git commit -m "feat(mongo): _id behaviour test + MongoDoc type export"
```

### Task B6: Round-trip test against an in-memory MongoDB

**Files:**

- Create: `packages/mongo/tests/validator-roundtrip.test.ts`

- [ ] **Step 1: Write the round-trip test**

`packages/mongo/tests/validator-roundtrip.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { MongoClient, type Db } from 'mongodb'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { Sapphire } from '@ascendance-hub/sapphire-core'
import { toMongoValidator } from '../src'

const a = new Sapphire()

let server: MongoMemoryServer
let client: MongoClient
let db: Db

beforeAll(async () => {
  server = await MongoMemoryServer.create()
  client = new MongoClient(server.getUri())
  await client.connect()
  db = client.db('test')
}, 60_000)

afterAll(async () => {
  await client?.close()
  await server?.stop()
})

describe('toMongoValidator — round-trip against MongoDB', () => {
  it('accepts a valid document and rejects an invalid one', async () => {
    const User = a.object({
      name: a.string().minLength(2),
      age: a.number().int().min(0),
    })
    const validator = toMongoValidator(User.toSchema())

    await db.createCollection('users', { validator })
    const users = db.collection('users')

    await expect(users.insertOne({ name: 'Ana', age: 30 })).resolves.toBeTruthy()
    await expect(users.insertOne({ name: 'A', age: 30 })).rejects.toThrow()
    await expect(users.insertOne({ name: 'Ana', age: -1 })).rejects.toThrow()
  })

  it('enforces required fields server-side', async () => {
    const Post = a.object({ title: a.string(), body: a.string().optional() })
    await db.createCollection('posts', { validator: toMongoValidator(Post.toSchema()) })
    const posts = db.collection('posts')

    await expect(posts.insertOne({ title: 'Hi' })).resolves.toBeTruthy()
    await expect(posts.insertOne({ body: 'no title' })).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Run the round-trip test**

Run: `npx vitest run packages/mongo/tests/validator-roundtrip.test.ts`
Expected: PASS. First run downloads a MongoDB binary (slow — allow a minute). If the download is blocked in CI, see Task C5 notes.

- [ ] **Step 3: Commit**

```bash
git add packages/mongo/tests/validator-roundtrip.test.ts
git commit -m "test(mongo): round-trip validator against in-memory MongoDB"
```

### Task B7: Phase B gate — coverage

**Files:**

- (no new files — verification only)

- [ ] **Step 1: Run the mongo package with coverage**

Run: `npx vitest run packages/mongo/tests --coverage`
Expected: `packages/mongo/src/index.ts` at or above lines 98 / branches 92 / functions 99 / statements 98.

- [ ] **Step 2: If coverage falls short, add targeted cases**

For any uncovered line in `src/index.ts`, add a test to the matching `validator-*.test.ts` file that exercises it (e.g. `.length()` on string, `exclusiveMin`/`multipleOf` on number, `.maxItems()` alone on array). Re-run Step 1 until the thresholds pass. Commit with `test(mongo): cover remaining toMongoValidator branches`.

- [ ] **Step 3: Build the package**

Run: `npm run build --workspace @ascendance-hub/sapphire-mongo`
Expected: `packages/mongo/dist/` contains `index.js`, `index.cjs`, `index.d.ts`.

---

## PHASE C — Integration, docs, release config

### Task C1: Extend the multi-adapter tests

**Files:**

- Modify: `packages/core/tests/multi-adapter/single-definition.test.ts`
- Modify: `packages/core/tests/multi-adapter/refs.test.ts`
- Modify: `packages/core/tests/multi-adapter/composition.test.ts`

- [ ] **Step 1: Read the three multi-adapter test files**

Read each file. They assert that one Sapphire definition feeds every adapter. Each currently has columns for mongoose (was `mongo`), drizzle, json-schema.

- [ ] **Step 2: Add a `toMongoValidator` column to each**

In each file: import `toMongoValidator` from `@ascendance-hub/sapphire-mongo`, and for every scenario add an assertion that `toMongoValidator(def.toSchema())` produces the expected `$jsonSchema`. For the refs file, assert `ref('User')` → `{ bsonType: 'objectId' }`. Match the existing structure of each file (do not restructure).

> The cross-package import resolves through the workspace symlink to `packages/mongo/dist` — run `npm run build` first, or add `'@ascendance-hub/sapphire-mongo'` to `vitest.config.ts` `resolve.alias` pointing at `packages/mongo/src/index.ts` (mirror the existing core alias). Prefer the alias — it matches how core is already aliased and avoids a build dependency.

- [ ] **Step 3: Run the multi-adapter tests**

Run: `npx vitest run packages/core/tests/multi-adapter`
Expected: all PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/core/tests/multi-adapter vitest.config.ts
git commit -m "test(core): extend multi-adapter tests with the mongo validator"
```

### Task C2: Rewrite `docs/adapters/mongo.md` and create `mongoose.md`

**Files:**

- Create: `docs/adapters/mongoose.md`
- Modify: `docs/adapters/mongo.md`

- [ ] **Step 1: Create `docs/adapters/mongoose.md`**

Move the current Mongoose-describing content of `docs/adapters/mongo.md` here, with the rename applied (`toMongoSchema`→`toMongooseSchema`, `'mongo'`→`'mongoose'`, `@ascendance-hub/sapphire-mongo`→`@ascendance-hub/sapphire-mongoose`). Keep the existing heading/frontmatter conventions of the other files in `docs/adapters/`.

- [ ] **Step 2: Rewrite `docs/adapters/mongo.md`** for the native-driver package

Cover: install (`@ascendance-hub/sapphire-mongo`), `registerAdapter('mongo', toMongoValidator)`, the `toMongoValidator(node)` → `{ $jsonSchema: ... }` output, the `db.createCollection('x', { validator })` usage, the IR-kind → `bsonType` table (from this plan's D1–D6), the `_id` behaviour, the escape hatch caveat (D4), the documented gaps (D3: `format('url')`, `transforms`, `default` are client-side-only), and the `MongoDoc<F>` type. Use a code block consistent with the spec's examples.

- [ ] **Step 3: Verify the docs build**

Run: `npm run build --workspace @ascendance-hub/sapphire-website`
Expected: build succeeds; `/docs/adapters/mongoose/` and `/docs/adapters/mongo/` pages are generated.

- [ ] **Step 4: Commit**

```bash
git add docs/adapters/mongo.md docs/adapters/mongoose.md
git commit -m "docs: split adapters/mongo into native-driver + mongoose pages"
```

### Task C3: Update remaining docs + website nav

**Files:**

- Modify: `docs/meta/design-decisions.md`
- Modify: `README.md`
- Modify: docs under `docs/**` that reference the `'mongo'` adapter
- Modify (if hand-maintained): the website docs sidebar/nav

- [ ] **Step 1: Add a "why two mongo packages" section to `docs/meta/design-decisions.md`**

A short section summarising the spec's "Why split" rationale and design decisions D1–D8 from this plan.

- [ ] **Step 2: Update the README quickstart**

Show both registration paths, per the spec:

```ts
// Mongoose path:
registerAdapter('mongoose', toMongooseSchema)
// Native driver path:
registerAdapter('mongo', toMongoValidator)
```

- [ ] **Step 3: Audit other docs**

Run: `grep -rln "mongo" docs README.md`
For each hit (e.g. `docs/concepts/escape-hatch.md`, `docs/concepts/overview.md`, `docs/concepts/refs-and-relations.md`, `docs/getting-started.md`, `docs/meta/architecture.md`, `docs/meta/contributing.md`, recipes), open it and decide: if it describes the Mongoose adapter, retarget it to `'mongoose'`/`toMongooseSchema`; if it makes a general "mongo" point, clarify which package. Keep edits minimal and factual.

- [ ] **Step 4: Update the website docs sidebar**

Check how the docs sidebar is sourced — `website/src/components/Sidebar.astro` and `website/src/content.config.ts`. If the adapter list is hand-maintained, add an `adapters/mongoose` entry next to `adapters/mongo`. If it is generated from the `docs/` tree, no change is needed; confirm by building the site (Task C2 Step 3 already rebuilt it).

- [ ] **Step 5: Verify docs build + commit**

Run: `npm run build --workspace @ascendance-hub/sapphire-website`
Expected: PASS.

```bash
git add docs README.md website
git commit -m "docs: retarget mongo references and add the mongoose adapter to nav"
```

### Task C4: Release config — changeset

**Files:**

- Modify: `.changeset/config.json`
- Create: `.changeset/season-four-sublib-separation.md`

- [ ] **Step 1: Add the new package to the `fixed` group**

In `.changeset/config.json`, the `fixed` array's inner list becomes the five packages:

```json
  "fixed": [
    [
      "@ascendance-hub/sapphire-core",
      "@ascendance-hub/sapphire-mongo",
      "@ascendance-hub/sapphire-mongoose",
      "@ascendance-hub/sapphire-json-schema",
      "@ascendance-hub/sapphire-drizzle"
    ]
  ],
```

- [ ] **Step 2: Add a changeset for the split**

Create `.changeset/season-four-sublib-separation.md`:

```markdown
---
'@ascendance-hub/sapphire-mongo': minor
'@ascendance-hub/sapphire-mongoose': minor
---

Split the Mongo adapter into two packages: `@ascendance-hub/sapphire-mongoose`
(the Mongoose adapter, formerly `sapphire-mongo`) and a new
`@ascendance-hub/sapphire-mongo` for the native MongoDB driver, which emits
`$jsonSchema` collection validators via `toMongoValidator`.
```

> The `fixed` group means all five packages bump together regardless; this changeset documents the change in the changelog. PHASE_16 handles the actual `1.0.0` bump.

- [ ] **Step 3: Verify changeset status**

Run: `npx changeset status`
Expected: lists pending releases for the fixed group without error.

- [ ] **Step 4: Commit**

```bash
git add .changeset
git commit -m "chore: changeset for the mongo/mongoose split"
```

### Task C5: Final verification gate

**Files:**

- (verification only)

- [ ] **Step 1: Full local pipeline**

Run: `npm run lint && npm run format:check && npm run build && npm run typecheck && npm test`
Expected: all PASS. `format:check` is clean on a fresh checkout (LF) — if running on a pre-`.gitattributes` Windows tree it may report CRLF false positives; trust CI.

- [ ] **Step 2: Coverage gate**

Run: `npm run test:coverage`
Expected: meets the thresholds in `vitest.config.ts` (lines 98 / branches 92 / functions 99 / statements 98).

- [ ] **Step 3: Note on CI and `mongodb-memory-server`**

`mongodb-memory-server` downloads a MongoDB binary on first run. If CI cannot reach the download host, either (a) cache `~/.cache/mongodb-binaries` in the CI workflow, or (b) gate the round-trip test with `describe.skipIf(process.env.CI_NO_MONGO)`. Flag this to the maintainer; do not silently skip.

- [ ] **Step 4: Push and open the PR**

```bash
git push -u origin season-four/sublib-separation
gh pr create --base main --title "season-four: split sapphire-mongo into mongo + mongoose" --body "<summary of phases A/B/C + test plan>"
```

Confirm `gh auth status` shows the personal account active before creating the PR.

---

## Self-Review

**Spec coverage:** Target package layout → Phase A + B1. `toMongoValidator` for all IR kinds → B2–B5. `toMongoDocShape` (Output B) → resolved as `MongoDoc` type, D7 + B5. `sapphire-mongoose` changes (name, export, registry key, paths, README) → Phase A. `_id` story → B5. Migration story → D8 (no shim, unpublished). Test plan (primitives, composites, refs, roundtrip, \_id) → B2–B6. Cross-adapter reach → C1. Adapter registry strings → A3 + B1 `_setup.ts`. Build/publish changes (`tsup`, `tsconfig`, `peerDep`, changeset `linked`/`fixed`) → B1 + C4. Documentation changes → C2 + C3. Open questions 1–4 → D1–D4.

**Placeholder scan:** No "TBD"/"implement later". Code steps carry full code. Three steps carry a `>` caveat to verify a core API name (`.optional()`/`.name()`/`.meta()`/`Field` arity) against `packages/core` before running — these are deliberate verification prompts, not placeholders, because the exact core modifier surface was not read during planning.

**Type consistency:** `toMongoValidator`, `MongoValidatorOptions`, `MongoValidator`, `MongoDoc`, `emit`, `emitObject`, `applyCommon`, `wrapNullable`, `META_BLACKLIST`, `escapeRegex` are named identically across B1–B6. Registry keys: `'mongoose'` (Phase A) and `'mongo'` (Phase B) — distinct, no collision.

**Open risk:** the multi-adapter tests (C1) and the exact core modifier names are the two spots most likely to need adjustment during execution; both are flagged inline.
