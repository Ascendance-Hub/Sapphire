import { describe, it, expect } from 'vitest'
import { Sapphire } from '../../src/lib/sapphire'
import { ORM } from '../../src/types'

describe('BooleanField', () => {
  const a = new Sapphire({ defaultOrm: ORM.MONGO })

  it('valida boolean válido', () => {
    const field = a.boolean()
    expect(field.validate(true).error).toBeUndefined()
    expect(field.validate(false).error).toBeUndefined()
  })

  it('falha para tipo incorreto', () => {
    const field = a.boolean()
    expect(field.validate('yes').error).toBeTruthy()
  })

  it('campo opcional aceita undefined', () => {
    const field = a.boolean().optional()
    expect(field.validate(undefined).error).toBeUndefined()
  })
})
