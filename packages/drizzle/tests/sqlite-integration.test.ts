/**
 * SQLite integration — the emitted Drizzle table against a real database.
 *
 * The other `sqlite-*.test.ts` files introspect the emitted table config. This
 * file goes further: it materializes the table into an in-memory SQLite (via
 * `drizzle-kit`'s push API) and round-trips real rows — proving the emitted
 * column types and constraints produce working DDL.
 */
import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { pushSQLiteSchema } from 'drizzle-kit/api'
import { Sapphire } from '@ascendance-hub/sapphire-core'
import { toDrizzleSchema, DrizzleTableRegistry } from '../src'

/**
 * Spin up a fresh in-memory SQLite, materialize `tables` via drizzle-kit's
 * generated DDL, and return the Drizzle handle. (`apply()` is bypassed — it
 * runs DDL through `.all()`, which better-sqlite3 rejects; the raw connection
 * runs the statements instead.)
 */
async function sqliteWith(
  tables: Record<string, unknown>,
): Promise<BetterSQLite3Database<Record<string, never>>> {
  const sqlite = new Database(':memory:')
  const db = drizzle(sqlite)
  const pushed = await pushSQLiteSchema(tables as Parameters<typeof pushSQLiteSchema>[0], db)
  for (const stmt of pushed.statementsToExecute) sqlite.exec(stmt)
  return db
}

describe('sqlite integration — round-trip against a real database', () => {
  it('primitives round-trip through a real table', async () => {
    const a = new Sapphire()
    const node = a
      .object({ name: a.string(), email: a.string(), age: a.number().int().optional() })
      .name('items')
    const items = toDrizzleSchema(node.toSchema(), { dialect: 'sqlite', tableName: 'items' })
    const db = await sqliteWith({ items })

    db.insert(items).values({ name: 'Ana', email: 'ana@example.com', age: 30 }).run()
    const rows = db.select().from(items).all() as Array<Record<string, unknown>>

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ name: 'Ana', email: 'ana@example.com', age: 30 })
  })

  it('the implicit id primary key is assigned by the database', async () => {
    const a = new Sapphire()
    const node = a.object({ name: a.string() }).name('items')
    const items = toDrizzleSchema(node.toSchema(), { dialect: 'sqlite', tableName: 'items' })
    const db = await sqliteWith({ items })

    db.insert(items).values({ name: 'first' }).run()
    db.insert(items).values({ name: 'second' }).run()
    const rows = db.select().from(items).all() as Array<{ id: number }>

    expect(rows.map((r) => r.id)).toEqual([1, 2])
  })

  it('a NOT NULL column rejects a missing required value', async () => {
    const a = new Sapphire()
    const node = a.object({ name: a.string(), email: a.string() }).name('items')
    const items = toDrizzleSchema(node.toSchema(), { dialect: 'sqlite', tableName: 'items' })
    const db = await sqliteWith({ items })

    // `name` is required → a NOT NULL column; omitting it must fail at the DB.
    expect(() => db.insert(items).values({ email: 'x@y.com' }).run()).toThrow()
  })

  it('an optional column accepts an omitted value', async () => {
    const a = new Sapphire()
    const node = a.object({ name: a.string(), age: a.number().int().optional() }).name('items')
    const items = toDrizzleSchema(node.toSchema(), { dialect: 'sqlite', tableName: 'items' })
    const db = await sqliteWith({ items })

    db.insert(items).values({ name: 'Ana' }).run()
    const rows = db.select().from(items).all() as Array<{ age: number | null }>
    expect(rows[0]!.age).toBeNull()
  })

  it('a unique column rejects a duplicate value', async () => {
    const a = new Sapphire()
    const node = a.object({ email: a.string().unique() }).name('items')
    const items = toDrizzleSchema(node.toSchema(), { dialect: 'sqlite', tableName: 'items' })
    const db = await sqliteWith({ items })

    db.insert(items).values({ email: 'dup@example.com' }).run()
    expect(() => db.insert(items).values({ email: 'dup@example.com' }).run()).toThrow()
  })

  it('a ref emits an FK column that round-trips', async () => {
    const a = new Sapphire()
    const tables = new DrizzleTableRegistry()
    const userNode = a.object({ name: a.string() }).name('User')
    const postNode = a.object({ title: a.string(), author: a.ref('User') }).name('Post')
    const users = toDrizzleSchema(userNode.toSchema(), {
      dialect: 'sqlite',
      tableName: 'users',
      tables,
    })
    const posts = toDrizzleSchema(postNode.toSchema(), {
      dialect: 'sqlite',
      tableName: 'posts',
      tables,
    })
    const db = await sqliteWith({ users, posts })

    db.insert(users).values({ name: 'Ana' }).run()
    const [user] = db.select().from(users).all() as Array<{ id: number }>
    db.insert(posts).values({ title: 'Hello', author: user!.id }).run()
    const [post] = db.select().from(posts).all() as Array<{ author: number }>

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
      dialect: 'sqlite',
      tableName: 'revisions',
      primaryKey: ['articleId', 'version'],
    } as never)
    const db = await sqliteWith({ revisions })

    db.insert(revisions).values({ articleId: 10, version: 1, summary: 'draft' }).run()
    // same articleId, different version → allowed by the composite PK
    db.insert(revisions).values({ articleId: 10, version: 2, summary: 'edit' }).run()
    // exact (articleId, version) duplicate → rejected
    expect(() =>
      db.insert(revisions).values({ articleId: 10, version: 1, summary: 'dup' }).run(),
    ).toThrow()
    expect(db.select().from(revisions).all()).toHaveLength(2)
  })
})
