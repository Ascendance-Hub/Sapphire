import { describe, it, expect, expectTypeOf } from 'vitest'
import { Sapphire } from '../../src/lib/sapphire'
import type { Infer } from '../../src/types/infer'

describe('LiteralField', () => {
  const a = new Sapphire({ defaultAdapter: 'mongo' })

  it('aceita o valor exato (string)', () => {
    const f = a.type().literal('admin')
    const r = f.safeParse('admin')
    expect(r.success).toBe(true)
  })

  it('rejeita valor diferente', () => {
    const f = a.type().literal('admin')
    const r = f.safeParse('user')
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].code).toBe('literal')
  })

  it('aceita literal numérico', () => {
    const f = a.type().literal(42)
    expect(f.safeParse(42).success).toBe(true)
    expect(f.safeParse(43).success).toBe(false)
  })

  it('aceita literal boolean', () => {
    const f = a.type().literal(true)
    expect(f.safeParse(true).success).toBe(true)
    expect(f.safeParse(false).success).toBe(false)
  })

  it('optional aceita undefined', () => {
    const f = a.type().literal('admin').optional()
    expect(f.safeParse(undefined).success).toBe(true)
  })

  it('toSchema emite kind=literal com value', () => {
    const f = a.type().literal('admin')
    const s = f.toSchema() as any
    expect(s.kind).toBe('literal')
    expect(s.value).toBe('admin')
  })

  describe('type inference', () => {
    it("infere 'admin' (não string)", () => {
      const f = a.type().literal('admin')
      expectTypeOf<Infer<typeof f>>().toEqualTypeOf<'admin'>()
    })

    it('infere 42', () => {
      const f = a.type().literal(42)
      expectTypeOf<Infer<typeof f>>().toEqualTypeOf<42>()
    })

    it('optional infere literal | undefined', () => {
      const f = a.type().literal('x').optional()
      expectTypeOf<Infer<typeof f>>().toEqualTypeOf<'x' | undefined>()
    })
  })
})
