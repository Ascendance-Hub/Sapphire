/**
 * season-three review fixes — runtime contracts for the gaps the launch
 * review surfaced:
 *  - RecordField rejects exotic objects (Date/Map/class) instead of parsing
 *    them to `{}` (parity with ObjectField's S10 guard).
 *  - BooleanField gained `.unique()` for parity with string/number/date.
 *  - ArrayField count setters and NumberField bound setters reject nonsensical
 *    arguments at build time.
 */
import { describe, it, expect } from 'vitest'
import { Sapphire } from '../../src/lib/sapphire'

const a = new Sapphire()

describe('RecordField — plain-object guard', () => {
  it('rejects a Date with invalid_type', () => {
    const rec = a.type().record(a.string(), a.number())
    const r = rec.safeParse(new Date())
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.issues[0].code).toBe('invalid_type')
      expect(r.error.issues[0].context?.got).toBe('date')
    }
  })

  it('rejects a Map with invalid_type', () => {
    const rec = a.type().record(a.string(), a.number())
    const r = rec.safeParse(new Map([['k', 1]]))
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].code).toBe('invalid_type')
  })

  it('rejects a class instance with invalid_type', () => {
    class Box {
      n = 1
    }
    const rec = a.type().record(a.string(), a.number())
    const r = rec.safeParse(new Box())
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].code).toBe('invalid_type')
  })

  it('rejects an array with invalid_type', () => {
    const rec = a.type().record(a.string(), a.number())
    const r = rec.safeParse([1, 2])
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].code).toBe('invalid_type')
  })

  it('still accepts a plain object', () => {
    const rec = a.type().record(a.string(), a.number())
    expect(rec.safeParse({ a: 1, b: 2 }).success).toBe(true)
  })

  it('accepts an Object.create(null) record', () => {
    const rec = a.type().record(a.string(), a.number())
    const bare = Object.create(null) as Record<string, number>
    bare.x = 1
    expect(rec.safeParse(bare).success).toBe(true)
  })
})

describe('BooleanField.unique()', () => {
  it('sets the unique flag in the IR', () => {
    expect(a.boolean().unique().toSchema().unique).toBe(true)
  })

  it('a plain boolean has no unique flag', () => {
    expect(a.boolean().toSchema().unique).toBeUndefined()
  })

  it('unique() is immutable — base field is unchanged', () => {
    const base = a.boolean()
    base.unique()
    expect(base.toSchema().unique).toBeUndefined()
  })
})

describe('ArrayField — count argument guards', () => {
  it('min() throws on a negative count', () => {
    expect(() => a.array(a.string()).min(-1)).toThrow(/non-negative integer/)
  })

  it('max() throws on a fractional count', () => {
    expect(() => a.array(a.string()).max(2.5)).toThrow(/non-negative integer/)
  })

  it('length() throws on a negative count', () => {
    expect(() => a.array(a.string()).length(-3)).toThrow(/non-negative integer/)
  })

  it('valid counts do not throw', () => {
    expect(() => a.array(a.string()).min(0).max(10).length(5)).not.toThrow()
  })
})

describe('NumberField — bound argument guards', () => {
  it('min() throws on NaN', () => {
    expect(() => a.number().min(NaN)).toThrow(/finite number/)
  })

  it('max() throws on Infinity', () => {
    expect(() => a.number().max(Infinity)).toThrow(/finite number/)
  })

  it('gt/gte/lt/lte throw on non-finite bounds', () => {
    expect(() => a.number().gt(NaN)).toThrow(/finite number/)
    expect(() => a.number().gte(Infinity)).toThrow(/finite number/)
    expect(() => a.number().lt(-Infinity)).toThrow(/finite number/)
    expect(() => a.number().lte(NaN)).toThrow(/finite number/)
  })

  it('negative finite bounds are valid (numbers, unlike counts, may be negative)', () => {
    expect(() => a.number().min(-100).max(-1)).not.toThrow()
  })
})
