import { describe, it, expect } from 'vitest'
import { Sapphire } from '@ascendance-hub/sapphire-core'
import { getTableConfig } from 'drizzle-orm/sqlite-core'
import { toDrizzleSchema } from '../src'

const a = new Sapphire()

/**
 * SQLite column metadata access pattern (verified empirically against
 * drizzle-orm ^0.45.2 sqlite-core):
 *   table[colName].name          → column name
 *   table[colName].dataType      → 'string' | 'number' | 'boolean' | 'date' | 'json'
 *   table[colName].columnType    → 'SQLiteText' | 'SQLiteInteger' | 'SQLiteReal' |
 *                                  'SQLiteBoolean' | 'SQLiteTimestamp' | 'SQLiteTextJson'
 *   table[colName].mode          → 'boolean' | 'timestamp' (when applicable)
 *   table[colName].autoIncrement → true on PK built with { autoIncrement: true }
 *   table[colName].notNull / hasDefault / default / isUnique / primary
 */

function emit(
  schema: any,
  opts: Parameters<typeof toDrizzleSchema>[1] = {
    dialect: 'sqlite' as const,
    tableName: 'test',
  },
) {
  return toDrizzleSchema(schema.toSchema(), opts) as any
}

describe('sqlite primitives', () => {
  it('string → SQLiteText, notNull', () => {
    const t = emit(a.object({ sname: a.string() }))
    expect(t.sname.columnType).toBe('SQLiteText')
    expect(t.sname.dataType).toBe('string')
    expect(t.sname.notNull).toBe(true)
  })

  it('string().uuid() → SQLiteText (SQLite has no native uuid)', () => {
    const t = emit(a.object({ uid: a.string().uuid() }))
    expect(t.uid.columnType).toBe('SQLiteText')
    expect(t.uid.dataType).toBe('string')
  })

  it('string().optional() → notNull false', () => {
    const t = emit(a.object({ sopt: a.string().optional() }))
    expect(t.sopt.notNull).toBe(false)
  })

  it('string().default(x) → hasDefault + default value', () => {
    const t = emit(a.object({ sdef: a.string().default('x') }))
    expect(t.sdef.hasDefault).toBe(true)
    expect(t.sdef.default).toBe('x')
  })

  it('string().unique() → isUnique true', () => {
    const t = emit(a.object({ sslug: a.string().unique() }))
    expect(t.sslug.isUnique).toBe(true)
  })

  it('number → SQLiteReal', () => {
    const t = emit(a.object({ nprice: a.number() }))
    expect(t.nprice.columnType).toBe('SQLiteReal')
    expect(t.nprice.dataType).toBe('number')
  })

  it('number().int() → SQLiteInteger', () => {
    const t = emit(a.object({ ncount: a.number().int() }))
    expect(t.ncount.columnType).toBe('SQLiteInteger')
    expect(t.ncount.dataType).toBe('number')
  })

  it('boolean → SQLiteBoolean with mode "boolean"', () => {
    const t = emit(a.object({ bactive: a.boolean() }))
    expect(t.bactive.columnType).toBe('SQLiteBoolean')
    expect(t.bactive.dataType).toBe('boolean')
    expect(t.bactive.mode).toBe('boolean')
  })

  it('date → SQLiteTimestamp with mode "timestamp"', () => {
    const t = emit(a.object({ dat: a.date() }))
    expect(t.dat.columnType).toBe('SQLiteTimestamp')
    expect(t.dat.dataType).toBe('date')
    expect(t.dat.mode).toBe('timestamp')
  })

  it('literal → SQLiteText (NOT json)', () => {
    const t = emit(a.object({ lrole: a.type().literal('admin') }))
    expect(t.lrole.columnType).toBe('SQLiteText')
    expect(t.lrole.dataType).toBe('string')
  })

  it('enum → SQLiteText', () => {
    const t = emit(a.object({ estatus: a.type().enum(['a', 'b'] as const) }))
    expect(t.estatus.columnType).toBe('SQLiteText')
    expect(t.estatus.dataType).toBe('string')
  })

  describe('composite fallback → SQLiteTextJson', () => {
    it('array → SQLiteTextJson (text with mode json)', () => {
      const t = emit(a.object({ atags: a.array(a.string()) }))
      expect(t.atags.columnType).toBe('SQLiteTextJson')
      expect(t.atags.dataType).toBe('json')
    })

    it('nested object → SQLiteTextJson', () => {
      const t = emit(a.object({ oprofile: a.object({ bio: a.string() }) }))
      expect(t.oprofile.columnType).toBe('SQLiteTextJson')
    })

    it('tuple → SQLiteTextJson', () => {
      const t = emit(a.object({ tcoords: a.tuple([a.number(), a.number()]) }))
      expect(t.tcoords.columnType).toBe('SQLiteTextJson')
    })

    it('union → SQLiteTextJson', () => {
      const t = emit(a.object({ uvalue: a.type().union([a.string(), a.number()]) }))
      expect(t.uvalue.columnType).toBe('SQLiteTextJson')
    })

    it('record → SQLiteTextJson', () => {
      const t = emit(a.object({ rmeta: a.type().record(a.string(), a.string()) }))
      expect(t.rmeta.columnType).toBe('SQLiteTextJson')
    })
  })

  describe('primary key handling', () => {
    it('default → adds id integer primary key with autoIncrement', () => {
      const t = emit(a.object({ pname: a.string() }))
      expect(t.id).toBeDefined()
      expect(t.id.columnType).toBe('SQLiteInteger')
      expect(t.id.primary).toBe(true)
      expect(t.id.autoIncrement).toBe(true)
    })

    it('primaryKey: false → no id column', () => {
      const t = emit(a.object({ pnoid: a.string() }), {
        dialect: 'sqlite',
        tableName: 'test',
        primaryKey: false,
      })
      expect(t.id).toBeUndefined()
    })

    it('primaryKey: "uid" → renames PK column', () => {
      const t = emit(a.object({ puidname: a.string() }), {
        dialect: 'sqlite',
        tableName: 'test',
        primaryKey: 'uid',
      })
      expect(t.id).toBeUndefined()
      expect(t.uid).toBeDefined()
      expect(t.uid.columnType).toBe('SQLiteInteger')
      expect(t.uid.primary).toBe(true)
      expect(t.uid.autoIncrement).toBe(true)
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
          .name('SqliteUserComposite')
          .index(['firstName', 'lastName']),
        { dialect: 'sqlite', tableName: 'sqlite_users_ci' },
      )
      const cfg = getTableConfig(t)
      expect(cfg.indexes).toHaveLength(1)
      const idx = cfg.indexes[0]!
      expect(idx.config.name).toBe('sqlite_users_ci_idx_0')
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
          .name('SqliteUserUnique')
          .index(['email', 'tenant'], { unique: true }),
        { dialect: 'sqlite', tableName: 'sqlite_users_cu' },
      )
      const cfg = getTableConfig(t)
      expect(cfg.indexes).toHaveLength(1)
      const idx = cfg.indexes[0]!
      expect(idx.config.name).toBe('sqlite_users_cu_idx_0')
      expect(idx.config.unique).toBe(true)
      expect(idx.config.columns.map((c: any) => c.name)).toEqual(['email', 'tenant'])
    })

    it('no .index() calls → empty indexes', () => {
      const t = emit(a.object({ noidxname: a.string() }).name('SqliteUserNoIdx'), {
        dialect: 'sqlite',
        tableName: 'sqlite_users_noidx',
      })
      const cfg = getTableConfig(t)
      expect(cfg.indexes).toHaveLength(0)
    })
  })
})
