// Pinned snippets for docs/concepts/refs-and-relations.md. Each block below is
// the exact code shown in that doc. If the API changes, this test fails and
// the doc is explicitly marked as wrong instead of silently rotting.
import { describe, it, expect } from 'vitest'
import mongoose from 'mongoose'
import { Sapphire, registerAdapter } from '@ascendance-hub/sapphire-core'
import { toMongooseSchema } from '@ascendance-hub/sapphire-mongoose'
import { toJsonSchema } from '@ascendance-hub/sapphire-json-schema'

describe('docs/concepts/refs-and-relations.md — snippet pinning', () => {
  it('naming — .name(...) registers the schema in the instance', () => {
    // --- snippet: name registers the schema ---
    const a = new Sapphire()

    const User = a
      .object({
        email: a.string().email(),
      })
      .name('User')

    a.listNamedSchemas() // ['User']
    // --- end snippet ---

    expect(a.listNamedSchemas()).toEqual(['User'])
    expect(User.toSchema()).toMatchObject({ kind: 'object', name: 'User' })
  })

  it('a.ref(SchemaObj) — typesafe ref, requires .name() set first', () => {
    // --- snippet: ref by schema object ---
    const a = new Sapphire()

    const User = a
      .object({
        email: a.string().email(),
      })
      .name('User')

    const Post = a.object({
      title: a.string(),
      author: a.ref(User),
    })
    // --- end snippet ---

    const node = Post.toSchema()
    expect(node).toMatchObject({
      kind: 'object',
      properties: {
        author: { kind: 'ref', target: 'User' },
      },
    })
  })

  it('a.ref(SchemaObj) throws when the target has no .name() set', () => {
    // --- snippet: ref without name throws ---
    const a = new Sapphire()

    const Untitled = a.object({ x: a.string() })
    // No .name() call — ref will throw at construction time:
    expect(() => a.ref(Untitled)).toThrow(/requires schema\.name/)
    // --- end snippet ---
  })

  it('a.ref(name) — string ref resolves lazily (cycle-friendly)', () => {
    // --- snippet: ref by string ---
    const a = new Sapphire()

    const Post = a
      .object({
        title: a.string(),
        author: a.ref('User'), // 'User' not yet registered — fine, lazy.
      })
      .name('Post')

    const User = a
      .object({
        email: a.string().email(),
        latestPost: a.ref('Post'), // cycle: User <-> Post
      })
      .name('User')
    // --- end snippet ---

    expect(a.listNamedSchemas().sort()).toEqual(['Post', 'User'])
    expect(Post.toSchema()).toMatchObject({
      properties: { author: { kind: 'ref', target: 'User' } },
    })
    expect(User.toSchema()).toMatchObject({
      properties: { latestPost: { kind: 'ref', target: 'Post' } },
    })
  })

  it('mongo adapter — refs emit { type: ObjectId, ref: Name }', () => {
    registerAdapter('mongoose', toMongooseSchema)
    const a = new Sapphire({ defaultAdapter: 'mongoose' })

    const User = a.object({ email: a.string().email() }).name('User')
    const Post = a.object({
      title: a.string(),
      author: a.ref(User),
    })

    const schema = Post.getSchema() as mongoose.Schema
    const authorPath = schema.path('author') as unknown as {
      instance: string
      options: { ref: string }
    }
    expect(authorPath.instance).toMatch(/^ObjectI[Dd]$/)
    expect(authorPath.options.ref).toBe('User')
  })

  it('json-schema adapter — refs emit $ref, named schemas collected into $defs', () => {
    const a = new Sapphire()

    const User = a.object({ email: a.string().email() }).name('User')
    const Post = a.object({
      title: a.string(),
      author: a.ref(User),
    })

    // Pass User via options.defs so collectNamed sees it (Post only carries a
    // ref, which doesn't traverse into the target — see docs/concepts/refs).
    const out = toJsonSchema(Post.toSchema(), { defs: { User: User.toSchema() } }) as {
      properties: { author: { $ref: string } }
      $defs: Record<string, unknown>
    }
    expect(out.properties.author).toEqual({ $ref: '#/$defs/User' })
    expect(out.$defs.User).toBeDefined()
  })

  it('named schemas are unique per Sapphire instance', () => {
    // --- snippet: name collision throws ---
    const a = new Sapphire()
    a.object({ x: a.string() }).name('User')
    expect(() => a.object({ y: a.string() }).name('User')).toThrow(/already registered/)
    // --- end snippet ---
  })
})
