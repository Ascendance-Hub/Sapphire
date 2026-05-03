import { describe, it, expect } from 'vitest'
import { Sapphire } from '../../src/lib/sapphire'

describe('Bug: ArrayField itera sobre schema em vez dos dados', () => {
  const a = new Sapphire({ defaultAdapter: 'mongo' })

  it('detecta item inválido no meio do array', () => {
    const field = a.array([a.string()])
    const r = field.safeParse(['ok', 123, 'ok'])
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].path).toEqual([1])
  })

  it('detecta item inválido no final do array', () => {
    const field = a.array([a.string()])
    const r = field.safeParse(['ok', 'ok', 123])
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].path).toEqual([2])
  })

  it('detecta objeto inválido em array de objetos', () => {
    const field = a.array([a.object({ name: a.string(), salary: a.number() })])
    const r = field.safeParse([
      { name: 'dev', salary: 5000 },
      { name: 'po', salary: 'não é número' },
    ])
    expect(r.success).toBe(false)
  })

  it('valida array vazio para schema obrigatório', () => {
    const field = a.array([a.string()])
    expect(field.safeParse([]).success).toBe(true)
  })
})
