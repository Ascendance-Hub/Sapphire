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
    expect(field.validate({ name: 'ale', age: 30 }).error).toBeUndefined()
  })

  it('falha quando subcampo é inválido', () => {
    const field = a.object({
      name: a.string(),
      age: a.number(),
    })
    expect(field.validate({ name: 'ale', age: 'trinta' }).error).toBeTruthy()
  })

  it('falha quando subcampo obrigatório está ausente', () => {
    const field = a.object({ name: a.string() })
    expect(field.validate({}).error).toBeTruthy()
  })

  it('falha para não-objeto', () => {
    const field = a.object({ name: a.string() })
    expect(field.validate('string').error).toBeTruthy()
  })

  it('falha para array (não-objeto)', () => {
    const field = a.object({ name: a.string() })
    expect(field.validate([]).error).toBeTruthy()
  })
})
