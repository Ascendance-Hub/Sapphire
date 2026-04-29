import { describe, it, expect } from 'vitest'
import { Ruby } from '../../src/lib/ruby'
import { ORM } from '../../src/types'

describe('DateField', () => {
  const a = new Ruby(ORM.MONGO)

  it('aceita Date instance', () => {
    const field = a.date()
    expect(field.validate(new Date()).error).toBeUndefined()
  })

  it('aceita string ISO válida', () => {
    const field = a.date()
    expect(field.validate('2024-01-01').error).toBeUndefined()
  })

  it('falha para string inválida', () => {
    const field = a.date()
    expect(field.validate('not a date').error).toBeTruthy()
  })

  it('campo opcional aceita undefined', () => {
    const field = a.date().optional()
    expect(field.validate(undefined).error).toBeUndefined()
  })
})
