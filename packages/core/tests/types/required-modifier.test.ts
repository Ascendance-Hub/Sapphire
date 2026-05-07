import { describe, it, expect, expectTypeOf } from 'vitest'
import { Sapphire } from '../../src/lib/sapphire'
import type { Infer, InferInput } from '../../src/types/infer'

const a = new Sapphire()

describe('Field.required() — runtime', () => {
  it('flips an optional string back to required (parse rejects undefined)', () => {
    const f = a.string().optional().required()
    const r = f.safeParse(undefined)
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.issues[0]?.code).toBe('required')
    }
  })

  it('round-trip optional().required() preserves config except `required`', () => {
    const original = a.string().min(3)
    const flipped = original.optional().required()
    expect(flipped.parse('abc')).toBe('abc')
    expect(() => flipped.parse('ab')).toThrow()
  })

  it('immutability: original optional field is unchanged', () => {
    const opt = a.string().optional()
    const req = opt.required()
    expect(opt.safeParse(undefined).success).toBe(true)
    expect(req.safeParse(undefined).success).toBe(false)
  })
})

describe('Field.required() — type-level (12 fields)', () => {
  it('string', () => {
    const f = a.string().optional().required()
    expectTypeOf<Infer<typeof f>>().toEqualTypeOf<string>()
    expectTypeOf<InferInput<typeof f>>().toEqualTypeOf<string>()
  })

  it('number', () => {
    const f = a.number().optional().required()
    expectTypeOf<Infer<typeof f>>().toEqualTypeOf<number>()
  })

  it('boolean', () => {
    const f = a.boolean().optional().required()
    expectTypeOf<Infer<typeof f>>().toEqualTypeOf<boolean>()
  })

  it('date', () => {
    const f = a.date().optional().required()
    expectTypeOf<Infer<typeof f>>().toEqualTypeOf<Date>()
  })

  it('object', () => {
    const f = a.object({ x: a.string() }).optional().required()
    expectTypeOf<Infer<typeof f>>().toEqualTypeOf<{ x: string }>()
  })

  it('array', () => {
    const f = a.array(a.string()).optional().required()
    expectTypeOf<Infer<typeof f>>().toEqualTypeOf<string[]>()
  })

  it('union', () => {
    const f = a.type().union([a.string(), a.number()]).optional().required()
    expectTypeOf<Infer<typeof f>>().toEqualTypeOf<string | number>()
  })

  it('tuple', () => {
    const f = a.tuple([a.string(), a.number()]).optional().required()
    expectTypeOf<Infer<typeof f>>().toEqualTypeOf<[string, number]>()
  })

  it('literal', () => {
    const f = a.type().literal('admin').optional().required()
    expectTypeOf<Infer<typeof f>>().toEqualTypeOf<'admin'>()
  })

  it('enum', () => {
    const f = a
      .type()
      .enum(['a', 'b'] as const)
      .optional()
      .required()
    expectTypeOf<Infer<typeof f>>().toEqualTypeOf<'a' | 'b'>()
  })

  it('record', () => {
    const f = a.type().record(a.string(), a.number()).optional().required()
    expectTypeOf<Infer<typeof f>>().toEqualTypeOf<Record<string, number>>()
  })

  it('ref', () => {
    const User = a.object({ id: a.string() }).name('User_RequiredTest')
    const f = a.ref(User).optional().required()
    expectTypeOf<Infer<typeof f>>().toEqualTypeOf<unknown>()
  })
})
