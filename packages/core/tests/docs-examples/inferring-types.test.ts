// Pinned snippets for docs/concepts/inferring-types.md. Type-only assertions
// via vitest's expectTypeOf. If `_output` / `_input` semantics change, this
// test fails at compile time and the doc surfaces as wrong.
import { describe, it, expectTypeOf } from 'vitest'
import { Sapphire, type Infer, type InferInput } from '@ascendance-hub/sapphire-core'

const a = new Sapphire()

describe('docs/concepts/inferring-types.md — snippet pinning', () => {
  it('minimal example — Infer of an object schema', () => {
    // --- snippet: minimal example ---
    const user = a.object({
      name: a.string(),
      age: a.number().optional(),
    })

    type User = Infer<typeof user>
    // User = { name: string; age?: number | undefined }
    // --- end snippet ---

    expectTypeOf<User>().toEqualTypeOf<{ name: string; age?: number | undefined }>()
  })

  it('string — required: _input and _output are both string', () => {
    const s = a.string()
    expectTypeOf<Infer<typeof s>>().toEqualTypeOf<string>()
    expectTypeOf<InferInput<typeof s>>().toEqualTypeOf<string>()
  })

  it('.optional() — both sides become T | undefined', () => {
    const s = a.string().optional()
    expectTypeOf<Infer<typeof s>>().toEqualTypeOf<string | undefined>()
    expectTypeOf<InferInput<typeof s>>().toEqualTypeOf<string | undefined>()
  })

  it('.nullable() — both sides become T | null', () => {
    const s = a.string().nullable()
    expectTypeOf<Infer<typeof s>>().toEqualTypeOf<string | null>()
    expectTypeOf<InferInput<typeof s>>().toEqualTypeOf<string | null>()
  })

  it('.default(v) — _input widens to T | undefined; _output stays T', () => {
    const s = a.string().default('x')
    expectTypeOf<Infer<typeof s>>().toEqualTypeOf<string>()
    expectTypeOf<InferInput<typeof s>>().toEqualTypeOf<string | undefined>()
  })

  it('.optional().default(v) — _output stays T | undefined (optional was applied first)', () => {
    const s = a.string().optional().default('x')
    expectTypeOf<Infer<typeof s>>().toEqualTypeOf<string | undefined>()
    expectTypeOf<InferInput<typeof s>>().toEqualTypeOf<string | undefined>()
  })
})
