import { describe, it, expect } from 'vitest'
import mongoose from 'mongoose'
import { toMongooseSchema } from '../src'
import type { SapphireSchemaNode } from '@ascendance-hub/sapphire-core'
import { uniqueModelName } from './_setup'

describe('Mongoose adapter — literal', () => {
  it('literal string → { type: String, enum: [value], required }', () => {
    const node: SapphireSchemaNode = { kind: 'literal', required: true, value: 'admin' }
    expect(toMongooseSchema(node)).toEqual({
      type: String,
      required: true,
      enum: ['admin'],
    })
  })

  it('literal number → { type: Number, enum: [value], required }', () => {
    const node: SapphireSchemaNode = { kind: 'literal', required: true, value: 42 }
    expect(toMongooseSchema(node)).toEqual({
      type: Number,
      required: true,
      enum: [42],
    })
  })

  it('literal boolean → { type: Boolean, enum: [value], required }', () => {
    const node: SapphireSchemaNode = { kind: 'literal', required: false, value: true }
    expect(toMongooseSchema(node)).toEqual({
      type: Boolean,
      required: false,
      enum: [true],
    })
  })

  it('literal inside object — Model accepts only the literal value', () => {
    const node: SapphireSchemaNode = {
      kind: 'object',
      required: true,
      properties: {
        role: { kind: 'literal', required: true, value: 'admin' },
      },
    }
    const schema = toMongooseSchema(node) as mongoose.Schema
    const Model = mongoose.model(uniqueModelName('TestLiteral'), schema)
    const ok = new Model({ role: 'admin' })
    expect(ok.validateSync()).toBeUndefined()
    const bad = new Model({ role: 'user' })
    expect(bad.validateSync()?.errors.role).toBeDefined()
  })
})

describe('Mongoose adapter — ref', () => {
  it('ref → { type: ObjectId, ref: target, required }', () => {
    const node: SapphireSchemaNode = { kind: 'ref', required: true, target: 'User' }
    expect(toMongooseSchema(node)).toEqual({
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    })
  })

  it('ref inside object → path is ObjectId with ref populated', () => {
    const node: SapphireSchemaNode = {
      kind: 'object',
      required: true,
      properties: {
        author: { kind: 'ref', required: true, target: 'User' },
      },
    }
    const schema = toMongooseSchema(node) as mongoose.Schema
    const path = schema.path('author') as any
    expect(path.instance).toBe('ObjectId')
    expect(path.options.ref).toBe('User')
    expect(path.isRequired).toBe(true)
  })

  it('optional ref preserves required: false', () => {
    const node: SapphireSchemaNode = { kind: 'ref', required: false, target: 'Tag' }
    const result = toMongooseSchema(node) as Record<string, any>
    expect(result.type).toBe(mongoose.Schema.Types.ObjectId)
    expect(result.ref).toBe('Tag')
    expect(result.required).toBe(false)
  })
})
