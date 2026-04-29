import { describe, it, expect } from 'vitest'
import { Sapphire } from '../../src/lib/sapphire'
import { ORM } from '../../src/types'

describe('TypeField.pick', () => {
  const a = new Sapphire({ defaultOrm: ORM.MONGO })

  it('retorna ObjectField com subset das chaves', () => {
    const original = a.object({
      name: a.string(),
      age: a.number(),
      extra: a.boolean(),
    })
    const picked = a.type().pick(original, ['name', 'age'])
    expect(picked.validate({ name: 'ale', age: 30 }).error).toBeUndefined()
  })
})
