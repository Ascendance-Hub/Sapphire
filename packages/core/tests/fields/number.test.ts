import { describe, it, expect } from 'vitest'
import { Sapphire } from '../../src/lib/sapphire'

describe('NumberField', () => {
  const a = new Sapphire({ defaultAdapter: 'mongo' })

  it('valida números válidos', () => {
    const field = a.number()
    expect(field.safeParse(30).success).toBe(true)
    expect(field.safeParse(0).success).toBe(true)
  })

  it('falha para tipo incorreto', () => {
    const field = a.number()
    const r = field.safeParse('30')
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].code).toBe('invalid_type')
  })

  it('obrigatório falha quando undefined', () => {
    const field = a.number()
    const r = field.safeParse(undefined)
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].code).toBe('required')
  })

  it('opcional aceita undefined', () => {
    const field = a.number().optional()
    expect(field.safeParse(undefined).success).toBe(true)
  })
})
