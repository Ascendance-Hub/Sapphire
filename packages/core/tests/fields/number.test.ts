import { describe, it, expect } from 'vitest'
import { Sapphire } from '../../src/lib/sapphire'

describe('NumberField', () => {
  const a = new Sapphire({ defaultAdapter: 'mongo' })

  it('valida números válidos', () => {
    const field = a.number()
    expect(field.safeParse(30).success).toBe(true)
    expect(field.safeParse(0).success).toBe(true)
  })

  it('falha para tipo incorreto', () => {
    const field = a.number()
    const r = field.safeParse('30')
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].code).toBe('invalid_type')
  })

  it('obrigatório falha quando undefined', () => {
    const field = a.number()
    const r = field.safeParse(undefined)
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].code).toBe('required')
  })

  it('opcional aceita undefined', () => {
    const field = a.number().optional()
    expect(field.safeParse(undefined).success).toBe(true)
  })

  describe('vocabulary', () => {
    it('min: valid and invalid', () => {
      const field = a.number().min(10)
      expect(field.safeParse(10).success).toBe(true)
      const r = field.safeParse(5)
      expect(r.success).toBe(false)
      if (!r.success) expect(r.error.issues.some((i) => i.code === 'min')).toBe(true)
    })

    it('min: per-rule message override', () => {
      const field = a.number().min(10, { message: 'too small' })
      const r = field.safeParse(1)
      if (!r.success) expect(r.error.issues[0].message).toBe('too small')
    })

    it('max: valid and invalid', () => {
      const field = a.number().max(10)
      expect(field.safeParse(10).success).toBe(true)
      const r = field.safeParse(11)
      expect(r.success).toBe(false)
      if (!r.success) expect(r.error.issues.some((i) => i.code === 'max')).toBe(true)
    })

    it('max: per-rule message override', () => {
      const field = a.number().max(10, { message: 'too big' })
      const r = field.safeParse(99)
      if (!r.success) expect(r.error.issues[0].message).toBe('too big')
    })

    it('gt: strict', () => {
      const field = a.number().gt(5)
      expect(field.safeParse(6).success).toBe(true)
      const r = field.safeParse(5)
      expect(r.success).toBe(false)
      if (!r.success) expect(r.error.issues.some((i) => i.code === 'gt')).toBe(true)
    })

    it('gte: inclusive', () => {
      const field = a.number().gte(5)
      expect(field.safeParse(5).success).toBe(true)
      const r = field.safeParse(4)
      expect(r.success).toBe(false)
      if (!r.success) expect(r.error.issues.some((i) => i.code === 'gte')).toBe(true)
    })

    it('lt: strict', () => {
      const field = a.number().lt(5)
      expect(field.safeParse(4).success).toBe(true)
      const r = field.safeParse(5)
      expect(r.success).toBe(false)
      if (!r.success) expect(r.error.issues.some((i) => i.code === 'lt')).toBe(true)
    })

    it('lte: inclusive', () => {
      const field = a.number().lte(5)
      expect(field.safeParse(5).success).toBe(true)
      const r = field.safeParse(6)
      expect(r.success).toBe(false)
      if (!r.success) expect(r.error.issues.some((i) => i.code === 'lte')).toBe(true)
    })

    it('int: valid integer / fails for float', () => {
      const field = a.number().int()
      expect(field.safeParse(5).success).toBe(true)
      const r = field.safeParse(5.5)
      expect(r.success).toBe(false)
      if (!r.success) expect(r.error.issues.some((i) => i.code === 'int')).toBe(true)
    })

    it('int: per-rule message override', () => {
      const field = a.number().int({ message: 'no float' })
      const r = field.safeParse(1.5)
      if (!r.success) expect(r.error.issues[0].message).toBe('no float')
    })

    it('positive: > 0', () => {
      const field = a.number().positive()
      expect(field.safeParse(1).success).toBe(true)
      expect(field.safeParse(0).success).toBe(false)
    })

    it('negative: < 0', () => {
      const field = a.number().negative()
      expect(field.safeParse(-1).success).toBe(true)
      expect(field.safeParse(0).success).toBe(false)
    })

    it('nonnegative: >= 0', () => {
      const field = a.number().nonnegative()
      expect(field.safeParse(0).success).toBe(true)
      expect(field.safeParse(-1).success).toBe(false)
    })

    it('nonpositive: <= 0', () => {
      const field = a.number().nonpositive()
      expect(field.safeParse(0).success).toBe(true)
      expect(field.safeParse(1).success).toBe(false)
    })

    it('multipleOf: valid/invalid', () => {
      const field = a.number().multipleOf(3)
      expect(field.safeParse(9).success).toBe(true)
      const r = field.safeParse(10)
      expect(r.success).toBe(false)
      if (!r.success) expect(r.error.issues.some((i) => i.code === 'multiple_of')).toBe(true)
    })

    it('finite: rejects Infinity', () => {
      const field = a.number().finite()
      expect(field.safeParse(1).success).toBe(true)
      const r = field.safeParse(Infinity)
      expect(r.success).toBe(false)
      if (!r.success) expect(r.error.issues.some((i) => i.code === 'finite')).toBe(true)
    })

    it('safe: rejects unsafe integers', () => {
      const field = a.number().safe()
      expect(field.safeParse(1).success).toBe(true)
      const r = field.safeParse(Number.MAX_SAFE_INTEGER + 1)
      expect(r.success).toBe(false)
      if (!r.success) expect(r.error.issues.some((i) => i.code === 'safe')).toBe(true)
    })

    it('coerce: converts string to number', () => {
      const field = a.number().coerce()
      const r = field.safeParse('42')
      expect(r.success).toBe(true)
      if (r.success) expect(r.data).toBe(42)
    })

    it('NaN fails invalid_type', () => {
      const field = a.number()
      const r = field.safeParse(NaN)
      expect(r.success).toBe(false)
      if (!r.success) expect(r.error.issues[0].code).toBe('invalid_type')
    })
  })
})
