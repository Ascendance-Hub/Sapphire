/**
 * Postgres integration — the emitted Drizzle table against a real database.
 *
 * The other `pg-*.test.ts` files introspect the emitted table config. This
 * file goes further: it materializes the table into an in-memory Postgres
 * (`pglite` — real Postgres compiled to WASM) via `drizzle-kit`'s push API and
 * round-trips real rows — proving the emitted column types and constraints
 * produce working DDL.
 */
import { describe, it, expect } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { drizzle, type PgliteDatabase } from 'drizzle-orm/pglite'
import { pushSchema } from 'drizzle-kit/api'
import { Sapphire } from '@ascendance-hub/sapphire-core'
import { toDrizzleSchema, DrizzleTableRegistry } from '../src'

/** Spin up a fresh in-memory Postgres and materialize `tables` into it. */
async function pgWith(
  tables: Record<string, unknown>,
): Promise<PgliteDatabase<Record<string, never>>> {
  const pglite = new PGlite()
  const db = drizzle(pglite)
  const pushed = await pushSchema(tables as Parameters<typeof pushSchema>[0], db)
  for (const stmt of pushed.statementsToExecute) await pglite.exec(stmt)
  return db
}

describe('pg integration — round-trip against a real database', () => {
  it('primitives round-trip through a real table', async () => {
    const a = new Sapphire()
    const node = a
      .object({ name: a.string(), email: a.string(), age: a.number().int().optional() })
      .name('items')
    const items = toDrizzleSchema(node.toSchema(), { dialect: 'pg', tableName: 'items' })
    const db = await pgWith({ items })

    await db.insert(items).values({ name: 'Ana', email: 'ana@example.com', age: 30 })
    const rows = (await db.select().from(items)) as Array<Record<string, unknown>>

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ name: 'Ana', email: 'ana@example.com', age: 30 })
  })

  it('the implicit id primary key is assigned by the database', async () => {
    const a = new Sapphire()
    const node = a.object({ name: a.string() }).name('items')
    const items = toDrizzleSchema(node.toSchema(), { dialect: 'pg', tableName: 'items' })
    const db = await pgWith({ items })

    await db.insert(items).values({ name: 'first' })
    await db.insert(items).values({ name: 'second' })
    const rows = (await db.select().from(items)) as Array<{ id: number }>

    expect(rows.map((r) => r.id)).toEqual([1, 2])
  })

  it('a NOT NULL column rejects a missing required value', async () => {
    const a = new Sapphire()
    const node = a.object({ name: a.string(), email: a.string() }).name('items')
    const items = toDrizzleSchema(node.toSchema(), { dialect: 'pg', tableName: 'items' })
    const db = await pgWith({ items })

    // `name` is required → a NOT NULL column; omitting it must fail at the DB.
    await expect(async () => {
      await db.insert(items).values({ email: 'x@y.com' })
    }).rejects.toThrow()
  })

  it('an optional column accepts an omitted value', async () => {
    const a = new Sapphire()
    const node = a.object({ name: a.string(), age: a.number().int().optional() }).name('items')
    const items = toDrizzleSchema(node.toSchema(), { dialect: 'pg', tableName: 'items' })
    const db = await pgWith({ items })

    await db.insert(items).values({ name: 'Ana' })
    const rows = (await db.select().from(items)) as Array<{ age: number | null }>
    expect(rows[0]!.age).toBeNull()
  })

  it('a unique column rejects a duplicate value', async () => {
    const a = new Sapphire()
    const node = a.object({ email: a.string().unique() }).name('items')
    const items = toDrizzleSchema(node.toSchema(), { dialect: 'pg', tableName: 'items' })
    const db = await pgWith({ items })

    await db.insert(items).values({ email: 'dup@example.com' })
    await expect(async () => {
      await db.insert(items).values({ email: 'dup@example.com' })
    }).rejects.toThrow()
  })

  it('a ref emits an FK column that round-trips', async () => {
    const a = new Sapphire()
    const tables = new DrizzleTableRegistry()
    const userNode = a.object({ name: a.string() }).name('User')
    const postNode = a.object({ title: a.string(), author: a.ref('User') }).name('Post')
    const users = toDrizzleSchema(userNode.toSchema(), {
      dialect: 'pg',
      tableName: 'users',
      tables,
    })
    const posts = toDrizzleSchema(postNode.toSchema(), {
      dialect: 'pg',
      tableName: 'posts',
      tables,
    })
    const db = await pgWith({ users, posts })

    await db.insert(users).values({ name: 'Ana' })
    const [user] = (await db.select().from(users)) as Array<{ id: number }>
    await db.insert(posts).values({ title: 'Hello', author: user!.id })
    const [post] = (await db.select().from(posts)) as Array<{ author: number }>

    expect(post!.author).toBe(user!.id)
  })

  it('a composite primary key rejects a duplicate (articleId, version) pair', async () => {
    const a = new Sapphire()
    const node = a.object({
      articleId: a.number().int(),
      version: a.number().int(),
      summary: a.string(),
    })
    const revisions = toDrizzleSchema(node.toSchema(), {
      dialect: 'pg',
      tableName: 'revisions',
      primaryKey: ['articleId', 'version'],
    } as never)
    const db = await pgWith({ revisions })

    await db.insert(revisions).values({ articleId: 10, version: 1, summary: 'draft' })
    // same articleId, different version → allowed by the composite PK
    await db.insert(revisions).values({ articleId: 10, version: 2, summary: 'edit' })
    // exact (articleId, version) duplicate → rejected
    await expect(async () => {
      await db.insert(revisions).values({ articleId: 10, version: 1, summary: 'dup' })
    }).rejects.toThrow()
    const rows = await db.select().from(revisions)
    expect(rows).toHaveLength(2)
  })
})
