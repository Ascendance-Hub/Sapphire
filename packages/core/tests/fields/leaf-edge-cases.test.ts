/**
 * season-three coverage push — edge cases on leaf/composite fields that the
 * existing per-field test files skipped: null/undefined handling on date and
 * union, invalid Date objects, and the argument-guard throws on string rule
 * builders. Each is a real behaviour contract.
 */
import { describe, it, expect } from 'vitest'
import { Sapphire } from '../../src/lib/sapphire'

const a = new Sapphire()

describe('DateField — null / undefined / invalid', () => {
  it('nullable() lets a date field accept null', () => {
    const r = a.date().nullable().safeParse(null)
    expect(r.success).toBe(true)
    if (r.success) expect(r.data).toBeNull()
  })

  it('required date rejects undefined with a required issue', () => {
    const r = a.date().safeParse(undefined)
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].code).toBe('required')
  })

  it('optional date accepts undefined', () => {
    expect(a.date().optional().safeParse(undefined).success).toBe(true)
  })

  it('an invalid Date object is rejected with invalid_type', () => {
    const r = a.date().safeParse(new Date('not-a-real-date'))
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].code).toBe('invalid_type')
  })

  it('default() on a date substitutes for undefined', () => {
    const d = new Date('2025-01-01')
    const r = a.date().default(d).safeParse(undefined)
    expect(r.success).toBe(true)
    if (r.success) expect(r.data).toEqual(d)
  })
})

describe('UnionField — null / undefined', () => {
  it('nullable() lets a union accept null', () => {
    const r = a.type().union([a.string(), a.number()]).nullable().safeParse(null)
    expect(r.success).toBe(true)
  })

  it('required union rejects undefined with a required issue', () => {
    const r = a.type().union([a.string(), a.number()]).safeParse(undefined)
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].code).toBe('required')
  })

  it('optional union accepts undefined', () => {
    const r = a.type().union([a.string(), a.number()]).optional().safeParse(undefined)
    expect(r.success).toBe(true)
  })

  it('default() on a union substitutes for undefined', () => {
    const r = a.type().union([a.string(), a.number()]).default('fallback').safeParse(undefined)
    expect(r.success).toBe(true)
    if (r.success) expect(r.data).toBe('fallback')
  })
})

describe('NumberField — null passthrough', () => {
  it('nullable() lets a number accept null', () => {
    const r = a.number().nullable().safeParse(null)
    expect(r.success).toBe(true)
    if (r.success) expect(r.data).toBeNull()
  })
})

describe('String rule builders — argument guards', () => {
  it('min() throws on a negative argument', () => {
    expect(() => a.string().min(-1)).toThrow(/non-negative/)
  })

  it('max() throws on a negative argument', () => {
    expect(() => a.string().max(-1)).toThrow(/non-negative/)
  })

  it('length() throws on a negative argument', () => {
    expect(() => a.string().length(-1)).toThrow(/non-negative/)
  })

  it('valid non-negative arguments do not throw', () => {
    expect(() => a.string().min(0).max(10).length(5)).not.toThrow()
  })
})
