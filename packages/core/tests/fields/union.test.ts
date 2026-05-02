import { describe, it, expect } from 'vitest'
import { Sapphire } from '../../src/lib/sapphire'
import { ORM } from '../../src/types'

describe('UnionField', () => {
  const a = new Sapphire({ defaultOrm: ORM.MONGO })

  it('aceita primeiro tipo do union', () => {
    const field = a.type().union([a.string(), a.number()])
    expect(field.validate('hello').error).toBeUndefined()
  })

  it('aceita segundo tipo do union', () => {
    const field = a.type().union([a.string(), a.number()])
    expect(field.validate(42).error).toBeUndefined()
  })

  it('falha quando valor não casa com nenhum tipo', () => {
    const field = a.type().union([a.string(), a.number()])
    expect(field.validate(true).error).toBeTruthy()
  })
})
