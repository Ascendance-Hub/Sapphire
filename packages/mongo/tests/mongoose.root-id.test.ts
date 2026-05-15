import { describe, it, expect } from 'vitest'
import mongoose from 'mongoose'
import { Sapphire } from '@ascendance-hub/sapphire-core'
import { toMongoSchema } from '../src'

describe('Mongo adapter — root _id (I2)', () => {
  const a = new Sapphire()

  it('default: Mongoose auto-adds an ObjectId _id', () => {
    const User = a.object({ name: a.string() })
    const schema = toMongoSchema(User.toSchema()) as mongoose.Schema
    const idPath = schema.path('_id') as unknown as { instance: string } | undefined
    expect(idPath).toBeDefined()
    expect(idPath!.instance).toMatch(/^ObjectI[Dd]$/)
  })

  it('explicit _id: a.string() — Mongoose honors the declared string id', () => {
    const User = a.object({ _id: a.string(), name: a.string() })
    const schema = toMongoSchema(User.toSchema()) as mongoose.Schema
    const idPath = schema.path('_id') as unknown as { instance: string }
    expect(idPath.instance).toBe('String')
  })

  it('explicit string _id accepts a string and rejects nothing auto-generated', () => {
    const User = a.object({ _id: a.string(), name: a.string() })
    const schema = toMongoSchema(User.toSchema()) as mongoose.Schema
    const Model = mongoose.model('RootIdString_' + Date.now(), schema)
    const doc = new Model({ _id: 'user-123', name: 'Ana' })
    expect(doc.validateSync()).toBeUndefined()
    expect(doc._id).toBe('user-123')
  })

  it("rootId: 'none' — root document has no _id path", () => {
    const User = a.object({ name: a.string() })
    const schema = toMongoSchema(User.toSchema(), { rootId: 'none' }) as mongoose.Schema
    const idPath = schema.path('_id') as unknown as { instance: string } | undefined
    expect(idPath).toBeUndefined()
  })

  it("rootId: 'none' is ignored when the schema declares its own _id", () => {
    // A declared _id wins — 'none' must not strip a field the user asked for.
    const User = a.object({ _id: a.number(), name: a.string() })
    const schema = toMongoSchema(User.toSchema(), { rootId: 'none' }) as mongoose.Schema
    const idPath = schema.path('_id') as unknown as { instance: string }
    expect(idPath.instance).toBe('Number')
  })

  it("rootId: 'auto' is the explicit form of the default", () => {
    const User = a.object({ name: a.string() })
    const schema = toMongoSchema(User.toSchema(), { rootId: 'auto' }) as mongoose.Schema
    const idPath = schema.path('_id') as unknown as { instance: string }
    expect(idPath.instance).toMatch(/^ObjectI[Dd]$/)
  })

  it('subdoc _id stays independently controlled by subdocId', () => {
    const User = a.object({
      _id: a.string(),
      profile: a.object({ bio: a.string() }),
    })
    const schema = toMongoSchema(User.toSchema()) as mongoose.Schema
    // root _id is the declared string
    expect((schema.path('_id') as unknown as { instance: string }).instance).toBe('String')
    // subdoc still has _id:false by default
    const sub = schema.path('profile') as unknown as { schema: mongoose.Schema }
    expect(sub.schema.options._id).toBe(false)
  })
})
