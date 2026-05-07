import { describe, it, expect } from 'vitest'
import mongoose from 'mongoose'
import { Sapphire } from '@ascendance-hub/sapphire-core'
import { toMongoSchema } from '../src'

describe('Mongo adapter — .adapter("mongo", opts) escape hatch', () => {
  const a = new Sapphire({ defaultAdapter: 'mongo' })

  it('meta.mongo.sparse chega no SchemaType.options', () => {
    const obj = a.object({
      name: a.string().adapter('mongo', { sparse: true }),
    })
    const schema = toMongoSchema(obj.toSchema()) as mongoose.Schema
    const path = schema.path('name') as any
    expect(path.options.sparse).toBe(true)
  })

  it('meta.mongo.collation chega no SchemaType.options', () => {
    const collation = { locale: 'en', strength: 1 as const }
    const obj = a.object({
      name: a.string().adapter('mongo', { collation }),
    })
    const schema = toMongoSchema(obj.toSchema()) as mongoose.Schema
    const path = schema.path('name') as any
    expect(path.options.collation).toEqual(collation)
  })

  it('meta.mongo.collection no top-level vira Schema.options.collection', () => {
    const User = a.object({ name: a.string() }).adapter('mongo', { collection: 'people' })
    const schema = toMongoSchema(User.toSchema()) as mongoose.Schema
    expect(schema.get('collection')).toBe('people')
  })

  it('blacklist: meta.mongo NÃO sobrescreve type', () => {
    const obj = a.object({
      name: a.string().adapter('mongo', { type: Number }),
    })
    const schema = toMongoSchema(obj.toSchema()) as mongoose.Schema
    const path = schema.path('name') as any
    expect(path.instance).toBe('String')
  })

  it('blacklist: meta.mongo NÃO sobrescreve required', () => {
    const obj = a.object({
      name: a.string().adapter('mongo', { required: false }),
    })
    const schema = toMongoSchema(obj.toSchema()) as mongoose.Schema
    const path = schema.path('name') as any
    expect(path.isRequired).toBe(true)
  })

  it('description preservada em SchemaType.options', () => {
    const obj = a.object({
      bio: a.string().describe('User bio (max 280 chars)'),
    })
    const schema = toMongoSchema(obj.toSchema()) as mongoose.Schema
    const path = schema.path('bio') as any
    expect(path.options.description).toBe('User bio (max 280 chars)')
  })
})
