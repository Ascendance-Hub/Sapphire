import { describe, it, expect } from 'vitest'
import mongoose from 'mongoose'
import { toMongoSchema } from '../../src/adapters/mongo'
import { SapphireSchemaNode } from '../../src/schema/types'

describe('toMongoSchema', () => {
  it('string → { type: String, required }', () => {
    const node: SapphireSchemaNode = { kind: 'string', required: true }
    expect(toMongoSchema(node)).toEqual({ type: String, required: true })
  })

  it('string com minLength usa key minlength (Mongoose)', () => {
    const node: SapphireSchemaNode = { kind: 'string', required: true, minLength: 3 }
    expect(toMongoSchema(node)).toEqual({ type: String, required: true, minlength: 3 })
  })

  it('number → { type: Number, required }', () => {
    const node: SapphireSchemaNode = { kind: 'number', required: false }
    expect(toMongoSchema(node)).toEqual({ type: Number, required: false })
  })

  it('boolean → { type: Boolean, required }', () => {
    const node: SapphireSchemaNode = { kind: 'boolean', required: true }
    expect(toMongoSchema(node)).toEqual({ type: Boolean, required: true })
  })

  it('date → { type: Date, required }', () => {
    const node: SapphireSchemaNode = { kind: 'date', required: true }
    expect(toMongoSchema(node)).toEqual({ type: Date, required: true })
  })

  it('object → { type: { ...properties }, required }', () => {
    const node: SapphireSchemaNode = {
      kind: 'object',
      required: true,
      properties: {
        name: { kind: 'string', required: true },
        age: { kind: 'number', required: false },
      },
    }
    expect(toMongoSchema(node)).toEqual({
      type: {
        name: { type: String, required: true },
        age: { type: Number, required: false },
      },
      required: true,
    })
  })

  it('array de tipo único → { type: [itemSchema], required }', () => {
    const node: SapphireSchemaNode = {
      kind: 'array',
      required: true,
      items: [{ kind: 'string', required: true }],
    }
    expect(toMongoSchema(node)).toEqual({
      type: [{ type: String, required: true }],
      required: true,
    })
  })

  it('array heterogêneo → { type: [Mixed], required }', () => {
    const node: SapphireSchemaNode = {
      kind: 'array',
      required: true,
      items: [
        { kind: 'string', required: true },
        { kind: 'number', required: true },
      ],
    }
    const result = toMongoSchema(node)
    expect(result.required).toBe(true)
    expect(Array.isArray(result.type)).toBe(true)
    expect(result.type[0]).toBe(mongoose.Schema.Types.Mixed)
  })

  it('union → { type: Mixed, required }', () => {
    const node: SapphireSchemaNode = {
      kind: 'union',
      required: false,
      options: [
        { kind: 'string', required: true },
        { kind: 'date', required: true },
      ],
    }
    const result = toMongoSchema(node)
    expect(result.type).toBe(mongoose.Schema.Types.Mixed)
    expect(result.required).toBe(false)
  })
})
