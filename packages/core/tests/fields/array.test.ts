import { describe, it, expect } from 'vitest'
import { Sapphire } from '../../src/lib/sapphire'

describe('ArrayField', () => {
  const a = new Sapphire({ defaultAdapter: 'mongo' })

  it('valida array de strings', () => {
    const field = a.array([a.string()])
    expect(field.safeParse(['a', 'b', 'c']).success).toBe(true)
  })

  it('valida array de objetos', () => {
    const field = a.array([a.object({ name: a.string(), salary: a.number() })])
    expect(
      field.safeParse([
        { name: 'dev', salary: 5000 },
        { name: 'po', salary: 6000 },
      ]).success,
    ).toBe(true)
  })

  it('falha para não-array', () => {
    const field = a.array([a.string()])
    const r = field.safeParse('a')
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].code).toBe('invalid_type')
  })

  it('falha para undefined obrigatório', () => {
    const field = a.array([a.string()])
    const r = field.safeParse(undefined)
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].code).toBe('required')
  })
})
