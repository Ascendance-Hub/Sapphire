import { describe, it, expect } from 'vitest'
import { Sapphire } from '@ascendance-hub/sapphire-core'
import { toDrizzleSchema, DrizzleTableRegistry } from '../src'

describe('drizzle bootstrap', () => {
  it('emits a usable pg table from a minimal object schema', () => {
    const a = new Sapphire()
    const ir = a.object({ name: a.string() }).toSchema()
    const table = toDrizzleSchema(ir, { dialect: 'pg', tableName: 'bootstrap' }) as Record<
      string,
      { columnType: string }
    >
    expect(table.name.columnType).toBe('PgText')
  })

  it('DrizzleTableRegistry starts empty', () => {
    const reg = new DrizzleTableRegistry()
    expect(reg.has('anything')).toBe(false)
    expect(reg.get('anything')).toBeUndefined()
  })

  it('throws on non-object root', () => {
    const a = new Sapphire()
    const ir = a.string().toSchema()
    expect(() => toDrizzleSchema(ir, { dialect: 'pg' })).toThrow(/root node must be ObjectField/)
  })

  it('throws when no table name is available (anonymous schema, no tableName)', () => {
    const a = new Sapphire()
    const ir = a.object({ name: a.string() }).toSchema()
    expect(() => toDrizzleSchema(ir, { dialect: 'pg' })).toThrow(/table name required/)
  })

  it('uses the ObjectField .name() as the table name when tableName is omitted', () => {
    const a = new Sapphire()
    const ir = a.object({ name: a.string() }).name('AutoNamed').toSchema()
    expect(() => toDrizzleSchema(ir, { dialect: 'pg' })).not.toThrow()
  })

  it('throws on an unknown dialect', () => {
    const a = new Sapphire()
    const ir = a.object({ name: a.string() }).toSchema()
    expect(() =>
      toDrizzleSchema(ir, { dialect: 'oracle' as unknown as 'pg', tableName: 't' }),
    ).toThrow(/unknown dialect/)
  })
})
