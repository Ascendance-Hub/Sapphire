/**
 * DB-backed integration — the emitted Mongoose schema against a real MongoDB.
 *
 * The sibling `round-trip.test.ts` proves the schema's *validation* logic via
 * in-process `validateSync()`. This file goes further: it connects Mongoose to
 * an in-memory MongoDB and exercises everything that only a real database can
 * prove — persistence, query round-trips, applied transforms, unique indexes,
 * `populate()`, timestamps, and custom `_id`s.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import mongoose, { type Model } from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { Sapphire, type Field } from '@ascendance-hub/sapphire-core'
import { toMongooseSchema } from '../src'
import { uniqueModelName } from './_setup'

const a = new Sapphire()
let server: MongoMemoryServer

beforeAll(async () => {
  server = await MongoMemoryServer.create()
  await mongoose.connect(server.getUri())
}, 120_000)

afterAll(async () => {
  await mongoose.disconnect()
  await server?.stop()
})

/** Build a Mongoose model from an object shape, on a unique model name. */
function modelFor(shape: Record<string, Field>): Model<any> {
  const schema = toMongooseSchema(a.object(shape).toSchema()) as mongoose.Schema
  return mongoose.model(uniqueModelName('IT'), schema)
}

describe('db-integration — validation on save', () => {
  it('string min/max — a valid doc saves, a too-short one is rejected', async () => {
    const M = modelFor({ name: a.string().min(2).max(6) })
    await expect(new M({ name: 'Ana' }).save()).resolves.toBeTruthy()
    await expect(new M({ name: 'A' }).save()).rejects.toThrow()
  })

  it('email format — valid saves, invalid rejected', async () => {
    const M = modelFor({ email: a.string().email() })
    await expect(new M({ email: 'user@example.com' }).save()).resolves.toBeTruthy()
    await expect(new M({ email: 'not-an-email' }).save()).rejects.toThrow()
  })

  it('regex — valid saves, invalid rejected', async () => {
    const M = modelFor({ code: a.string().regex(/^[A-Z]{3}$/) })
    await expect(new M({ code: 'ABC' }).save()).resolves.toBeTruthy()
    await expect(new M({ code: 'abc' }).save()).rejects.toThrow()
  })

  it('number int + min — valid saves, fractional/below-min rejected', async () => {
    const M = modelFor({ qty: a.number().int().min(10) })
    await expect(new M({ qty: 12 }).save()).resolves.toBeTruthy()
    await expect(new M({ qty: 5 }).save()).rejects.toThrow()
    await expect(new M({ qty: 12.5 }).save()).rejects.toThrow()
  })

  it('required — a missing field is rejected', async () => {
    const M = modelFor({ name: a.string() })
    await expect(new M({}).save()).rejects.toThrow()
  })

  it('enum — a value outside the set is rejected', async () => {
    const M = modelFor({ role: a.type().enum(['admin', 'user']) })
    await expect(new M({ role: 'user' }).save()).resolves.toBeTruthy()
    await expect(new M({ role: 'root' }).save()).rejects.toThrow()
  })

  it('tuple — a wrong-length array is rejected', async () => {
    const M = modelFor({ pair: a.tuple([a.string(), a.number()]) })
    await expect(new M({ pair: ['x', 1] }).save()).resolves.toBeTruthy()
    await expect(new M({ pair: ['x'] }).save()).rejects.toThrow()
  })
})

describe('db-integration — persistence round-trips', () => {
  it('a full document survives save → findById unchanged', async () => {
    const M = modelFor({ name: a.string(), age: a.number().int() })
    const saved = await new M({ name: 'Ana', age: 30 }).save()
    const fetched = await M.findById(saved._id).lean()
    expect(fetched).toMatchObject({ name: 'Ana', age: 30 })
  })

  it('transforms (trim/lowercase) are persisted, not just parsed', async () => {
    const M = modelFor({ slug: a.string().trim().toLowerCase() })
    const saved = await new M({ slug: '  HELLO ' }).save()
    const fetched = await M.findById(saved._id)
    expect(fetched!.get('slug')).toBe('hello')
  })

  it('a nested object is stored and read back as a subdocument', async () => {
    const M = modelFor({ profile: a.object({ city: a.string(), zip: a.string() }) })
    const saved = await new M({ profile: { city: 'Rio', zip: '20000' } }).save()
    const fetched = await M.findById(saved._id).lean<{ profile: { city: string } }>()
    expect(fetched!.profile.city).toBe('Rio')
  })

  it('an array field round-trips its items', async () => {
    const M = modelFor({ tags: a.array(a.string()) })
    const saved = await new M({ tags: ['a', 'b', 'c'] }).save()
    const fetched = await M.findById(saved._id).lean<{ tags: string[] }>()
    expect(fetched!.tags).toEqual(['a', 'b', 'c'])
  })

  it('a date field round-trips as a Date instance', async () => {
    const M = modelFor({ when: a.date() })
    const when = new Date('2026-05-15T00:00:00.000Z')
    const saved = await new M({ when }).save()
    const fetched = await M.findById(saved._id)
    expect(fetched!.get('when')).toBeInstanceOf(Date)
    expect((fetched!.get('when') as Date).toISOString()).toBe(when.toISOString())
  })
})

describe('db-integration — Mongoose-specific behaviour', () => {
  it('a declared string _id round-trips as the document id', async () => {
    const M = modelFor({ _id: a.string(), name: a.string() })
    await new M({ _id: 'user-1', name: 'Ana' }).save()
    const fetched = await M.findById('user-1')
    expect(fetched!.get('name')).toBe('Ana')
  })

  it('timestamps() makes Mongoose fill createdAt/updatedAt', async () => {
    const schema = toMongooseSchema(
      a.object({ name: a.string() }).timestamps().toSchema(),
    ) as mongoose.Schema
    const M = mongoose.model(uniqueModelName('TS'), schema)
    const saved = await new M({ name: 'x' }).save()
    expect(saved.get('createdAt')).toBeInstanceOf(Date)
    expect(saved.get('updatedAt')).toBeInstanceOf(Date)
  })

  it('a unique field is enforced by a real index — duplicates are rejected', async () => {
    const M = modelFor({ email: a.string().unique() })
    await M.init() // wait for the unique index to build
    await new M({ email: 'dup@example.com' }).save()
    await expect(new M({ email: 'dup@example.com' }).save()).rejects.toThrow()
  })

  it('a ref ObjectId path resolves through populate()', async () => {
    const userSchema = toMongooseSchema(
      a.object({ name: a.string() }).name('User').toSchema(),
    ) as mongoose.Schema
    const User = mongoose.models.User ?? mongoose.model('User', userSchema)
    const postSchema = toMongooseSchema(
      a.object({ title: a.string(), author: a.ref('User') }).toSchema(),
    ) as mongoose.Schema
    const Post = mongoose.model(uniqueModelName('Post'), postSchema)

    const author = await new User({ name: 'Ana' }).save()
    const post = await new Post({ title: 'Hello', author: author._id }).save()

    const populated = await Post.findById(post._id).populate<{ author: { name: string } }>('author')
    expect(populated!.author.name).toBe('Ana')
  })
})
