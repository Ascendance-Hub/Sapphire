import { describe, it, expect } from 'vitest'
import { Sapphire } from '../../src/lib/sapphire'

describe('ArrayField', () => {
  const a = new Sapphire({ defaultAdapter: 'mongo' })

  it('valida array de strings', () => {
    const field = a.array([a.string()])
    expect(field.safeParse(['a', 'b', 'c']).success).toBe(true)
  })

  it('valida array de objetos', () => {
    const field = a.array([a.object({ name: a.string(), salary: a.number() })])
    expect(
      field.safeParse([
        { name: 'dev', salary: 5000 },
        { name: 'po', salary: 6000 },
      ]).success,
    ).toBe(true)
  })

  it('falha para não-array', () => {
    const field = a.array([a.string()])
    const r = field.safeParse('a')
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].code).toBe('invalid_type')
  })

  it('falha para undefined obrigatório', () => {
    const field = a.array([a.string()])
    const r = field.safeParse(undefined)
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].code).toBe('required')
  })

  describe('vocabulary', () => {
    it('min: valid and invalid', () => {
      const field = a.array([a.string()]).min(2)
      expect(field.safeParse(['a', 'b']).success).toBe(true)
      const r = field.safeParse(['a'])
      expect(r.success).toBe(false)
      if (!r.success) expect(r.error.issues.some((i) => i.code === 'min_items')).toBe(true)
    })

    it('min: per-rule message override', () => {
      const field = a.array([a.string()]).min(2, { message: 'need 2' })
      const r = field.safeParse([])
      if (!r.success) {
        const issue = r.error.issues.find((i) => i.code === 'min_items')
        expect(issue?.message).toBe('need 2')
      }
    })

    it('max: valid and invalid', () => {
      const field = a.array([a.string()]).max(2)
      expect(field.safeParse(['a', 'b']).success).toBe(true)
      const r = field.safeParse(['a', 'b', 'c'])
      expect(r.success).toBe(false)
      if (!r.success) expect(r.error.issues.some((i) => i.code === 'max_items')).toBe(true)
    })

    it('max: per-rule message override', () => {
      const field = a.array([a.string()]).max(1, { message: 'too many' })
      const r = field.safeParse(['a', 'b'])
      if (!r.success) {
        const issue = r.error.issues.find((i) => i.code === 'max_items')
        expect(issue?.message).toBe('too many')
      }
    })

    it('length: exact', () => {
      const field = a.array([a.string()]).length(2)
      expect(field.safeParse(['a', 'b']).success).toBe(true)
      const r = field.safeParse(['a'])
      expect(r.success).toBe(false)
      if (!r.success) expect(r.error.issues.some((i) => i.code === 'items_length')).toBe(true)
    })

    it('length: per-rule message override', () => {
      const field = a.array([a.string()]).length(2, { message: 'wrong' })
      const r = field.safeParse([])
      if (!r.success) {
        const issue = r.error.issues.find((i) => i.code === 'items_length')
        expect(issue?.message).toBe('wrong')
      }
    })

    it('nonempty: rejects empty', () => {
      const field = a.array([a.string()]).nonempty()
      expect(field.safeParse(['a']).success).toBe(true)
      const r = field.safeParse([])
      expect(r.success).toBe(false)
      if (!r.success) expect(r.error.issues.some((i) => i.code === 'nonempty')).toBe(true)
    })

    it('nonempty: per-rule message override', () => {
      const field = a.array([a.string()]).nonempty({ message: 'empty no' })
      const r = field.safeParse([])
      if (!r.success) {
        const issue = r.error.issues.find((i) => i.code === 'nonempty')
        expect(issue?.message).toBe('empty no')
      }
    })
  })
})
