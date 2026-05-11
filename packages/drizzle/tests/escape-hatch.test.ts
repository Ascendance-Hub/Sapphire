import { describe, it, expect } from 'vitest'
import { Sapphire } from '@ascendance-hub/sapphire-core'
import { toDrizzleSchema } from '../src'

/**
 * Escape hatch via `.adapter('drizzle', opts)` — stored as `meta.drizzle` on
 * the IR node and consumed by `applyCommon` in `src/shared/common.ts`.
 *
 * Shape (validated against `applyCommon`):
 *  - Top-level keys: `<method>: value` chain-called for every dialect.
 *  - Per-dialect sub-keys: `{ pg: {...}, mysql: {...}, sqlite: {...} }` —
 *    applied only when `options.dialect` matches.
 *  - Value forms:
 *      `true`  → no-args call: `col.<method>()`
 *      array   → spread: `col.<method>(...arr)`
 *      other   → single arg: `col.<method>(value)`
 *  - Methods missing on the underlying column builder are silently skipped.
 */

const a = new Sapphire()

function emit(schema: any, opts: Parameters<typeof toDrizzleSchema>[1]) {
  return toDrizzleSchema(schema.toSchema(), opts) as any
}

describe('drizzle escape hatch — top-level meta keys (dialect-agnostic)', () => {
  it('pg: { unique: true } → column isUnique', () => {
    const t = emit(a.object({ slug: a.string().adapter('drizzle', { unique: true }) }), {
      dialect: 'pg',
      tableName: 't',
    })
    expect(t.slug.isUnique).toBe(true)
  })

  it('mysql: { unique: true } → column isUnique', () => {
    const t = emit(a.object({ slug: a.string().adapter('drizzle', { unique: true }) }), {
      dialect: 'mysql',
      tableName: 't',
    })
    expect(t.slug.isUnique).toBe(true)
  })

  it('sqlite: { unique: true } → column isUnique', () => {
    const t = emit(a.object({ slug: a.string().adapter('drizzle', { unique: true }) }), {
      dialect: 'sqlite',
      tableName: 't',
    })
    expect(t.slug.isUnique).toBe(true)
  })
})

describe('drizzle escape hatch — value forms', () => {
  it('value `true` → no-args method call (notNull)', () => {
    // Start from an optional() field (no auto-notNull) and force it via meta.
    const t = emit(
      a.object({ name: a.string().optional().adapter('drizzle', { notNull: true }) }),
      { dialect: 'pg', tableName: 't' },
    )
    expect(t.name.notNull).toBe(true)
  })

  it('scalar value → passed as single arg (default)', () => {
    const t = emit(a.object({ name: a.string().adapter('drizzle', { default: 'x' }) }), {
      dialect: 'pg',
      tableName: 't',
    })
    expect(t.name.hasDefault).toBe(true)
    expect(t.name.default).toBe('x')
  })

  it('array value → spread as args ($type<T>() takes zero args; default([1,2]) on jsonb arr)', () => {
    // `default` accepts a single value — to exercise the spread path we use
    // a method whose chain is observable with multiple positional args. The
    // safest cross-version target is `default` with an array value: when
    // passed via meta as an array, applyCommon spreads it, so `default(1, 2)`
    // would be invoked. Drizzle's default takes only the first arg and stores
    // it. That's observable: `default` ends up being `1`, NOT `[1, 2]`.
    const t = emit(
      a.object({
        n: a
          .number()
          .int()
          .adapter('drizzle', { default: [1, 2] }),
      }),
      { dialect: 'pg', tableName: 't' },
    )
    // Spread → default(1, 2) → only first arg retained.
    expect(t.n.hasDefault).toBe(true)
    expect(t.n.default).toBe(1)
  })
})

describe('drizzle escape hatch — per-dialect sub-keys', () => {
  it('pg sub-key { array: true } → PgArray column (text[])', () => {
    const t = emit(a.object({ tags: a.string().adapter('drizzle', { pg: { array: true } }) }), {
      dialect: 'pg',
      tableName: 't',
    })
    expect(t.tags.columnType).toBe('PgArray')
    expect(t.tags.dataType).toBe('array')
  })

  it('pg sub-key NOT applied when dialect is mysql (no PgArray, plain varchar)', () => {
    const t = emit(a.object({ tags: a.string().adapter('drizzle', { pg: { array: true } }) }), {
      dialect: 'mysql',
      tableName: 't',
    })
    expect(t.tags.columnType).toBe('MySqlVarChar')
    expect(t.tags.dataType).toBe('string')
  })

  it('pg sub-key NOT applied when dialect is sqlite', () => {
    const t = emit(a.object({ tags: a.string().adapter('drizzle', { pg: { array: true } }) }), {
      dialect: 'sqlite',
      tableName: 't',
    })
    expect(t.tags.columnType).toBe('SQLiteText')
  })

  it('mysql sub-key is a no-op when emitting pg (regression)', () => {
    const t = emit(a.object({ name: a.string().adapter('drizzle', { mysql: { unique: true } }) }), {
      dialect: 'pg',
      tableName: 't',
    })
    // The unique should NOT have been applied (it was scoped to mysql).
    expect(t.name.isUnique).toBe(false)
    // Column type unchanged.
    expect(t.name.columnType).toBe('PgText')
  })
})

describe('drizzle escape hatch — robustness', () => {
  it('method missing on column builder is silently skipped (no throw)', () => {
    expect(() =>
      emit(
        a.object({
          name: a.string().adapter('drizzle', { nonExistentMethodFoo: true }),
        }),
        { dialect: 'pg', tableName: 't' },
      ),
    ).not.toThrow()
  })

  it('missing dialect sub-key method silently skipped', () => {
    expect(() =>
      emit(
        a.object({
          name: a.string().adapter('drizzle', { pg: { totallyMadeUpMethod: 'x' } }),
        }),
        { dialect: 'pg', tableName: 't' },
      ),
    ).not.toThrow()
  })

  it('non-object dialect meta value is ignored (no throw)', () => {
    expect(() =>
      emit(
        a.object({
          // pg sub-key as a string instead of an object — applyCommon guards.
          name: a.string().adapter('drizzle', { pg: 'oops' as any }),
        }),
        { dialect: 'pg', tableName: 't' },
      ),
    ).not.toThrow()
  })
})
