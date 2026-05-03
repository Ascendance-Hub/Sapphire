import { describe, it, expect, expectTypeOf } from 'vitest'
import { Sapphire } from '../../src/lib/sapphire'
import type { Infer } from '../../src/types/infer'

describe('TupleField', () => {
  const a = new Sapphire({ defaultAdapter: 'mongo' })

  it('valida tupla com tipos posicionais', () => {
    const f = a.tuple([a.string(), a.number()])
    const r = f.safeParse(['ok', 42])
    expect(r.success).toBe(true)
  })

  it('falha com length errado', () => {
    const f = a.tuple([a.string(), a.number()])
    const r = f.safeParse(['ok'])
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.issues.some((i) => i.code === 'tuple_length')).toBe(true)
    }
  })

  it('falha com tipo errado em posição', () => {
    const f = a.tuple([a.string(), a.number()])
    const r = f.safeParse(['ok', 'no'])
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.issues.some((i) => i.code === 'invalid_type' && i.path[0] === 1)).toBe(true)
    }
  })

  it('falha para não-array', () => {
    const f = a.tuple([a.string()])
    const r = f.safeParse('hi')
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].code).toBe('invalid_type')
  })

  it('optional aceita undefined', () => {
    const f = a.tuple([a.string(), a.number()]).optional()
    expect(f.safeParse(undefined).success).toBe(true)
  })

  it('nullable aceita null', () => {
    const f = a.tuple([a.string(), a.number()]).nullable()
    expect(f.safeParse(null).success).toBe(true)
  })

  it('default substitui undefined', () => {
    const f = a.tuple([a.string(), a.number()]).default(['x', 1] as [string, number])
    const r = f.safeParse(undefined)
    expect(r.success).toBe(true)
    if (r.success) expect(r.data).toEqual(['x', 1])
  })

  it('toSchema emite kind=tuple com items', () => {
    const f = a.tuple([a.string(), a.number()])
    const s = f.toSchema() as any
    expect(s.kind).toBe('tuple')
    expect(s.items.length).toBe(2)
    expect(s.items[0].kind).toBe('string')
    expect(s.items[1].kind).toBe('number')
  })

  describe('type inference', () => {
    it('infere [string, number]', () => {
      const f = a.tuple([a.string(), a.number()])
      expectTypeOf<Infer<typeof f>>().toEqualTypeOf<[string, number]>()
    })

    it('optional infere [string, number] | undefined', () => {
      const f = a.tuple([a.string(), a.number()]).optional()
      expectTypeOf<Infer<typeof f>>().toEqualTypeOf<[string, number] | undefined>()
    })
  })
})
