import { describe, it, expect } from 'vitest'
import { Sapphire } from '@ascendance-hub/sapphire-core'
import { getTableConfig } from 'drizzle-orm/pg-core'
import { toDrizzleSchema } from '../src'

const a = new Sapphire()

function emit(
  schema: any,
  opts: Parameters<typeof toDrizzleSchema>[1] = { dialect: 'pg' as const, tableName: 'users' },
) {
  return toDrizzleSchema(schema.toSchema(), opts) as any
}

/**
 * Index introspection in drizzle-orm ^0.45.2:
 *   getTableConfig(table).indexes : Index[]
 *   each Index has `.config` with:
 *     .name      → string | undefined (the name passed to index()/uniqueIndex())
 *     .columns   → Array of PgColumn refs (each has `.name` for the column name)
 *     .unique    → boolean (true when emitted via uniqueIndex())
 *
 * Column-level `.unique()` calls land in `getTableConfig().uniqueConstraints`
 * (NOT in `.indexes`), so the two are observable independently.
 */
describe('pg indexes & uniques', () => {
  it('column-level .unique() still works (regression — set by dispatch C)', () => {
    const t = emit(a.object({ slug: a.string().unique() }))
    expect(t.slug.isUnique).toBe(true)
  })

  it('schema-level composite index → one non-unique index entry', () => {
    const t = emit(
      a
        .object({
          firstName: a.string(),
          lastName: a.string(),
        })
        .name('UserComposite')
        .index(['firstName', 'lastName']),
    )
    const cfg = getTableConfig(t)
    expect(cfg.indexes).toHaveLength(1)
    const idx = cfg.indexes[0]!
    expect(idx.config.name).toBe('users_idx_0')
    expect(idx.config.unique).toBe(false)
    expect(idx.config.columns.map((c: any) => c.name)).toEqual(['firstName', 'lastName'])
  })

  it('schema-level composite unique index → unique flag true on the index', () => {
    const t = emit(
      a
        .object({
          email: a.string(),
          tenant: a.string(),
        })
        .name('UserUnique')
        .index(['email', 'tenant'], { unique: true }),
    )
    const cfg = getTableConfig(t)
    expect(cfg.indexes).toHaveLength(1)
    const idx = cfg.indexes[0]!
    expect(idx.config.name).toBe('users_idx_0')
    expect(idx.config.unique).toBe(true)
    expect(idx.config.columns.map((c: any) => c.name)).toEqual(['email', 'tenant'])
  })

  it('multiple .index() calls → distinct sequential names', () => {
    const t = emit(
      a
        .object({
          firstName: a.string(),
          lastName: a.string(),
          email: a.string(),
        })
        .name('UserMulti')
        .index(['firstName', 'lastName'])
        .index(['email'], { unique: true }),
    )
    const cfg = getTableConfig(t)
    expect(cfg.indexes).toHaveLength(2)
    expect(cfg.indexes[0]!.config.name).toBe('users_idx_0')
    expect(cfg.indexes[0]!.config.unique).toBe(false)
    expect(cfg.indexes[1]!.config.name).toBe('users_idx_1')
    expect(cfg.indexes[1]!.config.unique).toBe(true)
  })

  it('no .index() calls → empty indexes (2-arg pgTable form, no behavior change)', () => {
    const t = emit(a.object({ name: a.string() }).name('UserNoIdx'))
    const cfg = getTableConfig(t)
    expect(cfg.indexes).toHaveLength(0)
  })
})
