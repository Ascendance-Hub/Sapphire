import { describe, it, expect } from 'vitest'
import { Sapphire } from '@ascendance-hub/sapphire-core'
import { toMongoValidator } from '../src'

const a = new Sapphire()

describe('toMongoValidator — primitives', () => {
  it('wraps the root output in $jsonSchema', () => {
    expect(toMongoValidator(a.string().toSchema())).toHaveProperty('$jsonSchema')
  })

  it('emits bsonType string with length constraints', () => {
    const node = a.string().min(2).max(8).toSchema()
    expect(toMongoValidator(node).$jsonSchema).toEqual({
      bsonType: 'string',
      minLength: 2,
      maxLength: 8,
    })
  })

  it('emits an exact length as min+max', () => {
    const node = a.string().length(5).toSchema()
    expect(toMongoValidator(node).$jsonSchema).toEqual({
      bsonType: 'string',
      minLength: 5,
      maxLength: 5,
    })
  })

  it('emits a pattern for startsWith', () => {
    const node = a.string().startsWith('SKU').toSchema()
    expect(toMongoValidator(node).$jsonSchema).toEqual({
      bsonType: 'string',
      pattern: '^SKU',
    })
  })

  it('escapes regex metacharacters in startsWith', () => {
    const node = a.string().startsWith('a.b').toSchema()
    expect((toMongoValidator(node).$jsonSchema as Record<string, unknown>).pattern).toBe('^a\\.b')
  })

  it('combines multiple string patterns with allOf', () => {
    const node = a.string().startsWith('a').endsWith('z').toSchema()
    const schema = toMongoValidator(node).$jsonSchema as Record<string, unknown>
    expect(schema.allOf).toEqual([{ pattern: '^a' }, { pattern: 'z$' }])
  })

  it('maps a regex modifier to pattern', () => {
    const node = a.string().regex(/^\d+$/).toSchema()
    expect((toMongoValidator(node).$jsonSchema as Record<string, unknown>).pattern).toBe('^\\d+$')
  })

  it('maps format email/uuid to a pattern and omits url', () => {
    expect(
      (toMongoValidator(a.string().email().toSchema()).$jsonSchema as Record<string, unknown>)
        .pattern,
    ).toBeTypeOf('string')
    expect(
      (toMongoValidator(a.string().uuid().toSchema()).$jsonSchema as Record<string, unknown>)
        .pattern,
    ).toBeTypeOf('string')
    expect(
      (toMongoValidator(a.string().url().toSchema()).$jsonSchema as Record<string, unknown>)
        .pattern,
    ).toBeUndefined()
  })

  it('maps plain number to bsonType number and int() to int', () => {
    expect(toMongoValidator(a.number().toSchema()).$jsonSchema).toEqual({ bsonType: 'number' })
    expect(toMongoValidator(a.number().int().toSchema()).$jsonSchema).toEqual({ bsonType: 'int' })
  })

  it('emits inclusive number range keywords', () => {
    const node = a.number().min(0).max(10).multipleOf(2).toSchema()
    expect(toMongoValidator(node).$jsonSchema).toEqual({
      bsonType: 'number',
      minimum: 0,
      maximum: 10,
      multipleOf: 2,
    })
  })

  it('emits exclusive bounds as draft-4 boolean flags paired with minimum/maximum', () => {
    const node = a.number().gt(1).lt(9).toSchema()
    expect(toMongoValidator(node).$jsonSchema).toEqual({
      bsonType: 'number',
      minimum: 1,
      maximum: 9,
      exclusiveMinimum: true,
      exclusiveMaximum: true,
    })
  })

  it('maps boolean to bool and date to date', () => {
    expect(toMongoValidator(a.boolean().toSchema()).$jsonSchema).toEqual({ bsonType: 'bool' })
    expect(toMongoValidator(a.date().toSchema()).$jsonSchema).toEqual({ bsonType: 'date' })
  })
})
