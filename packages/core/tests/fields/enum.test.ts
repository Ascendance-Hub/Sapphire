import { describe, it, expect, expectTypeOf } from 'vitest'
import { Sapphire } from '../../src/lib/sapphire'
import type { Infer } from '../../src/types/infer'

describe('EnumField', () => {
  const a = new Sapphire({ defaultAdapter: 'mongo' })

  describe('const tuple', () => {
    it('aceita valor da lista', () => {
      const f = a.type().enum(['admin', 'user'] as const)
      expect(f.safeParse('admin').success).toBe(true)
    })

    it('rejeita valor fora da lista', () => {
      const f = a.type().enum(['admin', 'user'] as const)
      const r = f.safeParse('guest')
      expect(r.success).toBe(false)
      if (!r.success) expect(r.error.issues[0].code).toBe('enum')
    })

    it('infere união dos literais', () => {
      const f = a.type().enum(['admin', 'user'] as const)
      expectTypeOf<Infer<typeof f>>().toEqualTypeOf<'admin' | 'user'>()
    })
  })

  describe('TS string enum', () => {
    enum Status {
      Active = 'active',
      Inactive = 'inactive',
    }

    it('aceita valores do enum', () => {
      const f = a.type().enum(Status)
      expect(f.safeParse('active').success).toBe(true)
      expect(f.safeParse('inactive').success).toBe(true)
    })

    it('rejeita valor fora do enum', () => {
      const f = a.type().enum(Status)
      expect(f.safeParse('pending').success).toBe(false)
    })
  })

  describe('TS numeric enum', () => {
    enum Code {
      A,
      B,
      C,
    }

    it('aceita só valores numéricos (não os nomes via reverse mapping)', () => {
      const f = a.type().enum(Code)
      expect(f.safeParse(0).success).toBe(true)
      expect(f.safeParse(1).success).toBe(true)
      expect(f.safeParse('A').success).toBe(false) // reverse mapping não conta
    })
  })

  it('toSchema emite kind=enum com values', () => {
    const f = a.type().enum(['x', 'y'] as const)
    const s = f.toSchema() as any
    expect(s.kind).toBe('enum')
    expect(s.values).toEqual(['x', 'y'])
  })

  it('optional aceita undefined', () => {
    const f = a
      .type()
      .enum(['a', 'b'] as const)
      .optional()
    expect(f.safeParse(undefined).success).toBe(true)
  })
})
