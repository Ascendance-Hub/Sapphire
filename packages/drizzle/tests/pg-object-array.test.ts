import { describe, it, expect } from 'vitest'
import { Sapphire } from '@ascendance-hub/sapphire-core'
import { toDrizzleSchema } from '../src'

const a = new Sapphire()

function emit(schema: any) {
  return toDrizzleSchema(schema.toSchema(), { dialect: 'pg', tableName: 'test' }) as any
}

/**
 * Composite kinds (array/tuple/union/record/nested-object) fall back to jsonb
 * in pg. Drizzle surfaces jsonb as `.dataType === 'json'` (the semantic family)
 * and `.columnType === 'PgJsonb'` (the concrete column class). Literal is a
 * primitive scalar and stays as text.
 */
describe('pg composite fallback (jsonb)', () => {
  it('array → jsonb', () => {
    const t = emit(a.object({ tags: a.array(a.string()) }))
    expect(t.tags.columnType).toBe('PgJsonb')
    expect(t.tags.dataType).toBe('json')
  })

  it('tuple → jsonb', () => {
    const t = emit(a.object({ pair: a.tuple([a.string(), a.number()]) }))
    expect(t.pair.columnType).toBe('PgJsonb')
  })

  it('nested object → jsonb', () => {
    const t = emit(a.object({ meta: a.object({ x: a.string() }) }))
    expect(t.meta.columnType).toBe('PgJsonb')
  })

  it('union → jsonb', () => {
    const t = emit(a.object({ value: a.type().union([a.string(), a.number()]) }))
    expect(t.value.columnType).toBe('PgJsonb')
  })

  it('record → jsonb', () => {
    const t = emit(a.object({ map: a.type().record(a.string(), a.boolean()) }))
    expect(t.map.columnType).toBe('PgJsonb')
  })

  it('literal → text (NOT jsonb)', () => {
    const t = emit(a.object({ role: a.type().literal('admin') }))
    expect(t.role.columnType).toBe('PgText')
    expect(t.role.dataType).toBe('string')
  })
})
