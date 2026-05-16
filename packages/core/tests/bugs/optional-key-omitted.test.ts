/**
 * season-five S2 — an optional key absent from the input must NOT appear in the
 * parse output (Zod-like). A key passed explicitly as `undefined` is preserved;
 * a key whose field produced a value (e.g. via `default`) is kept.
 */
import { describe, it, expect } from 'vitest'
import { Sapphire } from '../../src/lib/sapphire'

const a = new Sapphire()

describe('S2 — absent optional keys are omitted from output', () => {
  it('omits an optional key absent from the input', () => {
    const User = a.object({ name: a.string(), nickname: a.string().optional() })
    const r = User.parse({ name: 'Ada' })
    expect('nickname' in r).toBe(false)
    expect(Object.keys(r)).toEqual(['name'])
  })

  it('omits multiple absent optionals at once', () => {
    const User = a.object({
      name: a.string(),
      a1: a.string().optional(),
      a2: a.number().optional(),
    })
    expect(Object.keys(User.parse({ name: 'x' }))).toEqual(['name'])
  })

  it('preserves an optional key passed explicitly as undefined', () => {
    const User = a.object({ name: a.string(), nickname: a.string().optional() })
    const r = User.parse({ name: 'Ada', nickname: undefined })
    expect('nickname' in r).toBe(true)
  })

  it('keeps a key whose optional field has a default', () => {
    const User = a.object({ role: a.string().optional().default('user') })
    expect(User.parse({})).toEqual({ role: 'user' })
  })

  it('keeps a nullable key present as null', () => {
    const User = a.object({ bio: a.string().nullable().optional() })
    const r = User.parse({ bio: null })
    expect('bio' in r).toBe(true)
    expect(r.bio).toBeNull()
  })

  it('nested objects omit their own absent optionals', () => {
    const User = a.object({ profile: a.object({ bio: a.string().optional() }) })
    const r = User.parse({ profile: {} })
    expect('bio' in (r.profile as Record<string, unknown>)).toBe(false)
  })
})
