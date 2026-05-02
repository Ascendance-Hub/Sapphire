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
    const f = a.array([a.string()])
    const r = f.safeParse(['ok', 123])
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].path).toEqual([1])
  })

  it('Object > Array > Object: path completo', () => {
    const f = a.object({
      employmentHistory: a.array([
        a.object({
          company: a.string(),
          salary: a.number(),
        }),
      ]),
    })
    const r = f.safeParse({
      employmentHistory: [
        { company: 'acme', salary: 5000 },
        { company: 'globex', salary: 'não é número' },
      ],
    })
    expect(r.success).toBe(false)
    if (!r.success) {
      // O array tenta cada field por item; quando nenhum casa, emite union_no_match
      // no path do item — em F8 (legado pré-F10) o single-field array reporta o
      // erro do item como union_no_match no índice. F10 vai mudar para erro
      // detalhado por subcampo. Aqui validamos só que o path inclui o índice.
      const paths = r.error.issues.map((i) => i.path)
      expect(paths.some((p) => p[0] === 'employmentHistory' && p[1] === 1)).toBe(true)
    }
  })
})
