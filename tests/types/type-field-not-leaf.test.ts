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

  it('a.type().pick(other, [...]) gera ObjectField válido', () => {
    const source = a.object({
      name: a.string(),
      age: a.number(),
      extra: a.boolean(),
    })
    const picked = a.type().pick(source, ['name', 'age'])
    const schema = picked.toSchema() as any
    expect(Object.keys(schema.properties)).toEqual(['name', 'age'])
  })
})
