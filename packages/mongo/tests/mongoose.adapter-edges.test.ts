/**
 * season-three coverage push — Mongo adapter branches the existing suite
 * skipped: enum emission, and the `index` variants in applyCommon.
 */
import { describe, it, expect } from 'vitest'
import mongoose from 'mongoose'
import type { SapphireSchemaNode } from '@ascendance-hub/sapphire-core'
import { toMongoSchema } from '../src'

describe('Mongo adapter — enum', () => {
  it('string enum → { type: String, enum: [...] }', () => {
    const node: SapphireSchemaNode = {
      kind: 'enum',
      required: true,
      values: ['a', 'b', 'c'],
    }
    expect(toMongoSchema(node)).toEqual({
      type: String,
      required: true,
      enum: ['a', 'b', 'c'],
    })
  })

  it('numeric enum → { type: Number, enum: [...] }', () => {
    const node: SapphireSchemaNode = {
      kind: 'enum',
      required: false,
      values: [1, 2, 3],
    }
    expect(toMongoSchema(node)).toEqual({
      type: Number,
      required: false,
      enum: [1, 2, 3],
    })
  })

  it('enum inside an object enforces the value set', () => {
    const node: SapphireSchemaNode = {
      kind: 'object',
      required: true,
      properties: {
        role: { kind: 'enum', required: true, values: ['admin', 'user'] },
      },
    }
    const schema = toMongoSchema(node) as mongoose.Schema
    const Model = mongoose.model('EnumEdge_' + Date.now(), schema)
    expect(new Model({ role: 'admin' }).validateSync()).toBeUndefined()
    expect(new Model({ role: 'ghost' }).validateSync()?.errors.role).toBeDefined()
  })
})

describe('Mongo adapter — applyCommon index variants', () => {
  it('index: true → def.index = true', () => {
    const node: SapphireSchemaNode = { kind: 'string', required: true, index: true }
    expect(toMongoSchema(node)).toMatchObject({ index: true })
  })

  it('index: { unique: true } → def.index = true and def.unique = true', () => {
    const node: SapphireSchemaNode = {
      kind: 'string',
      required: true,
      index: { unique: true },
    }
    expect(toMongoSchema(node)).toMatchObject({ index: true, unique: true })
  })

  it('index: { unique: false } → def.index = true, no unique', () => {
    const node: SapphireSchemaNode = {
      kind: 'string',
      required: true,
      index: { unique: false },
    }
    const out = toMongoSchema(node) as Record<string, unknown>
    expect(out.index).toBe(true)
    expect(out.unique).toBeUndefined()
  })
})
