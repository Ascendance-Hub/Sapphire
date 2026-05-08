import { describe, it, expect } from 'vitest'
import { Sapphire } from '../../src/lib/sapphire'

describe('Bug: toSchema() não pode mutar estado entre chamadas', () => {
  const a = new Sapphire({ defaultAdapter: 'mongo' })

  it('ObjectField.toSchema é idempotente', () => {
    const field = a.object({ name: a.string(), age: a.number() })
    const first = field.toSchema()
    const second = field.toSchema()
    expect(second).toEqual(first)
  })

  it('ArrayField.toSchema é idempotente', () => {
    const field = a.array(a.type().union([a.string(), a.number()]))
    const first = field.toSchema()
    const second = field.toSchema()
    expect(second).toEqual(first)
  })

  it('Schema aninhado profundamente é idempotente', () => {
    const field = a.object({
      user: a.object({
        name: a.string(),
        jobs: a.array(a.object({ title: a.string() })),
      }),
    })
    const first = JSON.stringify(field.toSchema())
    const second = JSON.stringify(field.toSchema())
    expect(second).toBe(first)
  })
})
