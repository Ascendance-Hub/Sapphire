import { describe, it, expect } from 'vitest'
import { Sapphire } from '@ascendance-hub/sapphire-core'
import { toDrizzleSchema } from '../src'

const a = new Sapphire()

/**
 * Drizzle column metadata access pattern (verified against drizzle-orm ^0.45):
 *   table[colName].name          → column name (string)
 *   table[colName].dataType      → 'string' | 'number' | 'boolean' | 'date' | 'json'
 *   table[colName].columnType    → 'PgText' | 'PgInteger' | 'PgDoublePrecision' |
 *                                  'PgBoolean' | 'PgTimestamp' | 'PgJsonb' |
 *                                  'PgUUID' | 'PgSerial'
 *   table[colName].notNull       → boolean
 *   table[colName].hasDefault    → boolean
 *   table[colName].default       → unknown
 *   table[colName].isUnique      → boolean
 *   table[colName].primary       → boolean (for PK columns)
 * (No symbol drilling required — they are plain enumerable properties.)
 */

function emit(
  schema: any,
  opts: Parameters<typeof toDrizzleSchema>[1] = { dialect: 'pg' as const, tableName: 'test' },
) {
  return toDrizzleSchema(schema.toSchema(), opts) as any
}

describe('pg primitives', () => {
  it('string → text, required → notNull', () => {
    const t = emit(a.object({ name: a.string() }))
    expect(t.name.columnType).toBe('PgText')
    expect(t.name.dataType).toBe('string')
    expect(t.name.notNull).toBe(true)
  })

  it('string().optional() → notNull false', () => {
    const t = emit(a.object({ name: a.string().optional() }))
    expect(t.name.columnType).toBe('PgText')
    expect(t.name.notNull).toBe(false)
  })

  it('string().nullable() → notNull false', () => {
    const t = emit(a.object({ name: a.string().nullable() }))
    expect(t.name.columnType).toBe('PgText')
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

  it('string().uuid() → PgUUID column', () => {
    const t = emit(a.object({ id_alt: a.string().uuid() }))
    expect(t.id_alt.columnType).toBe('PgUUID')
    expect(t.id_alt.dataType).toBe('string')
  })

  it('number → doublePrecision', () => {
    const t = emit(a.object({ price: a.number() }))
    expect(t.price.columnType).toBe('PgDoublePrecision')
    expect(t.price.dataType).toBe('number')
  })

  it('number().int() → integer', () => {
    const t = emit(a.object({ count: a.number().int() }))
    expect(t.count.columnType).toBe('PgInteger')
  })

  it('boolean → PgBoolean', () => {
    const t = emit(a.object({ active: a.boolean() }))
    expect(t.active.columnType).toBe('PgBoolean')
    expect(t.active.dataType).toBe('boolean')
  })

  it('date → PgTimestamp with timezone', () => {
    const t = emit(a.object({ at: a.date() }))
    expect(t.at.columnType).toBe('PgTimestamp')
    expect(t.at.dataType).toBe('date')
  })

  describe('primary key handling', () => {
    it('default → adds id serial primary key', () => {
      const t = emit(a.object({ name: a.string() }))
      expect(t.id).toBeDefined()
      expect(t.id.columnType).toBe('PgSerial')
      expect(t.id.primary).toBe(true)
    })

    it('primaryKey: false → no id column', () => {
      const t = emit(a.object({ name: a.string() }), {
        dialect: 'pg',
        tableName: 'test',
        primaryKey: false,
      })
      expect(t.id).toBeUndefined()
    })

    it('primaryKey: "uid" → renames PK column', () => {
      const t = emit(a.object({ name: a.string() }), {
        dialect: 'pg',
        tableName: 'test',
        primaryKey: 'uid',
      })
      expect(t.id).toBeUndefined()
      expect(t.uid).toBeDefined()
      expect(t.uid.columnType).toBe('PgSerial')
      expect(t.uid.primary).toBe(true)
    })
  })
})
