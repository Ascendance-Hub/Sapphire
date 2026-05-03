import { describe, it, expect } from 'vitest'
import { Sapphire } from '../../src/lib/sapphire'

describe('multiple issues per field accumulate', () => {
  const a = new Sapphire({ defaultAdapter: 'mongo' })

  it('string min(5).max(3) on "xxxx" returns 2 issues (min_length AND max_length)', () => {
    const r = a.string().min(5).max(3).safeParse('xxxx')
    expect(r.success).toBe(false)
    if (!r.success) {
      const codes = r.error.issues.map((i) => i.code)
      expect(codes).toContain('min_length')
      expect(codes).toContain('max_length')
      expect(r.error.issues).toHaveLength(2)
    }
  })

  it('string min(5) on number 123 returns 1 issue (invalid_type only - exclusive)', () => {
    const r = a.string().min(5).safeParse(123)
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.issues).toHaveLength(1)
      expect(r.error.issues[0].code).toBe('invalid_type')
    }
  })

  it('number int().min(10) on 3.5 returns 2 issues (int AND min)', () => {
    const r = a.number().int().min(10).safeParse(3.5)
    expect(r.success).toBe(false)
    if (!r.success) {
      const codes = r.error.issues.map((i) => i.code)
      expect(codes).toContain('int')
      expect(codes).toContain('min')
    }
  })
})
