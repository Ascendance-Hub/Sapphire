import { describe, it, expect } from 'vitest'
import { Sapphire } from '../../src/lib/sapphire'

describe('TypeField.pick', () => {
  const a = new Sapphire({ defaultAdapter: 'mongo' })

  it('retorna ObjectField com subset das chaves', () => {
    const original = a.object({
      name: a.string(),
      age: a.number(),
      extra: a.boolean(),
    })
    const picked = a.type().pick(original, ['name', 'age'])
    expect(picked.safeParse({ name: 'ale', age: 30 }).success).toBe(true)
  })
})
