import { describe, it, expect } from 'vitest'
import { Sapphire } from '../../src/lib/sapphire'

describe('Validation — path em estruturas aninhadas', () => {
  const a = new Sapphire()

  it('ObjectField appenda key no path', () => {
    const f = a.object({ name: a.string() })
    const r = f.safeParse({ name: 123 })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].path).toEqual(['name'])
  })

  it('ArrayField appenda index no path', () => {
    const f = a.array(a.string())
    const r = f.safeParse(['ok', 123])
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].path).toEqual([1])
  })

  it('Object > Array > Object: path completo', () => {
    const f = a.object({
      employmentHistory: a.array(
        a.object({
          company: a.string(),
          salary: a.number(),
        }),
      ),
    })
    const r = f.safeParse({
      employmentHistory: [
        { company: 'acme', salary: 5000 },
        { company: 'globex', salary: 'não é número' },
      ],
    })
    expect(r.success).toBe(false)
    if (!r.success) {
      // F10: ArrayField homogêneo valida cada item contra o field único e propaga
      // a issue do subcampo (path completo até a chave).
      const paths = r.error.issues.map((i) => i.path)
      expect(paths.some((p) => p[0] === 'employmentHistory' && p[1] === 1)).toBe(true)
    }
  })
})
