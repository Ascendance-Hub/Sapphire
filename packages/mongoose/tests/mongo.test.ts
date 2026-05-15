import { describe, it, expect } from 'vitest'
import mongoose from 'mongoose'
import { toMongoSchema } from '../src'
import type { SapphireSchemaNode } from '@ascendance-hub/sapphire-core'

describe('toMongoSchema (primitives + composites — buildField)', () => {
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

  it('top-level object → mongoose.Schema instance', () => {
    const node: SapphireSchemaNode = {
      kind: 'object',
      required: true,
      properties: {
        name: { kind: 'string', required: true },
        age: { kind: 'number', required: false },
      },
    }
    const result = toMongoSchema(node)
    expect(result).toBeInstanceOf(mongoose.Schema)
    const schema = result as mongoose.Schema
    expect(schema.path('name')).toBeDefined()
    expect(schema.path('age')).toBeDefined()
  })

  it('nested object vira subdoc Schema com _id: false por default', () => {
    const node: SapphireSchemaNode = {
      kind: 'object',
      required: true,
      properties: {
        meta: {
          kind: 'object',
          required: true,
          properties: {
            createdAt: { kind: 'date', required: true },
          },
        },
      },
    }
    const schema = toMongoSchema(node) as mongoose.Schema
    const subPath = schema.path('meta') as any
    expect(subPath.schema).toBeInstanceOf(mongoose.Schema)
    expect(subPath.schema.options._id).toBe(false)
  })

  it('subdocId: true repassa para nested Schema', () => {
    const node: SapphireSchemaNode = {
      kind: 'object',
      required: true,
      properties: {
        meta: {
          kind: 'object',
          required: true,
          properties: {
            createdAt: { kind: 'date', required: true },
          },
        },
      },
    }
    const schema = toMongoSchema(node, { subdocId: true }) as mongoose.Schema
    const subPath = schema.path('meta') as any
    expect(subPath.schema.options._id).toBe(true)
  })

  it('array (homogêneo) → { type: [itemSchema], required }', () => {
    const node: SapphireSchemaNode = {
      kind: 'array',
      required: true,
      items: { kind: 'string', required: true },
    }
    expect(toMongoSchema(node)).toEqual({
      type: [{ type: String, required: true }],
      required: true,
    })
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
    const result = toMongoSchema(node) as Record<string, any>
    expect(result.type).toBe(mongoose.Schema.Types.Mixed)
    expect(result.required).toBe(false)
  })
})
