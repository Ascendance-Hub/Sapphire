import { describe, it, expect } from 'vitest'
import { Sapphire } from '../../src/lib/sapphire'

describe('Validation — stripUnknown', () => {
  it('default (false): chave desconhecida vira issue unknown_key', () => {
    const a = new Sapphire()
    const f = a.object({ name: a.string() })
    const r = f.safeParse({ name: 'ale', extra: 1 })
    expect(r.success).toBe(false)
    if (!r.success) {
      const codes = r.error.issues.map((i) => i.code)
      expect(codes).toContain('unknown_key')
      const unknown = r.error.issues.find((i) => i.code === 'unknown_key')!
      expect(unknown.path).toEqual(['extra'])
    }
  })

  it('stripUnknown=true: chaves desconhecidas são silenciosamente removidas', () => {
    const a = new Sapphire({ stripUnknown: true })
    const f = a.object({ name: a.string() })
    const r = f.safeParse({ name: 'ale', extra: 1 })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data).toEqual({ name: 'ale' })
  })

  it('stripUnknown por chamada sobrescreve a instância', () => {
    const a = new Sapphire({ stripUnknown: false })
    const f = a.object({ name: a.string() })
    const r = f.safeParse({ name: 'ale', extra: 1 }, { stripUnknown: true })
    expect(r.success).toBe(true)
  })
})
