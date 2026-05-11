// Pinned snippets for docs/concepts/fields-and-modifiers.md. Each block below
// is the exact code shown in that doc. If the API changes, this test fails and
// the doc is explicitly marked as wrong instead of silently rotting.
import { describe, it, expect } from 'vitest'
import { Sapphire, type Infer } from '@ascendance-hub/sapphire-core'

const a = new Sapphire()

describe('docs/concepts/fields-and-modifiers.md — snippet pinning', () => {
  it('minimal example — every primitive plus an object wrapper', () => {
    // --- snippet: minimal example ---
    const user = a.object({
      name: a.string().min(1).max(120),
      age: a.number().int().nonnegative(),
      active: a.boolean().default(true),
      createdAt: a.date(),
    })

    type User = Infer<typeof user>
    // User = { name: string; age: number; active: boolean; createdAt: Date }
    // --- end snippet ---

    const parsed = user.parse({
      name: 'Ada',
      age: 36,
      createdAt: new Date('2026-01-01T00:00:00Z'),
    })
    expect(parsed.active).toBe(true)
    expect(parsed.name).toBe('Ada')
  })

  it('string modifiers — min/max/email/regex chain', () => {
    // --- snippet: string modifiers ---
    const email = a.string().min(3).max(254).email()
    // --- end snippet ---
    expect(email.safeParse('a@b.co').success).toBe(true)
    expect(email.safeParse('nope').success).toBe(false)
  })

  it('number modifiers — int + range', () => {
    // --- snippet: number modifiers ---
    const age = a.number().int().gte(0).lte(150)
    // --- end snippet ---
    expect(age.safeParse(0).success).toBe(true)
    expect(age.safeParse(150).success).toBe(true)
    expect(age.safeParse(151).success).toBe(false)
    expect(age.safeParse(1.5).success).toBe(false)
  })

  it('universal modifiers — optional, nullable, default, describe', () => {
    // --- snippet: universal modifiers ---
    const bio = a.string().max(280).optional().describe('User bio (markdown)')
    const nickname = a.string().nullable()
    const role = a.string().default('member')
    // --- end snippet ---

    expect(bio.safeParse(undefined).success).toBe(true)
    expect(nickname.safeParse(null).success).toBe(true)
    expect(role.parse(undefined)).toBe('member')
  })

  it('coerce runs before other rules — string', () => {
    // --- snippet: coerce ordering ---
    const slug = a.string().coerce().toLowerCase().min(3)
    // The number 42 becomes the string "42" first, then lowercases (no-op),
    // then is checked against min(3) — which fails because "42".length === 2.
    // --- end snippet ---
    const result = slug.safeParse(42)
    expect(result.success).toBe(false)
  })
})
