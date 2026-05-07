import { describe, it, expect } from 'vitest'
import mongoose from 'mongoose'
import { Sapphire } from '@ascendance-hub/sapphire-core'
import { toMongoSchema } from '../src'

describe('Mongo adapter — schema-level options', () => {
  const a = new Sapphire({ defaultAdapter: 'mongo' })

  it('timestamps() materializa { timestamps: true } no Schema', () => {
    const User = a.object({ name: a.string() }).timestamps()
    const schema = toMongoSchema(User.toSchema()) as mongoose.Schema
    expect((schema as any).$timestamps).toBeDefined()
    // mongoose stores timestamps option on schema.options.timestamps
    expect(schema.get('timestamps')).toBe(true)
  })

  it('index(keys, opts) materializa via schema.index()', () => {
    const User = a
      .object({
        email: a.string(),
        createdAt: a.date(),
      })
      .index(['email', 'createdAt'], { unique: true })
    const schema = toMongoSchema(User.toSchema()) as mongoose.Schema
    const indexes = schema.indexes()
    // composite index aparece em schema.indexes() como [fields, options]
    const composite = indexes.find(
      ([fields]) => fields.email !== undefined && fields.createdAt !== undefined,
    )
    expect(composite).toBeDefined()
    expect(composite![1]?.unique).toBe(true)
  })

  it('múltiplos indexes acumulam', () => {
    const Post = a
      .object({
        slug: a.string(),
        author: a.string(),
        createdAt: a.date(),
      })
      .index(['slug'], { unique: true })
      .index(['author', 'createdAt'])
    const schema = toMongoSchema(Post.toSchema()) as mongoose.Schema
    const indexes = schema.indexes()
    const slugIdx = indexes.find(([fields]) => fields.slug !== undefined && !fields.author)
    const authorIdx = indexes.find(
      ([fields]) => fields.author !== undefined && fields.createdAt !== undefined,
    )
    expect(slugIdx).toBeDefined()
    expect(slugIdx![1]?.unique).toBe(true)
    expect(authorIdx).toBeDefined()
    expect(authorIdx![1]?.unique).toBeUndefined()
  })

  it('subdoc nested usa _id: false por default', () => {
    const Doc = a.object({
      meta: a.object({
        createdAt: a.date(),
      }),
    })
    const schema = toMongoSchema(Doc.toSchema()) as mongoose.Schema
    const sub = schema.path('meta') as any
    expect(sub.schema.options._id).toBe(false)
  })

  it('subdocId: true no MongoAdapterOptions repassa pro nested', () => {
    const Doc = a.object({
      meta: a.object({ createdAt: a.date() }),
    })
    const schema = toMongoSchema(Doc.toSchema(), { subdocId: true }) as mongoose.Schema
    const sub = schema.path('meta') as any
    expect(sub.schema.options._id).toBe(true)
  })

  it('top-level objeto sem timestamps/indexes não polui Schema options', () => {
    const Bare = a.object({ name: a.string() })
    const schema = toMongoSchema(Bare.toSchema()) as mongoose.Schema
    expect(schema.get('timestamps')).toBeUndefined()
    expect(schema.indexes().length).toBe(0)
  })
})
