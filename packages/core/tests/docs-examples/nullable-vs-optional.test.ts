// Pinned snippets for docs/concepts/nullable-vs-optional.md.
import { describe, it, expect, expectTypeOf } from 'vitest'
import { Sapphire, type Infer, type InferInput } from '@ascendance-hub/sapphire-core'

const a = new Sapphire()

describe('docs/concepts/nullable-vs-optional.md — snippet pinning', () => {
  it('table row — (no modifier) → required, output T', () => {
    const s = a.string()
    expectTypeOf<Infer<typeof s>>().toEqualTypeOf<string>()
  })

  it('table row — .optional() → T | undefined', () => {
    // --- snippet: optional ---
    const name = a.string().optional()
    type Name = Infer<typeof name>
    // Name = string | undefined
    // --- end snippet ---
    expectTypeOf<Name>().toEqualTypeOf<string | undefined>()
  })

  it('table row — .nullable() → T | null', () => {
    // --- snippet: nullable ---
    const name = a.string().nullable()
    type Name = Infer<typeof name>
    // Name = string | null
    // --- end snippet ---
    expectTypeOf<Name>().toEqualTypeOf<string | null>()
  })

  it('table row — .optional().nullable() → T | null | undefined', () => {
    // --- snippet: optional + nullable ---
    const name = a.string().optional().nullable()
    type Name = Infer<typeof name>
    // Name = string | null | undefined
    // --- end snippet ---
    expectTypeOf<Name>().toEqualTypeOf<string | null | undefined>()
  })

  it('pitfall — .optional().default("x") keeps _output as T | undefined', () => {
    // --- snippet: optional + default ---
    const name = a.string().optional().default('anon')
    type Out = Infer<typeof name>
    type In = InferInput<typeof name>
    // Out = string | undefined  (NOT string — .optional() widened first)
    // In  = string | undefined
    // --- end snippet ---
    expectTypeOf<Out>().toEqualTypeOf<string | undefined>()
    expectTypeOf<In>().toEqualTypeOf<string | undefined>()

    // If you want _output: string, drop .optional():
    const tight = a.string().default('anon')
    expectTypeOf<Infer<typeof tight>>().toEqualTypeOf<string>()
    expectTypeOf<InferInput<typeof tight>>().toEqualTypeOf<string | undefined>()
  })

  it('pitfall — null on a non-nullable required field fires "required"', () => {
    // --- snippet: null vs nullable ---
    const name = a.string()
    const result = name.safeParse(null)
    // result.success === false; issue.code === 'required'
    // (null is treated like a missing value unless the field is .nullable())
    // --- end snippet ---
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].code).toBe('required')
    }

    // With .nullable(), null becomes a valid value:
    const optName = a.string().nullable()
    const ok = optName.safeParse(null)
    expect(ok.success).toBe(true)
  })

  it('runtime — nullable accepts null; optional accepts undefined', () => {
    const nullableName = a.string().nullable()
    expect(nullableName.parse(null)).toBeNull()

    const optionalName = a.string().optional()
    expect(optionalName.parse(undefined)).toBeUndefined()
  })

  it('object-level — optional lifts the key to ?:; nullable does not', () => {
    const userOpt = a.object({ nickname: a.string().optional() })
    type UserOpt = Infer<typeof userOpt>
    // UserOpt = { nickname?: string | undefined }
    expectTypeOf<UserOpt>().toEqualTypeOf<{ nickname?: string | undefined }>()

    const userNul = a.object({ nickname: a.string().nullable() })
    type UserNul = Infer<typeof userNul>
    // UserNul = { nickname: string | null }   // key is REQUIRED
    expectTypeOf<UserNul>().toEqualTypeOf<{ nickname: string | null }>()
  })
})
