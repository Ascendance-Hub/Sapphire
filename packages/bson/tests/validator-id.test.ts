import { describe, it, expect } from 'vitest'
import { Sapphire } from '@ascendance-hub/sapphire-core'
import { toBsonSchema } from '../src'

const a = new Sapphire()

describe('toBsonSchema — _id', () => {
  it('emits a declared _id field like any other property', () => {
    const node = a.object({ _id: a.string(), name: a.string() }).toSchema()
    const schema = toBsonSchema(node).$jsonSchema as Record<string, any>
    expect(schema.properties._id).toEqual({ bsonType: 'string' })
    expect(schema.required).toContain('_id')
  })

  it('says nothing about _id when the schema does not declare it', () => {
    const node = a.object({ name: a.string() }).toSchema()
    const schema = toBsonSchema(node).$jsonSchema as Record<string, any>
    expect(schema.properties).not.toHaveProperty('_id')
    expect(schema.required ?? []).not.toContain('_id')
  })

  it('emits an _id ref as objectId', () => {
    const node = a.object({ _id: a.ref('User') }).toSchema()
    const schema = toBsonSchema(node).$jsonSchema as Record<string, any>
    expect(schema.properties._id).toEqual({ bsonType: 'objectId' })
  })
})
