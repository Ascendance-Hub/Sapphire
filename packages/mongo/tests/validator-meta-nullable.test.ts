import { describe, it, expect } from 'vitest'
import { Sapphire } from '@ascendance-hub/sapphire-core'
import { toMongoValidator } from '../src'

const a = new Sapphire()

describe('toMongoValidator — nullable & meta escape hatch', () => {
  it('lifts a nullable primitive into a bsonType array', () => {
    const node = a.string().nullable().toSchema()
    expect(toMongoValidator(node).$jsonSchema).toEqual({ bsonType: ['string', 'null'] })
  })

  it('lifts a nullable object into a bsonType array', () => {
    const node = a.object({ a: a.string() }).nullable().toSchema()
    const schema = toMongoValidator(node).$jsonSchema as Record<string, unknown>
    expect(schema.bsonType).toEqual(['object', 'null'])
  })

  it('wraps a nullable enum in anyOf with a bsonType null branch', () => {
    const node = a.type().enum(['a', 'b']).nullable().toSchema()
    expect(toMongoValidator(node).$jsonSchema).toEqual({
      anyOf: [{ enum: ['a', 'b'] }, { bsonType: 'null' }],
    })
  })

  it('carries description through', () => {
    const node = a.string().describe('the user handle').toSchema()
    expect((toMongoValidator(node).$jsonSchema as Record<string, unknown>).description).toBe(
      'the user handle',
    )
  })

  it('merges meta.mongo keys via the .adapter() escape hatch', () => {
    const node = a.string().adapter('mongo', { title: 'Handle' }).toSchema()
    expect((toMongoValidator(node).$jsonSchema as Record<string, unknown>).title).toBe('Handle')
  })

  it('does not let the escape hatch override adapter-computed keys', () => {
    const node = a.string().adapter('mongo', { bsonType: 'object' }).toSchema()
    expect((toMongoValidator(node).$jsonSchema as Record<string, unknown>).bsonType).toBe('string')
  })

  it('ignores meta from other adapters', () => {
    const node = a.string().adapter('mongoose', { sparse: true }).toSchema()
    expect(toMongoValidator(node).$jsonSchema).toEqual({ bsonType: 'string' })
  })
})
