import { describe, it, expectTypeOf } from 'vitest'
import { Sapphire } from '@ascendance-hub/sapphire-core'
import { toDrizzleSchema, DrizzleTableRegistry } from '../src'
import type { DrizzleAdapterOptions, DrizzleDialect } from '../src'

/**
 * Type-level tests for `toDrizzleSchema` overloads.
 *
 * Background: Drizzle's exact `PgTableWithColumns<...>` / `MySqlTableWithColumns<...>` /
 * `SQLiteTableWithColumns<...>` generics are not reliably exported across
 * drizzle-orm minor versions (see note in `src/index.ts`). Each overload
 * therefore returns `any` — pragmatic call, intentional. These tests lock
 * down what we CAN verify:
 *   1. The public signature compiles with each dialect literal.
 *   2. The `dialect` union is enforced (invalid literals rejected).
 *   3. The implementation-signature fallback returns `unknown` (not `never`,
 *      not silent `any`).
 *   4. The `DrizzleAdapterOptions` generic narrows on the `dialect` field.
 */

const a = new Sapphire()
const schema = a.object({ name: a.string() }).name('Sample').toSchema()

describe('toDrizzleSchema — overload return types', () => {
  it('pg overload returns a non-unknown / non-never value', () => {
    const t = toDrizzleSchema(schema, { dialect: 'pg', tableName: 'sample' })
    expectTypeOf(t).not.toBeUnknown()
    expectTypeOf(t).not.toBeNever()
  })

  it('mysql overload returns a non-unknown / non-never value', () => {
    const t = toDrizzleSchema(schema, { dialect: 'mysql', tableName: 'sample_m' })
    expectTypeOf(t).not.toBeUnknown()
    expectTypeOf(t).not.toBeNever()
  })

  it('sqlite overload returns a non-unknown / non-never value', () => {
    const t = toDrizzleSchema(schema, { dialect: 'sqlite', tableName: 'sample_s' })
    expectTypeOf(t).not.toBeUnknown()
    expectTypeOf(t).not.toBeNever()
  })

  it('dialect literal narrows correctly with `as const`', () => {
    const t = toDrizzleSchema(schema, { dialect: 'pg' as const, tableName: 's' })
    expectTypeOf(t).not.toBeNever()
  })
})

// The "rejects" suite uses TypeScript's `@ts-expect-error` directive — these
// must compile-fail in tsc but never EXECUTE (the runtime would throw on
// `unknown dialect`). We hide them in a never-called function so the type
// checker still walks them but vitest doesn't run them.
function _typeOnly_rejectInvalidDialects(): void {
  // @ts-expect-error — 'badDialect' is not in the DrizzleDialect union.
  toDrizzleSchema(schema, { dialect: 'badDialect', tableName: 's' })
  // @ts-expect-error — `dialect` is required.
  toDrizzleSchema(schema, { tableName: 's' })
  // @ts-expect-error — `dialect` cannot be a number.
  toDrizzleSchema(schema, { dialect: 42, tableName: 's' })
}
// Keep the symbol live so the unused-vars lint doesn't strip it.
void _typeOnly_rejectInvalidDialects

describe('toDrizzleSchema — dialect union enforcement', () => {
  it('accepts each dialect literal without error', () => {
    toDrizzleSchema(schema, { dialect: 'pg', tableName: 's' })
    toDrizzleSchema(schema, { dialect: 'mysql', tableName: 's_m' })
    toDrizzleSchema(schema, { dialect: 'sqlite', tableName: 's_s' })
  })

  it('non-literal dialect (broad union) falls through to the implementation overload (returns unknown)', () => {
    const dyn = 'pg' as DrizzleDialect
    // With a broad `DrizzleDialect` (not a single literal), TS picks the
    // implementation signature which returns `unknown`. That's the documented
    // behavior in src/index.ts — users should pass literals or `as const`.
    const t = toDrizzleSchema(schema, { dialect: dyn, tableName: 's' })
    expectTypeOf(t).toBeUnknown()
  })
})

describe('DrizzleAdapterOptions — shape', () => {
  it('generic narrows the dialect literal', () => {
    expectTypeOf<DrizzleAdapterOptions<'pg'>['dialect']>().toEqualTypeOf<'pg'>()
    expectTypeOf<DrizzleAdapterOptions<'mysql'>['dialect']>().toEqualTypeOf<'mysql'>()
    expectTypeOf<DrizzleAdapterOptions<'sqlite'>['dialect']>().toEqualTypeOf<'sqlite'>()
  })

  it('optional fields are typed correctly', () => {
    expectTypeOf<DrizzleAdapterOptions['tableName']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<DrizzleAdapterOptions['primaryKey']>().toEqualTypeOf<string | false | undefined>()
    expectTypeOf<DrizzleAdapterOptions['tables']>().toEqualTypeOf<
      DrizzleTableRegistry | undefined
    >()
  })

  it('DrizzleDialect is the expected union', () => {
    expectTypeOf<DrizzleDialect>().toEqualTypeOf<'pg' | 'mysql' | 'sqlite'>()
  })
})
