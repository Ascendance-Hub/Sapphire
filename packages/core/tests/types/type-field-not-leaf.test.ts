import { describe, it, expect } from 'vitest'
import { Sapphire } from '../../src/lib/sapphire'

describe('TypeField não é Field — não compila como leaf', () => {
  const a = new Sapphire()

  it('a.object({ x: a.type() }) não compila', () => {
    // @ts-expect-error - TypeField não é atribuível a Field, deve falhar em compile-time
    const _bad = a.object({ x: a.type() })
    expect(_bad).toBeDefined()
  })

  it('a.type().union([...]) gera UnionField válido', () => {
    const field = a.type().union([a.string(), a.date()])
    const obj = a.object({ x: field })
    const schema = obj.toSchema() as any
    expect(schema.properties.x.kind).toBe('union')
  })

  it('a.type().literal(value) gera LiteralField válido', () => {
    const lit = a.type().literal('admin')
    const schema = lit.toSchema() as any
    expect(schema.kind).toBe('literal')
    expect(schema.value).toBe('admin')
  })
})
