import { describe, it, expect } from 'vitest'
import { Ruby } from '../../src/lib/ruby'
import { ORM } from '../../src/types'

describe('Bug: ObjectField.optional() não funciona', () => {
  const a = new Ruby(ORM.MONGO)

  it('objeto opcional aceita undefined', () => {
    const field = a.object({ name: a.string() }).optional()
    expect(field.validate(undefined).error).toBeUndefined()
  })

  it('objeto opcional aceita null', () => {
    const field = a.object({ name: a.string() }).optional()
    expect(field.validate(null).error).toBeUndefined()
  })

  it('objeto obrigatório falha em undefined', () => {
    const field = a.object({ name: a.string() })
    expect(field.validate(undefined).error).toBeTruthy()
  })

  it('objeto opcional ainda valida quando presente', () => {
    const field = a.object({ name: a.string() }).optional()
    expect(field.validate({ name: 'ale' }).error).toBeUndefined()
    expect(field.validate({ name: 123 }).error).toBeTruthy()
  })

  it('schema reflete required:false após optional()', () => {
    const field = a.object({ name: a.string() }).optional()
    expect(field.getSchema().required).toBe(false)
  })
})
