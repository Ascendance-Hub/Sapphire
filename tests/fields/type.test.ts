import { describe, it, expect } from 'vitest'
import { Ruby } from '../../src/lib/ruby'
import { ORM } from '../../src/types'

describe('TypeField.pick', () => {
  const a = new Ruby(ORM.MONGO)

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
