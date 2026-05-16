import { describe, it, expect } from 'vitest'
import { Sapphire } from '@ascendance-hub/sapphire-core'
import { toBsonSchema } from '../src'

const a = new Sapphire()

describe('toBsonSchema — composites', () => {
  it('emits an object with properties and required', () => {
    const node = a.object({ name: a.string(), age: a.number().optional() }).toSchema()
    expect(toBsonSchema(node).$jsonSchema).toEqual({
      bsonType: 'object',
      properties: { name: { bsonType: 'string' }, age: { bsonType: 'number' } },
      required: ['name'],
    })
  })

  it('omits required when no property is required', () => {
    const node = a.object({ a: a.string().optional() }).toSchema()
    const schema = toBsonSchema(node).$jsonSchema as Record<string, unknown>
    expect(schema.required).toBeUndefined()
  })

  it('applies the additionalProperties option to objects', () => {
    const node = a.object({ a: a.string() }).toSchema()
    const schema = toBsonSchema(node, { additionalProperties: false }).$jsonSchema as Record<
      string,
      unknown
    >
    expect(schema.additionalProperties).toBe(false)
  })

  it('emits arrays with item schema and bounds', () => {
    const node = a.array(a.string()).min(1).max(3).toSchema()
    expect(toBsonSchema(node).$jsonSchema).toEqual({
      bsonType: 'array',
      items: { bsonType: 'string' },
      minItems: 1,
      maxItems: 3,
    })
  })

  it('emits a fixed-length array via length()', () => {
    const node = a.array(a.number()).length(2).toSchema()
    expect(toBsonSchema(node).$jsonSchema).toEqual({
      bsonType: 'array',
      items: { bsonType: 'number' },
      minItems: 2,
      maxItems: 2,
    })
  })

  it('emits tuples with an items array and additionalItems false', () => {
    const node = a.tuple([a.string(), a.number()]).toSchema()
    expect(toBsonSchema(node).$jsonSchema).toEqual({
      bsonType: 'array',
      items: [{ bsonType: 'string' }, { bsonType: 'number' }],
      additionalItems: false,
      minItems: 2,
      maxItems: 2,
    })
  })

  it('emits records as objects with an additionalProperties schema', () => {
    const node = a.type().record(a.string(), a.number()).toSchema()
    expect(toBsonSchema(node).$jsonSchema).toEqual({
      bsonType: 'object',
      additionalProperties: { bsonType: 'number' },
    })
  })

  it('inlines nested named objects (no $ref)', () => {
    const address = a.object({ city: a.string() }).name('Address')
    const node = a.object({ home: address }).toSchema()
    const schema = toBsonSchema(node).$jsonSchema as Record<string, any>
    expect(schema.properties.home).toEqual({
      bsonType: 'object',
      properties: { city: { bsonType: 'string' } },
      required: ['city'],
    })
    expect(JSON.stringify(schema)).not.toContain('$ref')
  })
})
