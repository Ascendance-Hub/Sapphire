import { describe, it, expect } from 'vitest'
import { Sapphire } from '../../src/lib/sapphire'
import { SapphireValidationError } from '../../src/lib/validation-error'

describe('parse / safeParse — superfície pública', () => {
  const a = new Sapphire()

  it('parse retorna o dado quando válido', () => {
    const f = a.string()
    expect(f.parse('hi')).toBe('hi')
  })

  it('parse lança SapphireValidationError quando inválido', () => {
    const f = a.string()
    let thrown: unknown
    try {
      f.parse(123)
    } catch (e) {
      thrown = e
    }
    expect(thrown).toBeInstanceOf(SapphireValidationError)
    expect((thrown as SapphireValidationError).issues[0].code).toBe('invalid_type')
  })

  it('safeParse: success=true tem .data tipado', () => {
    const f = a.object({ name: a.string(), age: a.number() })
    const r = f.safeParse({ name: 'ale', age: 30 })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data).toEqual({ name: 'ale', age: 30 })
  })

  it('safeParse: success=false tem .error com issues[]', () => {
    const f = a.object({ name: a.string() })
    const r = f.safeParse({ name: 123 })
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error).toBeInstanceOf(SapphireValidationError)
      expect(Array.isArray(r.error.issues)).toBe(true)
      expect(r.error.issues.length).toBeGreaterThan(0)
    }
  })

  it('Date string é convertida no .data', () => {
    const f = a.date()
    const r = f.safeParse('2024-01-01')
    expect(r.success).toBe(true)
    if (r.success) expect(r.data).toBeInstanceOf(Date)
  })
})
