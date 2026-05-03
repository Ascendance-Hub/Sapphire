import { describe, it, expect } from 'vitest'
import { Sapphire } from '../../src/lib/sapphire'

describe('RefField', () => {
  it('a.ref(SchemaObj) com .name(...) registra target correto', () => {
    const a = new Sapphire()
    const User = a.object({ name: a.string() }).name('User')
    const ref = a.ref(User)
    const s = ref.toSchema() as any
    expect(s.kind).toBe('ref')
    expect(s.target).toBe('User')
  })

  it('a.ref(SchemaObj) sem .name(...) lança erro', () => {
    const a = new Sapphire()
    const Unnamed = a.object({ name: a.string() })
    expect(() => a.ref(Unnamed)).toThrow(/requires schema\.name/)
  })

  it('a.ref(string) aceita forward reference (lazy)', () => {
    const a = new Sapphire()
    const ref = a.ref('FutureSchema')
    const s = ref.toSchema() as any
    expect(s.target).toBe('FutureSchema')
  })

  it('parse exige presença mas não valida shape em V1', () => {
    const a = new Sapphire()
    const ref = a.ref('User')
    expect(ref.safeParse('507f1f77bcf86cd799439011').success).toBe(true)
    expect(ref.safeParse({ anything: true }).success).toBe(true)
    const r = ref.safeParse(undefined)
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].code).toBe('required')
  })

  it('optional aceita undefined', () => {
    const a = new Sapphire()
    const ref = a.ref('User').optional()
    expect(ref.safeParse(undefined).success).toBe(true)
  })
})
