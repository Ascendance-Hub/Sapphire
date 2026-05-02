import { describe, it, expect } from 'vitest'
import { Sapphire } from '../../src/lib/sapphire'

describe('StringField', () => {
  const a = new Sapphire({ defaultAdapter: 'mongo' })

  it('valida string válida', () => {
    const field = a.string()
    expect(field.safeParse('ale').success).toBe(true)
  })

  it('falha para tipo incorreto', () => {
    const field = a.string()
    const r = field.safeParse(123)
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].code).toBe('invalid_type')
  })

  it('campo obrigatório falha quando ausente', () => {
    const field = a.string()
    const a1 = field.safeParse(undefined)
    const a2 = field.safeParse(null)
    expect(a1.success).toBe(false)
    expect(a2.success).toBe(false)
    if (!a1.success) expect(a1.error.issues[0].code).toBe('required')
  })

  it('campo opcional aceita undefined/null', () => {
    const field = a.string().optional()
    expect(field.safeParse(undefined).success).toBe(true)
    expect(field.safeParse(null).success).toBe(true)
  })
})
