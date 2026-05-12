import { describe, it, expect } from 'vitest'
import { Sapphire } from '../../src/lib/sapphire'

describe('ObjectField', () => {
  const a = new Sapphire({ defaultAdapter: 'mongo' })

  it('valida objeto aninhado válido', () => {
    const field = a.object({
      name: a.string(),
      age: a.number(),
    })
    expect(field.safeParse({ name: 'ale', age: 30 }).success).toBe(true)
  })

  it('falha quando subcampo é inválido — path correto', () => {
    const field = a.object({
      name: a.string(),
      age: a.number(),
    })
    const r = field.safeParse({ name: 'ale', age: 'trinta' })
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.issues[0].path).toEqual(['age'])
      expect(r.error.issues[0].code).toBe('invalid_type')
    }
  })

  it('falha quando subcampo obrigatório está ausente — emite required no path da chave', () => {
    const field = a.object({ name: a.string() })
    const r = field.safeParse({})
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.issues[0].path).toEqual(['name'])
      expect(r.error.issues[0].code).toBe('required')
    }
  })

  it('falha para não-objeto', () => {
    const field = a.object({ name: a.string() })
    const r = field.safeParse('string')
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].code).toBe('invalid_type')
  })

  it('falha para array', () => {
    const field = a.object({ name: a.string() })
    const r = field.safeParse([])
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].code).toBe('invalid_type')
  })

  // S10: non-plain objects (Date/Map/Set/RegExp/Promise/class instances) used
  // to parse as empty objects, producing required-violation noise for every
  // expected key. They now invalidate up front.
  describe('S10 — rejects non-plain object inputs', () => {
    const field = a.object({ name: a.string() })

    it('rejects Date', () => {
      const r = field.safeParse(new Date())
      expect(r.success).toBe(false)
      if (!r.success) {
        expect(r.error.issues[0].code).toBe('invalid_type')
        expect(r.error.issues[0].context).toMatchObject({ got: 'date' })
      }
    })

    it('rejects Map', () => {
      const r = field.safeParse(new Map([['name', 'a']]))
      expect(r.success).toBe(false)
      if (!r.success) {
        expect(r.error.issues[0].code).toBe('invalid_type')
        expect(r.error.issues[0].context).toMatchObject({ got: 'map' })
      }
    })

    it('rejects Set', () => {
      const r = field.safeParse(new Set(['name']))
      expect(r.success).toBe(false)
      if (!r.success) expect(r.error.issues[0].code).toBe('invalid_type')
    })

    it('rejects RegExp', () => {
      const r = field.safeParse(/foo/)
      expect(r.success).toBe(false)
      if (!r.success) expect(r.error.issues[0].code).toBe('invalid_type')
    })

    it('rejects Promise', () => {
      const r = field.safeParse(Promise.resolve({ name: 'a' }))
      expect(r.success).toBe(false)
      if (!r.success) expect(r.error.issues[0].code).toBe('invalid_type')
    })

    it('rejects class instances', () => {
      class User {
        name = 'a'
      }
      const r = field.safeParse(new User())
      expect(r.success).toBe(false)
      if (!r.success) {
        expect(r.error.issues[0].code).toBe('invalid_type')
        expect(String(r.error.issues[0].context?.got)).toContain('User')
      }
    })

    it('accepts plain objects (literal {})', () => {
      const r = field.safeParse({ name: 'a' })
      expect(r.success).toBe(true)
    })

    it('accepts Object.create(null) (null-prototype objects)', () => {
      const obj = Object.create(null) as Record<string, unknown>
      obj.name = 'a'
      const r = field.safeParse(obj)
      expect(r.success).toBe(true)
    })
  })
})
