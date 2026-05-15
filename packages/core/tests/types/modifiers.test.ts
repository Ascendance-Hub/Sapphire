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

  // Pin `.default(x).optional()` and `.optional().default(x)` semantics.
  // Current behaviour: type-level, `.optional()` after `.default()` widens TOut
  // with `| undefined` (the default no longer "fills" at the type level).
  // Runtime still substitutes the default when input is undefined.
  // Documenting this so a future change is a deliberate decision, not a silent drift.
  it('default(x).optional(): TOut widens to include undefined', () => {
    const f = a.string().default('x').optional()
    expectTypeOf<Infer<typeof f>>().toEqualTypeOf<string | undefined>()
    expectTypeOf<InferInput<typeof f>>().toEqualTypeOf<string | undefined>()
  })

  it('optional().default(x): TOut widens to include undefined (same as the reverse order)', () => {
    const f = a.string().optional().default('x')
    expectTypeOf<Infer<typeof f>>().toEqualTypeOf<string | undefined>()
    expectTypeOf<InferInput<typeof f>>().toEqualTypeOf<string | undefined>()
  })
})
