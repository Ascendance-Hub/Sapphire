import { describe, it, expect } from 'vitest'
import { Sapphire } from '../../src/lib/sapphire'
import { ORM } from '../../src/types'

describe('UnionField', () => {
  const a = new Sapphire({ defaultOrm: ORM.MONGO })

  it('aceita primeiro tipo do union', () => {
    const field = a.type().union([a.string(), a.number()])
    expect(field.safeParse('hello').success).toBe(true)
  })

  it('aceita segundo tipo do union', () => {
    const field = a.type().union([a.string(), a.number()])
    expect(field.safeParse(42).success).toBe(true)
  })

  it('falha quando valor não casa com nenhum tipo — issue union_no_match', () => {
    const field = a.type().union([a.string(), a.number()])
    const r = field.safeParse(true)
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].code).toBe('union_no_match')
  })
})
