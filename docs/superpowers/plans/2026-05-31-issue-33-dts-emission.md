# Issue #33 — `.d.ts` Emission Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow downstream TypeScript libraries (`declaration: true`) to emit `.d.ts` for `export type X = Infer<typeof schema>` without errors, by exporting the field class types and hiding the internal `_parse` surface.

**Architecture:** Two independent root causes are fixed together. (1) `typeof schema` is an anonymous, unexported class → export the 13 field classes as **type-only**. (2) the public `_parse` method leaks `ParseContext`/`InternalParseResult` → mark `_parse` `@internal` and enable `stripInternal` so it is dropped from the emitted declarations. No runtime code changes.

**Tech Stack:** TypeScript 5.8, tsup 8.5 (dts via rollup-plugin-dts, honors `stripInternal`), npm workspaces, vitest, changesets.

---

## Context the implementer needs

- **Monorepo uses npm workspaces** (not pnpm). Build a single package with `npm run build -w <pkg>`. Root `npm run build` builds all workspaces.
- **Why the regression test lives in `examples/consumer`:** that workspace already imports `@ascendance-hub/sapphire-core` (resolved to its built `dist/index.d.ts` via the workspace symlink) and already does `export type User = Infer<typeof userOrm>` — the exact failing pattern. CI runs `build → typecheck → test`, so flipping its tsconfig to `declaration: true` turns the existing `typecheck` step into a declaration-emit guard with zero new infra. Confirmed: `tsc --noEmit` with `declaration: true` still reports TS4023/TS4094/TS7056.
- **The consumer resolves to the BUILT `dist`**, so you must rebuild `@ascendance-hub/sapphire-core` before running the consumer typecheck. Order in every verification: build core → typecheck consumer.
- **`stripInternal` is emit-only**: it removes `@internal`-tagged members from emitted `.d.ts` but does NOT affect in-project type-checking. Internal callers of `_parse` (`src/lib/parse-runner.ts`, and `(child as unknown as InternalField)._parse(...)` in composite fields) keep compiling unchanged.
- **`_output` / `_input` must stay public** — `Infer<F> = F['_output']` depends on them. Only `_parse` gets `@internal`.
- **`TypeField` has no `_parse`** (it is a builder returning other fields), so it gets exported but receives no `@internal` edit.

## File map

| File | Change |
|------|--------|
| `examples/consumer/tsconfig.json` | Regression test: `declaration: false` → `true` |
| `packages/core/src/index.ts` | Add type-only export of the 13 field classes |
| `packages/core/src/interfaces/field.ts` | `@internal` on `InternalField._parse` |
| `packages/core/src/core/{string,date,boolean,array,tuple,union,object,number}.ts` | `@internal` inside existing JSDoc above `_parse` (8 files, Pattern A) |
| `packages/core/src/core/{enum,record,ref,literal}.ts` | New `/** @internal */` above `_parse` (4 files, Pattern B) |
| `packages/core/tsconfig.json` | Add `"stripInternal": true` |
| `.changeset/issue-33-dts-emission.md` | New changeset (minor) |

---

## Task 1: Add the failing regression test (RED)

**Files:**
- Modify: `examples/consumer/tsconfig.json`

- [ ] **Step 1: Flip the consumer to declaration emit**

Replace the full contents of `examples/consumer/tsconfig.json` with:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "declaration": true,
    "noEmit": true
  },
  "include": ["index.ts"]
}
```

(Only `declaration` changed from `false` to `true`; `noEmit` stays `true` so nothing is written but declaration-emit diagnostics still run.)

- [ ] **Step 2: Build core so the consumer resolves the current (buggy) dist**

Run: `npm run build -w @ascendance-hub/sapphire-core`
Expected: build succeeds (the bug is in the emitted types, not the build).

- [ ] **Step 3: Run the consumer typecheck and confirm it FAILS**

Run: `npm run typecheck -w sapphire-consumer-example`
Expected: FAIL (exit code non-zero) with errors including:
```
error TS4023: ... 'InternalParseResult' ... but cannot be named.
error TS4023: ... 'ParseContext' ... but cannot be named.
error TS4094: Property 'config' of exported anonymous class type may not be private or protected.
error TS7056: The inferred type of this node exceeds the maximum length the compiler will serialize.
```
This is the red state. **Do not commit yet** (a committed failing test would break CI). The fix in Tasks 2–4 turns it green; everything is committed together in Task 5.

---

## Task 2: Export the field class types (fixes TS4094 / TS7056)

**Files:**
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Add the type-only export block**

In `packages/core/src/index.ts`, after the line:

```ts
export type { Field, SafeParseResult } from './interfaces/field'
```

add:

```ts
export type {
  ArrayField,
  BooleanField,
  DateField,
  EnumField,
  LiteralField,
  NumberField,
  ObjectField,
  RecordField,
  RefField,
  StringField,
  TupleField,
  TypeField,
  UnionField,
} from './core'
```

- [ ] **Step 2: Rebuild core**

Run: `npm run build -w @ascendance-hub/sapphire-core`
Expected: build succeeds.

- [ ] **Step 3: Confirm the anonymous-class errors are gone (TS4023 still remains)**

Run: `npm run typecheck -w sapphire-consumer-example`
Expected: FAIL, but now **only** the two `TS4023` errors (`ParseContext`, `InternalParseResult`). The `TS4094` and `TS7056` errors are gone because `typeof userOrm` is now nameable. (TS4023 is fixed in Task 3.)

---

## Task 3: Hide `_parse` from the public surface (fixes TS4023)

**Files:**
- Modify: `packages/core/src/interfaces/field.ts`
- Modify: `packages/core/src/core/string.ts`, `date.ts`, `boolean.ts`, `array.ts`, `tuple.ts`, `union.ts`, `object.ts`, `number.ts` (Pattern A)
- Modify: `packages/core/src/core/enum.ts`, `record.ts`, `ref.ts`, `literal.ts` (Pattern B)
- Modify: `packages/core/tsconfig.json`

- [ ] **Step 1: Tag the interface method `@internal`**

In `packages/core/src/interfaces/field.ts`, change:

```ts
export interface InternalField {
  _parse(value: unknown, ctx: ParseContext): InternalParseResult
}
```

to:

```ts
export interface InternalField {
  /** @internal */
  _parse(value: unknown, ctx: ParseContext): InternalParseResult
}
```

- [ ] **Step 2: Tag `_parse` `@internal` in the 8 Pattern A files**

Each of these files has a JSDoc block ending in `   */` immediately above the `_parse` method. In **each** of `string.ts`, `date.ts`, `boolean.ts`, `array.ts`, `tuple.ts`, `union.ts`, `object.ts`, `number.ts`, find:

```ts
   */
  _parse(value: unknown, ctx: ParseContext): InternalParseResult {
```

and replace with:

```ts
   * @internal
   */
  _parse(value: unknown, ctx: ParseContext): InternalParseResult {
```

(The `   */` + `_parse` two-line sequence occurs exactly once per file, so the match is unambiguous.)

- [ ] **Step 3: Tag `_parse` `@internal` in the 4 Pattern B files**

These files have no JSDoc above `_parse`. In **each** of `enum.ts`, `record.ts`, `ref.ts`, `literal.ts`, find:

```ts
  _parse(value: unknown, ctx: ParseContext): InternalParseResult {
```

and replace with:

```ts
  /** @internal */
  _parse(value: unknown, ctx: ParseContext): InternalParseResult {
```

- [ ] **Step 4: Enable `stripInternal` in the core tsconfig**

Replace the full contents of `packages/core/tsconfig.json` with:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "stripInternal": true
  },
  "include": ["src"],
  "exclude": ["dist", "tests", "src/example.ts"]
}
```

- [ ] **Step 5: Rebuild core**

Run: `npm run build -w @ascendance-hub/sapphire-core`
Expected: build succeeds.

- [ ] **Step 6: Confirm the consumer typecheck now PASSES (green)**

Run: `npm run typecheck -w sapphire-consumer-example`
Expected: PASS (exit code 0, no errors).

---

## Task 4: Verify the emitted declarations and the existing test suite

**Files:** none (verification only)

- [ ] **Step 1: Confirm the `_parse` signature and internal types are gone from BOTH declaration files**

Run (PowerShell):
```powershell
Select-String -Path packages/core/dist/index.d.ts, packages/core/dist/index.d.cts -Pattern '_parse\(value', ': ParseContext', ': InternalParseResult', 'InternalParseResult;'
```
Expected: **no matches** in either file. (Match the method *signature* `_parse(value` and the *type usages* `: ParseContext` / `: InternalParseResult`, not the bare word `_parse` — a leading JSDoc comment on the now-empty `InternalField` interface may still contain the word "_parse" and is harmless. The authoritative guard is the consumer typecheck passing in Task 3 Step 6.)

- [ ] **Step 2: Confirm the field classes ARE exported as types**

Run (PowerShell):
```powershell
Select-String -Path packages/core/dist/index.d.ts -Pattern 'type ObjectField', 'type StringField', 'type NumberField'
```
Expected: matches found in the final `export { ... }` statement.

- [ ] **Step 3: Run the core unit tests (guards runtime `_parse` still works)**

Run: `npm run test -w @ascendance-hub/sapphire-core`
Expected: all tests PASS.

- [ ] **Step 4: Typecheck the core package itself**

Run: `npm run typecheck -w @ascendance-hub/sapphire-core`
Expected: PASS — confirms the `@internal` tags did not break in-project usage of `_parse`.

- [ ] **Step 5: Lint**

Run: `npm run lint`
Expected: PASS (JSDoc-only and tsconfig-only edits should not trip ESLint).

---

## Task 5: Changeset, commit, and push

**Files:**
- Create: `.changeset/issue-33-dts-emission.md`

- [ ] **Step 1: Write the changeset (minor bump, core only)**

Create `.changeset/issue-33-dts-emission.md`:

```markdown
---
'@ascendance-hub/sapphire-core': minor
---

Fix #33: library consumers can now emit `.d.ts` when re-exporting inferred
schema types. The field classes (`ObjectField`, `StringField`, `NumberField`,
…) are now exported as types, so `typeof schema` is nameable, and the internal
`_parse` method (with `ParseContext` / `InternalParseResult`) is hidden from the
public type surface via `stripInternal`. This unblocks the schema-once pattern
(`export type X = Infer<typeof schema>`) in published TypeScript libraries with
`declaration: true`.
```

- [ ] **Step 2: Stage and commit everything (test + fix + changeset together)**

```bash
git add examples/consumer/tsconfig.json packages/core/src packages/core/tsconfig.json .changeset/issue-33-dts-emission.md
git commit -m "fix(core): export field types and hide _parse so consumers can emit .d.ts (#33)"
```

(Commit message body should also include the `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` trailer per repo convention.)

- [ ] **Step 3: Push the branch**

Run: `git push -u origin fix/issue-33-dts-emission`
Expected: branch pushed; ready to open a PR into `preview`.

---

## Self-review notes (author)

- **Spec coverage:** export field classes (Task 2) ✓; `@internal` + `stripInternal` (Task 3) ✓; type-only export (Task 2, `export type`) ✓; `stripInternal` local to core tsconfig (Task 3 Step 4) ✓; changeset minor (Task 5) ✓; regression test via `examples/consumer` (Task 1) ✓; verify both `.d.ts`/`.d.cts` (Task 4) ✓; branch from `preview` → PR to `preview` (Task 5) ✓.
- **Type consistency:** the 13 exported class names match the `./core` barrel exports (`packages/core/src/core/index.ts`). `TypeField` is exported but intentionally has no `_parse` edit.
- **No partial-green commit:** Tasks 1–4 leave intermediate red/partial states locally and commit only once in Task 5, so CI never observes a committed failing test.
