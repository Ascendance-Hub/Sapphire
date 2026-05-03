import { describe, it, expect } from 'vitest'
import { Sapphire } from '../../src/lib/sapphire'

describe('DateField', () => {
  const a = new Sapphire({ defaultAdapter: 'mongo' })

  it('aceita Date instance', () => {
    const field = a.date()
    expect(field.safeParse(new Date()).success).toBe(true)
  })

  it('aceita string ISO válida e converte para Date', () => {
    const field = a.date()
    const r = field.safeParse('2024-01-01')
    expect(r.success).toBe(true)
    if (r.success) expect(r.data).toBeInstanceOf(Date)
  })

  it('falha para string inválida', () => {
    const field = a.date()
    const r = field.safeParse('not a date')
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].code).toBe('invalid_type')
  })

  it('opcional aceita undefined', () => {
    const field = a.date().optional()
    expect(field.safeParse(undefined).success).toBe(true)
  })

  describe('vocabulary', () => {
    it('min: valid and invalid', () => {
      const field = a.date().min(new Date('2020-01-01'))
      expect(field.safeParse(new Date('2021-01-01')).success).toBe(true)
      const r = field.safeParse(new Date('2019-01-01'))
      expect(r.success).toBe(false)
      if (!r.success) expect(r.error.issues.some((i) => i.code === 'min')).toBe(true)
    })

    it('min: per-rule message override', () => {
      const field = a.date().min(new Date('2020-01-01'), { message: 'too early' })
      const r = field.safeParse(new Date('2019-01-01'))
      if (!r.success) expect(r.error.issues[0].message).toBe('too early')
    })

    it('max: valid and invalid', () => {
      const field = a.date().max(new Date('2020-01-01'))
      expect(field.safeParse(new Date('2019-01-01')).success).toBe(true)
      const r = field.safeParse(new Date('2021-01-01'))
      expect(r.success).toBe(false)
      if (!r.success) expect(r.error.issues.some((i) => i.code === 'max')).toBe(true)
    })

    it('max: per-rule message override', () => {
      const field = a.date().max(new Date('2020-01-01'), { message: 'too late' })
      const r = field.safeParse(new Date('2021-01-01'))
      if (!r.success) expect(r.error.issues[0].message).toBe('too late')
    })

    it('coerce: timestamp number → Date', () => {
      const field = a.date().coerce()
      const r = field.safeParse(0)
      expect(r.success).toBe(true)
      if (r.success) expect(r.data).toBeInstanceOf(Date)
    })
  })
})
