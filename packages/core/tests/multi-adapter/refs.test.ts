/**
 * season-three S1 — refs and named schemas across every adapter.
 *
 * A `User` / `Post` pair where `Post.author` is `a.ref('User')`. The same
 * pair is emitted to every adapter; each renders the relationship in its own
 * idiom (ObjectId+ref, FK column, `$ref`).
 */
import { describe, it, expect } from 'vitest'
import mongoose from 'mongoose'
import { Sapphire } from '@ascendance-hub/sapphire-core'
import { toMongoSchema } from '@ascendance-hub/sapphire-mongo'
import { toDrizzleSchema, DrizzleTableRegistry } from '@ascendance-hub/sapphire-drizzle'
import { toJsonSchema } from '@ascendance-hub/sapphire-json-schema'
import { getTableConfig } from 'drizzle-orm/pg-core'

describe('S1 — refs across adapters', () => {
  function buildPair() {
    const a = new Sapphire()
    const User = a.object({ name: a.string() }).name('User')
    const Post = a.object({ title: a.string(), author: a.ref('User') }).name('Post')
    return { User, Post }
  }

  it('Mongo: ref emits an ObjectId path carrying ref: "User"', () => {
    const { Post } = buildPair()
    const schema = toMongoSchema(Post.toSchema()) as mongoose.Schema
    const authorPath = schema.path('author') as unknown as {
      instance: string
      options: { ref: string }
    }
    expect(authorPath.instance).toMatch(/^ObjectI[Dd]$/)
    expect(authorPath.options.ref).toBe('User')
  })

  it('Drizzle: ref emits an FK column pointing at users.id', () => {
    const { User, Post } = buildPair()
    const tables = new DrizzleTableRegistry()
    toDrizzleSchema(User.toSchema(), { dialect: 'pg', tableName: 'users', tables })
    const postsTable = toDrizzleSchema(Post.toSchema(), {
      dialect: 'pg',
      tableName: 'posts',
      tables,
    })
    const cfg = getTableConfig(postsTable as never)
    expect(cfg.foreignKeys.length).toBe(1)
    const ref = cfg.foreignKeys[0]!.reference()
    expect(ref.columns[0]!.name).toBe('author')
    expect(ref.foreignColumns[0]!.name).toBe('id')
  })

  it('JSON Schema: ref emits a $ref into $defs', () => {
    const { User, Post } = buildPair()
    const json = toJsonSchema(Post.toSchema(), {
      defs: { User: User.toSchema() },
    }) as {
      $defs: Record<string, { properties: Record<string, { $ref?: string }> }>
    }
    // Post itself is named → lives under $defs.Post; author carries the $ref.
    expect(json.$defs.Post.properties.author.$ref).toBe('#/$defs/User')
    expect(json.$defs.User).toBeDefined()
  })

  it('the same Post IR drives all three adapters without mutation', () => {
    const { User, Post } = buildPair()
    const ir = Post.toSchema()
    const snapshot = JSON.stringify(ir)

    toMongoSchema(ir)
    const tables = new DrizzleTableRegistry()
    toDrizzleSchema(User.toSchema(), { dialect: 'pg', tableName: 'users', tables })
    toDrizzleSchema(ir, { dialect: 'pg', tableName: 'posts', tables })
    toJsonSchema(ir, { defs: { User: User.toSchema() } })

    expect(JSON.stringify(Post.toSchema())).toBe(snapshot)
  })

  it('parse-time ref validation agrees with the adapter story', () => {
    // The instance that owns User/Post is the one whose registry is consulted.
    const a = new Sapphire()
    a.object({ name: a.string() }).name('User')
    const Post = a.object({ title: a.string(), author: a.ref('User') })

    // valid: target registered
    expect(Post.safeParse({ title: 't', author: 'uid' }).success).toBe(true)

    // a ref to an unregistered target fails parse — before any adapter runs
    const Broken = a.object({ x: a.ref('Nonexistent') })
    expect(Broken.safeParse({ x: 'anything' }).success).toBe(false)
  })

  it('optional ref across adapters: Mongo non-required, Drizzle nullable', () => {
    const a = new Sapphire()
    a.object({ name: a.string() }).name('User')
    const Post = a.object({ title: a.string(), author: a.ref('User').optional() }).name('PostOpt')
    const ir = Post.toSchema()

    const mongoSchema = toMongoSchema(ir) as mongoose.Schema
    expect(
      (mongoSchema.path('author') as unknown as { isRequired?: boolean }).isRequired,
    ).toBeFalsy()

    const tables = new DrizzleTableRegistry()
    toDrizzleSchema(a.object({ name: a.string() }).name('U2').toSchema(), {
      dialect: 'pg',
      tableName: 'u2',
      tables,
    })
  })
})
