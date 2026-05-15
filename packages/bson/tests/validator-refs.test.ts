import { describe, it, expect } from 'vitest'
import { Sapphire } from '@ascendance-hub/sapphire-core'
import { toBsonSchema } from '../src'

const a = new Sapphire()

describe('toBsonSchema — union/literal/enum/ref', () => {
  it('emits unions as anyOf', () => {
    const node = a.type().union([a.string(), a.number()]).toSchema()
    expect(toBsonSchema(node).$jsonSchema).toEqual({
      anyOf: [{ bsonType: 'string' }, { bsonType: 'number' }],
    })
  })

  it('emits a literal as a single-value enum', () => {
    expect(toBsonSchema(a.type().literal('ACTIVE').toSchema()).$jsonSchema).toEqual({
      enum: ['ACTIVE'],
    })
  })

  it('emits an enum as a multi-value enum', () => {
    expect(toBsonSchema(a.type().enum(['a', 'b', 'c']).toSchema()).$jsonSchema).toEqual({
      enum: ['a', 'b', 'c'],
    })
  })

  it('emits a ref as bsonType objectId', () => {
    const node = a.object({ author: a.ref('User') }).toSchema()
    const schema = toBsonSchema(node).$jsonSchema as Record<string, any>
    expect(schema.properties.author).toEqual({ bsonType: 'objectId' })
  })
})
