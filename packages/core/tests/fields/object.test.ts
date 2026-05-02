import { describe, it, expect } from 'vitest'
import { Sapphire } from '../../src/lib/sapphire'
import { ORM } from '../../src/types'

describe('ObjectField', () => {
  const a = new Sapphire({ defaultOrm: ORM.MONGO })

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
})
