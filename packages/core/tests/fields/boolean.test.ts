import { describe, it, expect } from 'vitest'
import { Sapphire } from '../../src/lib/sapphire'

describe('BooleanField', () => {
  const a = new Sapphire({ defaultAdapter: 'mongo' })

  it('valida boolean', () => {
    const field = a.boolean()
    expect(field.safeParse(true).success).toBe(true)
    expect(field.safeParse(false).success).toBe(true)
  })

  it('falha para tipo incorreto', () => {
    const field = a.boolean()
    const r = field.safeParse('yes')
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].code).toBe('invalid_type')
  })

  it('opcional aceita undefined', () => {
    const field = a.boolean().optional()
    expect(field.safeParse(undefined).success).toBe(true)
  })

  describe('vocabulary', () => {
    it('coerce: "true" → true, "false" → false', () => {
      const field = a.boolean().coerce()
      const r1 = field.safeParse('true')
      const r2 = field.safeParse('false')
      expect(r1.success).toBe(true)
      expect(r2.success).toBe(true)
      if (r1.success) expect(r1.data).toBe(true)
      if (r2.success) expect(r2.data).toBe(false)
    })

    it('coerce: 1 → true, 0 → false', () => {
      const field = a.boolean().coerce()
      const r1 = field.safeParse(1)
      const r2 = field.safeParse(0)
      if (r1.success) expect(r1.data).toBe(true)
      if (r2.success) expect(r2.data).toBe(false)
    })

    it('coerce: rejects "yes" as invalid_type', () => {
      const field = a.boolean().coerce()
      const r = field.safeParse('yes')
      expect(r.success).toBe(false)
      if (!r.success) expect(r.error.issues[0].code).toBe('invalid_type')
    })
  })
})
