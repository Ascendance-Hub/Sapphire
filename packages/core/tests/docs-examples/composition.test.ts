// Pinned snippets for docs/concepts/composition.md. Each test mirrors a snippet
// in the doc and asserts both runtime shape AND inferred types.
import { describe, it, expect, expectTypeOf } from 'vitest'
import { Sapphire, type Infer } from '@ascendance-hub/sapphire-core'

const a = new Sapphire()

const baseUser = a.object({
  id: a.string(),
  name: a.string(),
  email: a.string().email(),
  age: a.number().int(),
})

describe('docs/concepts/composition.md — snippet pinning', () => {
  it('pick — narrow to a subset of keys', () => {
    // --- snippet: pick ---
    const publicUser = baseUser.pick(['id', 'name'] as const)
    type PublicUser = Infer<typeof publicUser>
    // PublicUser = { id: string; name: string }
    // --- end snippet ---

    expectTypeOf<PublicUser>().toEqualTypeOf<{ id: string; name: string }>()
    const parsed = publicUser.parse({ id: 'u1', name: 'Ada' })
    expect(parsed).toEqual({ id: 'u1', name: 'Ada' })
  })

  it('omit — drop one or more keys', () => {
    // --- snippet: omit ---
    const safeUser = baseUser.omit(['email'] as const)
    type SafeUser = Infer<typeof safeUser>
    // SafeUser = { id: string; name: string; age: number }
    // --- end snippet ---

    expectTypeOf<SafeUser>().toEqualTypeOf<{ id: string; name: string; age: number }>()
  })

  it('partial — every key becomes optional', () => {
    // --- snippet: partial ---
    const patch = baseUser.partial()
    type Patch = Infer<typeof patch>
    // Patch = { id?: string; name?: string; email?: string; age?: number }
    // --- end snippet ---

    expectTypeOf<Patch>().toEqualTypeOf<{
      id?: string | undefined
      name?: string | undefined
      email?: string | undefined
      age?: number | undefined
    }>()
    expect(patch.parse({}).id).toBeUndefined()
  })

  it('required — every key becomes required', () => {
    // --- snippet: required ---
    const looseUser = a.object({
      id: a.string(),
      name: a.string().optional(),
    })
    const strictUser = looseUser.required()
    type Strict = Infer<typeof strictUser>
    // Strict = { id: string; name: string }
    // --- end snippet ---

    expectTypeOf<Strict>().toEqualTypeOf<{ id: string; name: string }>()
    expect(strictUser.safeParse({ id: 'u1' }).success).toBe(false)
  })

  it('extend — add new keys; right wins on conflicts', () => {
    // --- snippet: extend ---
    const audited = baseUser.extend({
      createdAt: a.date(),
      // overrides baseUser.age:
      age: a.number().int().nonnegative(),
    })
    type Audited = Infer<typeof audited>
    // Audited adds createdAt and keeps the (narrower) age
    // --- end snippet ---

    expectTypeOf<Audited>().toEqualTypeOf<{
      id: string
      name: string
      email: string
      age: number
      createdAt: Date
    }>()
  })

  it('merge — combine two ObjectFields; right wins on conflicts', () => {
    // --- snippet: merge ---
    const audit = a.object({
      createdAt: a.date(),
      updatedAt: a.date(),
    })
    const userWithAudit = baseUser.merge(audit)
    type UserWithAudit = Infer<typeof userWithAudit>
    // UserWithAudit = baseUser fields + createdAt + updatedAt
    // --- end snippet ---

    expectTypeOf<UserWithAudit>().toEqualTypeOf<{
      id: string
      name: string
      email: string
      age: number
      createdAt: Date
      updatedAt: Date
    }>()
  })
})
