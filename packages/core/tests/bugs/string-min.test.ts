import { describe, it, expect } from 'vitest'
import { Sapphire } from '../../src/lib/sapphire'
import { ORM } from '../../src/types'

describe('Bug: StringField.min() não valida tamanho', () => {
  const a = new Sapphire({ defaultOrm: ORM.MONGO })

  it('falha quando length < min — issue min_length', () => {
    const field = a.string().min(3)
    const r = field.safeParse('ab')
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].code).toBe('min_length')
  })

  it('aceita quando length === min', () => {
    const field = a.string().min(3)
    expect(field.safeParse('abc').success).toBe(true)
  })

  it('aceita quando length > min', () => {
    const field = a.string().min(3)
    expect(field.safeParse('abcd').success).toBe(true)
  })

  it('rejeita min negativo na construção', () => {
    expect(() => a.string().min(-1)).toThrow()
  })
})
