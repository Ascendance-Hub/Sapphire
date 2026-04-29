import { describe, it, expect } from 'vitest'
import { Ruby } from '../../src/lib/ruby'
import { ORM } from '../../src/types'

describe('NumberField', () => {
  const a = new Ruby(ORM.MONGO)

  it('valida number válido', () => {
    const field = a.number()
    expect(field.validate(30).error).toBeUndefined()
    expect(field.validate(0).error).toBeUndefined()
  })

  it('falha para tipo incorreto', () => {
    const field = a.number()
    expect(field.validate('30').error).toBeTruthy()
  })

  it('campo obrigatório falha quando ausente', () => {
    const field = a.number()
    expect(field.validate(undefined).error).toBeTruthy()
  })

  it('campo opcional aceita undefined', () => {
    const field = a.number().optional()
    expect(field.validate(undefined).error).toBeUndefined()
  })
})
