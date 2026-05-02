import { describe, it, expect } from 'vitest'
import { Sapphire } from '../../src/lib/sapphire'

describe('Validation — abortEarly', () => {
  it('default (false): coleta todas as issues do object', () => {
    const a = new Sapphire()
    const f = a.object({
      a: a.string(),
      b: a.number(),
      c: a.boolean(),
    })
    const r = f.safeParse({ a: 1, b: 'x', c: 'y' })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues.length).toBe(3)
  })

  it('abortEarly por instância: para na primeira issue', () => {
    const a = new Sapphire({ abortEarly: true })
    const f = a.object({
      a: a.string(),
      b: a.number(),
      c: a.boolean(),
    })
    const r = f.safeParse({ a: 1, b: 'x', c: 'y' })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues.length).toBe(1)
  })

  it('abortEarly por chamada sobrescreve a instância', () => {
    const a = new Sapphire({ abortEarly: false })
    const f = a.object({
      a: a.string(),
      b: a.number(),
    })
    const r = f.safeParse({ a: 1, b: 'x' }, { abortEarly: true })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues.length).toBe(1)
  })
})
