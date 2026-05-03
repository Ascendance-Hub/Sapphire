import { describe, it, expect, expectTypeOf } from 'vitest'
import { Sapphire } from '../../src/lib/sapphire'
import type { Infer } from '../../src/types/infer'

describe('RecordField', () => {
  const a = new Sapphire({ defaultAdapter: 'mongo' })

  it('aceita objeto com keys/values válidos', () => {
    const f = a.type().record(a.string(), a.number())
    const r = f.safeParse({ a: 1, b: 2 })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data).toEqual({ a: 1, b: 2 })
  })

  it('rejeita value de tipo errado', () => {
    const f = a.type().record(a.string(), a.number())
    const r = f.safeParse({ a: 'not a number' })
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.issues.some((i) => i.code === 'invalid_type')).toBe(true)
    }
  })

  it('rejeita não-objeto', () => {
    const f = a.type().record(a.string(), a.number())
    const r = f.safeParse([1, 2, 3])
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].code).toBe('invalid_type')
  })

  it('toSchema emite kind=record com keys/values', () => {
    const f = a.type().record(a.string(), a.number())
    const s = f.toSchema() as any
    expect(s.kind).toBe('record')
    expect(s.keys.kind).toBe('string')
    expect(s.values.kind).toBe('number')
  })

  it('optional aceita undefined', () => {
    const f = a.type().record(a.string(), a.number()).optional()
    expect(f.safeParse(undefined).success).toBe(true)
  })

  it('infere Record<string, number>', () => {
    const f = a.type().record(a.string(), a.number())
    expectTypeOf<Infer<typeof f>>().toEqualTypeOf<Record<string, number>>()
  })
})
