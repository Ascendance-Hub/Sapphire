import { describe, it, expect } from 'vitest'
import { Ruby } from '../../src/lib/ruby'
import { ORM } from '../../src/types'

describe('UnionField', () => {
  const a = new Ruby(ORM.MONGO)

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
