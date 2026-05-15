import { describe, it, expect } from 'vitest'
import { Sapphire } from '../../src/lib/sapphire'

describe('Default messages — Dispatch D (novos codes)', () => {
  const a = new Sapphire()

  it('max_length: a.string().max(3) on overlong input', () => {
    const r = a.string().max(3).safeParse('xxxx')
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].message).toBe('Must have at most 3 characters')
  })

  it('int: a.number().int() on float input', () => {
    const r = a.number().int().safeParse(3.5)
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].message).toBe('Must be an integer')
  })

  it('gt: a.number().gt(0) on negative input', () => {
    const r = a.number().gt(0).safeParse(-1)
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].message).toBe('Must be > 0')
  })

  it('format: a.string().email() on invalid input', () => {
    const r = a.string().email().safeParse('nope')
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].message).toBe('Must be a valid email')
  })

  // I3: nonempty() is sugar for .min(1) — issue code is min_items, default
  // message comes from the min_items message template.
  it('nonempty: a.array(...).nonempty() on empty array (min_items message)', () => {
    const r = a.array(a.string()).nonempty().safeParse([])
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].message).toBe('Must have at least 1 items')
  })

  it('min: a.number().min(5) on under-min input', () => {
    const r = a.number().min(5).safeParse(3)
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].message).toBe('Must be ≥ 5')
  })

  it('starts_with: a.string().startsWith("foo") on bad input', () => {
    const r = a.string().startsWith('foo').safeParse('bar')
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].message).toBe('Must start with "foo"')
  })

  it('regex: a.string().regex(/^[a-z]+$/) on bad input', () => {
    const r = a
      .string()
      .regex(/^[a-z]+$/)
      .safeParse('ABC')
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].message).toBe('Does not match required pattern')
  })
})
