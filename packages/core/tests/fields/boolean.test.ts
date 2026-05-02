import { describe, it, expect } from 'vitest'
import { Sapphire } from '../../src/lib/sapphire'
import { ORM } from '../../src/types'

describe('BooleanField', () => {
  const a = new Sapphire({ defaultOrm: ORM.MONGO })

  it('valida boolean', () => {
    const field = a.boolean()
    expect(field.safeParse(true).success).toBe(true)
    expect(field.safeParse(false).success).toBe(true)
  })

  it('falha para tipo incorreto', () => {
    const field = a.boolean()
    const r = field.safeParse('yes')
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].code).toBe('invalid_type')
  })

  it('opcional aceita undefined', () => {
    const field = a.boolean().optional()
    expect(field.safeParse(undefined).success).toBe(true)
  })
})
