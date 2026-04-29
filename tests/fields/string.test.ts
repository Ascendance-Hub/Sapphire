import { describe, it, expect } from 'vitest'
import { Ruby } from '../../src/lib/ruby'
import { ORM } from '../../src/types'

describe('StringField', () => {
  const a = new Ruby(ORM.MONGO)

  it('valida string válida', () => {
    const field = a.string()
    expect(field.validate('ale').error).toBeUndefined()
  })

  it('falha para tipo incorreto', () => {
    const field = a.string()
    expect(field.validate(123).error).toBeTruthy()
  })

  it('campo obrigatório falha quando ausente', () => {
    const field = a.string()
    expect(field.validate(undefined).error).toBeTruthy()
    expect(field.validate(null).error).toBeTruthy()
  })

  it('campo opcional aceita undefined/null', () => {
    const field = a.string().optional()
    expect(field.validate(undefined).error).toBeUndefined()
    expect(field.validate(null).error).toBeUndefined()
  })
})
