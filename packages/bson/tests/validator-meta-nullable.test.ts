import { describe, it, expect } from 'vitest'
import { Sapphire } from '@ascendance-hub/sapphire-core'
import { toBsonSchema } from '../src'

const a = new Sapphire()

describe('toBsonSchema — nullable & meta escape hatch', () => {
  it('lifts a nullable primitive into a bsonType array', () => {
    const node = a.string().nullable().toSchema()
    expect(toBsonSchema(node).$jsonSchema).toEqual({ bsonType: ['string', 'null'] })
  })

  it('lifts a nullable object into a bsonType array', () => {
    const node = a.object({ a: a.string() }).nullable().toSchema()
    const schema = toBsonSchema(node).$jsonSchema as Record<string, unknown>
    expect(schema.bsonType).toEqual(['object', 'null'])
  })

  it('wraps a nullable enum in anyOf with a bsonType null branch', () => {
    const node = a.type().enum(['a', 'b']).nullable().toSchema()
    expect(toBsonSchema(node).$jsonSchema).toEqual({
      anyOf: [{ enum: ['a', 'b'] }, { bsonType: 'null' }],
    })
  })

  it('carries description through', () => {
    const node = a.string().describe('the user handle').toSchema()
    expect((toBsonSchema(node).$jsonSchema as Record<string, unknown>).description).toBe(
      'the user handle',
    )
  })

  it('merges meta.bson keys via the .adapter() escape hatch', () => {
    const node = a.string().adapter('bson', { title: 'Handle' }).toSchema()
    expect((toBsonSchema(node).$jsonSchema as Record<string, unknown>).title).toBe('Handle')
  })

  it('does not let the escape hatch override adapter-computed keys', () => {
    const node = a.string().adapter('bson', { bsonType: 'object' }).toSchema()
    expect((toBsonSchema(node).$jsonSchema as Record<string, unknown>).bsonType).toBe('string')
  })

  it('ignores meta from other adapters', () => {
    const node = a.string().adapter('mongoose', { sparse: true }).toSchema()
    expect(toBsonSchema(node).$jsonSchema).toEqual({ bsonType: 'string' })
  })
})
