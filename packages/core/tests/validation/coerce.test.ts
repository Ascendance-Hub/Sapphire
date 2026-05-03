import { describe, it, expect } from 'vitest'
import { Sapphire } from '../../src/lib/sapphire'

describe('coerce()', () => {
  const a = new Sapphire({ defaultAdapter: 'mongo' })

  describe('string', () => {
    it('converts 123 to "123"', () => {
      const r = a.string().coerce().safeParse(123)
      expect(r.success).toBe(true)
      if (r.success) expect(r.data).toBe('123')
    })

    it('preserves null when nullable', () => {
      const r = a.string().coerce().nullable().safeParse(null)
      expect(r.success).toBe(true)
      if (r.success) expect(r.data).toBe(null)
    })

    it('preserves undefined when optional', () => {
      const r = a.string().coerce().optional().safeParse(undefined)
      expect(r.success).toBe(true)
      if (r.success) expect(r.data).toBe(undefined)
    })
  })

  describe('number', () => {
    it('converts "42" to 42', () => {
      const r = a.number().coerce().safeParse('42')
      expect(r.success).toBe(true)
      if (r.success) expect(r.data).toBe(42)
    })

    it('"abc" fails invalid_type', () => {
      const r = a.number().coerce().safeParse('abc')
      expect(r.success).toBe(false)
      if (!r.success) expect(r.error.issues[0].code).toBe('invalid_type')
    })

    it('"" → 0 (intentional JS behavior)', () => {
      const r = a.number().coerce().safeParse('')
      expect(r.success).toBe(true)
      if (r.success) expect(r.data).toBe(0)
    })
  })

  describe('boolean', () => {
    it('"true" → true', () => {
      const r = a.boolean().coerce().safeParse('true')
      expect(r.success).toBe(true)
      if (r.success) expect(r.data).toBe(true)
    })

    it('"false" → false', () => {
      const r = a.boolean().coerce().safeParse('false')
      expect(r.success).toBe(true)
      if (r.success) expect(r.data).toBe(false)
    })

    it('1 → true, 0 → false', () => {
      const r1 = a.boolean().coerce().safeParse(1)
      const r2 = a.boolean().coerce().safeParse(0)
      if (r1.success) expect(r1.data).toBe(true)
      if (r2.success) expect(r2.data).toBe(false)
    })

    it('"yes" fails invalid_type', () => {
      const r = a.boolean().coerce().safeParse('yes')
      expect(r.success).toBe(false)
      if (!r.success) expect(r.error.issues[0].code).toBe('invalid_type')
    })
  })

  describe('date', () => {
    it('timestamp number → Date', () => {
      const r = a.date().coerce().safeParse(1700000000000)
      expect(r.success).toBe(true)
      if (r.success) expect(r.data).toBeInstanceOf(Date)
    })

    it('bad string fails invalid_type', () => {
      const r = a.date().coerce().safeParse('not-a-date')
      expect(r.success).toBe(false)
      if (!r.success) expect(r.error.issues[0].code).toBe('invalid_type')
    })
  })
})
