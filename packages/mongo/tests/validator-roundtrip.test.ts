import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { MongoClient, type Db } from 'mongodb'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { Sapphire } from '@ascendance-hub/sapphire-core'
import { toMongoValidator } from '../src'

const a = new Sapphire()

let server: MongoMemoryServer
let client: MongoClient
let db: Db

beforeAll(async () => {
  server = await MongoMemoryServer.create()
  client = new MongoClient(server.getUri())
  await client.connect()
  db = client.db('test')
}, 120_000)

afterAll(async () => {
  await client?.close()
  await server?.stop()
})

describe('toMongoValidator — round-trip against MongoDB', () => {
  it('accepts a valid document and rejects invalid ones', async () => {
    const User = a.object({
      name: a.string().min(2),
      age: a.number().int().min(0),
    })
    const validator = toMongoValidator(User.toSchema())

    await db.createCollection('users', { validator })
    const users = db.collection('users')

    await expect(users.insertOne({ name: 'Ana', age: 30 })).resolves.toBeTruthy()
    await expect(users.insertOne({ name: 'A', age: 30 })).rejects.toThrow()
    await expect(users.insertOne({ name: 'Ana', age: -1 })).rejects.toThrow()
  })

  it('enforces required fields server-side', async () => {
    const Post = a.object({ title: a.string(), body: a.string().optional() })
    await db.createCollection('posts', { validator: toMongoValidator(Post.toSchema()) })
    const posts = db.collection('posts')

    await expect(posts.insertOne({ title: 'Hi' })).resolves.toBeTruthy()
    await expect(posts.insertOne({ body: 'no title' })).rejects.toThrow()
  })
})
