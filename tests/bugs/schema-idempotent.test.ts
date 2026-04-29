import { describe, it, expect } from 'vitest'
import { Sapphire } from '../../src/lib/sapphire'
import { ORM } from '../../src/types'

describe('Bug: getSchema() não pode mutar estado entre chamadas', () => {
  const a = new Sapphire({ defaultOrm: ORM.MONGO })

  it('ObjectField.getSchema é idempotente', () => {
    const field = a.object({ name: a.string(), age: a.number() })
    const first = field.getSchema()
    const second = field.getSchema()
    expect(second).toEqual(first)
  })

  it('ArrayField.getSchema é idempotente', () => {
    const field = a.array([a.string(), a.number()])
    const first = field.getSchema()
    const second = field.getSchema()
    expect(second).toEqual(first)
  })

  it('Schema aninhado profundamente é idempotente', () => {
    const field = a.object({
      user: a.object({
        name: a.string(),
        jobs: a.array([a.object({ title: a.string() })]),
      }),
    })
    const first = JSON.stringify(field.getSchema())
    const second = JSON.stringify(field.getSchema())
    expect(second).toBe(first)
  })
})
