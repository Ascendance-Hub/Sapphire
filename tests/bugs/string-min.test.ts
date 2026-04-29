import { describe, it, expect } from 'vitest'
import { Ruby } from '../../src/lib/ruby'
import { ORM } from '../../src/types'

describe('Bug: StringField.min() não valida tamanho', () => {
  const a = new Ruby(ORM.MONGO)

  it('falha quando length < min', () => {
    const field = a.string().min(3)
    expect(field.validate('ab').error).toBeTruthy()
  })

  it('aceita quando length === min', () => {
    const field = a.string().min(3)
    expect(field.validate('abc').error).toBeUndefined()
  })

  it('aceita quando length > min', () => {
    const field = a.string().min(3)
    expect(field.validate('abcd').error).toBeUndefined()
  })

  it('rejeita min negativo na construção', () => {
    expect(() => a.string().min(-1)).toThrow()
  })
})
