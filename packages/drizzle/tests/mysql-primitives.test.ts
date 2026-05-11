import { describe, it, expect } from 'vitest'
import { Sapphire } from '@ascendance-hub/sapphire-core'
import { getTableConfig } from 'drizzle-orm/mysql-core'
import { toDrizzleSchema } from '../src'

const a = new Sapphire()

/**
 * MySQL column metadata access pattern (verified empirically against
 * drizzle-orm ^0.45.2 mysql-core):
 *   table[colName].name          → column name
 *   table[colName].dataType      → 'string' | 'number' | 'boolean' | 'date' | 'json'
 *   table[colName].columnType    → 'MySqlVarChar' | 'MySqlInt' | 'MySqlDouble' |
 *                                  'MySqlBoolean' | 'MySqlDateTime' | 'MySqlJson' |
 *                                  'MySqlSerial'
 *   table[colName].length        → varchar length (top-level property)
 *   table[colName].notNull / hasDefault / default / isUnique / primary
 */

function emit(
  schema: any,
  opts: Parameters<typeof toDrizzleSchema>[1] = {
    dialect: 'mysql' as const,
    tableName: 'test',
  },
) {
  return toDrizzleSchema(schema.toSchema(), opts) as any
}

describe('mysql primitives', () => {
  it('string → varchar with default length 255, notNull', () => {
    const t = emit(a.object({ name: a.string() }))
    expect(t.name.columnType).toBe('MySqlVarChar')
    expect(t.name.dataType).toBe('string')
    expect(t.name.length).toBe(255)
    expect(t.name.notNull).toBe(true)
  })

  it('string().max(100) → varchar length 100 (IR maxLength is honored)', () => {
    const t = emit(a.object({ name: a.string().max(100) }))
    expect(t.name.columnType).toBe('MySqlVarChar')
    expect(t.name.length).toBe(100)
  })

  it('string().uuid() → varchar length 36', () => {
    const t = emit(a.object({ id_alt: a.string().uuid() }))
    expect(t.id_alt.columnType).toBe('MySqlVarChar')
    expect(t.id_alt.length).toBe(36)
  })

  it('string().optional() → notNull false', () => {
    const t = emit(a.object({ name: a.string().optional() }))
    expect(t.name.notNull).toBe(false)
  })

  it('string().default(x) → hasDefault + default value', () => {
    const t = emit(a.object({ name: a.string().default('x') }))
    expect(t.name.hasDefault).toBe(true)
    expect(t.name.default).toBe('x')
  })

  it('string().unique() → isUnique true', () => {
    const t = emit(a.object({ slug: a.string().unique() }))
    expect(t.slug.isUnique).toBe(true)
  })

  it('number → MySqlDouble', () => {
    const t = emit(a.object({ price: a.number() }))
    expect(t.price.columnType).toBe('MySqlDouble')
    expect(t.price.dataType).toBe('number')
  })

  it('number().int() → MySqlInt', () => {
    const t = emit(a.object({ count: a.number().int() }))
    expect(t.count.columnType).toBe('MySqlInt')
  })

  it('boolean → MySqlBoolean', () => {
    const t = emit(a.object({ active: a.boolean() }))
    expect(t.active.columnType).toBe('MySqlBoolean')
    expect(t.active.dataType).toBe('boolean')
  })

  it('date → MySqlDateTime', () => {
    const t = emit(a.object({ at: a.date() }))
    expect(t.at.columnType).toBe('MySqlDateTime')
    expect(t.at.dataType).toBe('date')
  })

  it('literal → MySqlVarChar length 255 (NOT json)', () => {
    const t = emit(a.object({ role: a.type().literal('admin') }))
    expect(t.role.columnType).toBe('MySqlVarChar')
    expect(t.role.length).toBe(255)
    expect(t.role.dataType).toBe('string')
  })

  it('enum → MySqlVarChar length 255', () => {
    const t = emit(a.object({ status: a.type().enum(['a', 'b'] as const) }))
    expect(t.status.columnType).toBe('MySqlVarChar')
    expect(t.status.length).toBe(255)
  })

  describe('composite fallback → MySqlJson', () => {
    it('array → MySqlJson', () => {
      const t = emit(a.object({ tags: a.array(a.string()) }))
      expect(t.tags.columnType).toBe('MySqlJson')
      expect(t.tags.dataType).toBe('json')
    })

    it('nested object → MySqlJson', () => {
      const t = emit(a.object({ profile: a.object({ bio: a.string() }) }))
      expect(t.profile.columnType).toBe('MySqlJson')
    })

    it('tuple → MySqlJson', () => {
      const t = emit(a.object({ coords: a.tuple([a.number(), a.number()]) }))
      expect(t.coords.columnType).toBe('MySqlJson')
    })

    it('union → MySqlJson', () => {
      const t = emit(a.object({ value: a.type().union([a.string(), a.number()]) }))
      expect(t.value.columnType).toBe('MySqlJson')
    })

    it('record → MySqlJson', () => {
      const t = emit(a.object({ meta: a.type().record(a.string(), a.string()) }))
      expect(t.meta.columnType).toBe('MySqlJson')
    })
  })

  describe('primary key handling', () => {
    it('default → adds id serial primary key', () => {
      const t = emit(a.object({ name: a.string() }))
      expect(t.id).toBeDefined()
      expect(t.id.columnType).toBe('MySqlSerial')
      expect(t.id.primary).toBe(true)
    })

    it('primaryKey: false → no id column', () => {
      const t = emit(a.object({ name: a.string() }), {
        dialect: 'mysql',
        tableName: 'test',
        primaryKey: false,
      })
      expect(t.id).toBeUndefined()
    })

    it('primaryKey: "uid" → renames PK column', () => {
      const t = emit(a.object({ name: a.string() }), {
        dialect: 'mysql',
        tableName: 'test',
        primaryKey: 'uid',
      })
      expect(t.id).toBeUndefined()
      expect(t.uid).toBeDefined()
      expect(t.uid.columnType).toBe('MySqlSerial')
      expect(t.uid.primary).toBe(true)
    })
  })

  describe('composite indexes & uniques', () => {
    it('schema-level composite index → one non-unique index entry', () => {
      const t = emit(
        a
          .object({
            firstName: a.string(),
            lastName: a.string(),
          })
          .name('UserComposite')
          .index(['firstName', 'lastName']),
        { dialect: 'mysql', tableName: 'users' },
      )
      const cfg = getTableConfig(t)
      expect(cfg.indexes).toHaveLength(1)
      const idx = cfg.indexes[0]!
      expect(idx.config.name).toBe('users_idx_0')
      expect(idx.config.unique).toBe(false)
      expect(idx.config.columns.map((c: any) => c.name)).toEqual(['firstName', 'lastName'])
    })

    it('schema-level composite unique index → unique flag true', () => {
      const t = emit(
        a
          .object({
            email: a.string(),
            tenant: a.string(),
          })
          .name('UserUnique')
          .index(['email', 'tenant'], { unique: true }),
        { dialect: 'mysql', tableName: 'users' },
      )
      const cfg = getTableConfig(t)
      expect(cfg.indexes).toHaveLength(1)
      const idx = cfg.indexes[0]!
      expect(idx.config.name).toBe('users_idx_0')
      expect(idx.config.unique).toBe(true)
      expect(idx.config.columns.map((c: any) => c.name)).toEqual(['email', 'tenant'])
    })

    it('no .index() calls → empty indexes', () => {
      const t = emit(a.object({ name: a.string() }).name('UserNoIdx'), {
        dialect: 'mysql',
        tableName: 'users',
      })
      const cfg = getTableConfig(t)
      expect(cfg.indexes).toHaveLength(0)
    })
  })
})
