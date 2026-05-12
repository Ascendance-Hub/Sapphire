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

  // B5: invalid entries must not leak into the parsed value.
  describe('B5 — invalid entries are dropped from output', () => {
    it('keyField restritivo: chave inválida fica fora do output', () => {
      const f = a.type().record(a.string().uuid(), a.number())
      const r = f.safeParse({
        '550e8400-e29b-41d4-a716-446655440000': 1,
        'not-a-uuid': 2,
      })
      expect(r.success).toBe(false)
      // Internal contract: _parse output drops invalid entries so composite
      // fields wrapping this record don't see dirty data.
      const internalResult = (
        f as unknown as { _parse: (v: unknown, ctx: unknown) => { value: unknown } }
      )._parse(
        { '550e8400-e29b-41d4-a716-446655440000': 1, 'not-a-uuid': 2 },
        {
          path: [],
          abortEarly: false,
          stripUnknown: false,
          perCall: undefined,
          instance: undefined,
        },
      )
      expect(internalResult.value).toEqual({ '550e8400-e29b-41d4-a716-446655440000': 1 })
    })

    it('valueField restritivo: valor inválido + chave ok → entrada não entra', () => {
      const f = a.type().record(a.string(), a.number().int())
      const r = f.safeParse({ a: 1, b: 1.5 })
      expect(r.success).toBe(false)
      const internalResult = (
        f as unknown as { _parse: (v: unknown, ctx: unknown) => { value: unknown } }
      )._parse(
        { a: 1, b: 1.5 },
        {
          path: [],
          abortEarly: false,
          stripUnknown: false,
          perCall: undefined,
          instance: undefined,
        },
      )
      expect(internalResult.value).toEqual({ a: 1 })
    })
  })
})
