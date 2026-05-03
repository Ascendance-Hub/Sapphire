import { describe, it, expectTypeOf } from 'vitest'
import { Sapphire } from '../../src/lib/sapphire'
import type { Infer, InferInput } from '../../src/types/infer'

const a = new Sapphire()

describe('Modifiers — type-level', () => {
  it('nullable widens output and input with null', () => {
    const f = a.string().nullable()
    expectTypeOf<Infer<typeof f>>().toEqualTypeOf<string | null>()
    expectTypeOf<InferInput<typeof f>>().toEqualTypeOf<string | null>()
  })

  it('default keeps output, makes input optional', () => {
    const f = a.string().default('x')
    expectTypeOf<Infer<typeof f>>().toEqualTypeOf<string>()
    expectTypeOf<InferInput<typeof f>>().toEqualTypeOf<string | undefined>()
  })

  it('optional + nullable + default combine', () => {
    const f = a.string().optional().nullable().default('x')
    expectTypeOf<Infer<typeof f>>().toEqualTypeOf<string | null | undefined>()
    expectTypeOf<InferInput<typeof f>>().toEqualTypeOf<string | null | undefined>()
  })

  it('nullable + optional in opposite order accumulates the same way', () => {
    const f = a.number().nullable().optional()
    expectTypeOf<Infer<typeof f>>().toEqualTypeOf<number | null | undefined>()
    expectTypeOf<InferInput<typeof f>>().toEqualTypeOf<number | null | undefined>()
  })

  it('describe/adapter/unique/index return `this` (no type change)', () => {
    const f = a.string().describe('x').adapter('mongo', {}).unique().index({ unique: true })
    expectTypeOf<Infer<typeof f>>().toEqualTypeOf<string>()
    expectTypeOf<InferInput<typeof f>>().toEqualTypeOf<string>()
  })
})
