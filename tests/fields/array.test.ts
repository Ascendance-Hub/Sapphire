import { describe, it, expect } from 'vitest'
import { Sapphire } from '../../src/lib/sapphire'
import { ORM } from '../../src/types'

describe('ArrayField', () => {
  const a = new Sapphire({ defaultOrm: ORM.MONGO })

  it('valida array de strings', () => {
    const field = a.array([a.string()])
    expect(field.validate(['a', 'b', 'c']).error).toBeUndefined()
  })

  it('valida array de objetos', () => {
    const field = a.array([a.object({ name: a.string(), salary: a.number() })])
    expect(
      field.validate([
        { name: 'dev', salary: 5000 },
        { name: 'po', salary: 6000 },
      ]).error
    ).toBeUndefined()
  })

  it('falha para não-array', () => {
    const field = a.array([a.string()])
    expect(field.validate('a').error).toBeTruthy()
  })

  it('falha para undefined obrigatório', () => {
    const field = a.array([a.string()])
    expect(field.validate(undefined).error).toBeTruthy()
  })
})
