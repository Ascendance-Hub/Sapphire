import { describe, it, expect } from 'vitest'
import { Sapphire } from '@ascendance-hub/sapphire-core'
import { getTableConfig } from 'drizzle-orm/mysql-core'
import { toDrizzleSchema, DrizzleTableRegistry } from '../src'

/**
 * FK walking in drizzle-orm ^0.45.2 mysql-core:
 *   import { getTableConfig } from 'drizzle-orm/mysql-core'
 *   const cfg = getTableConfig(table)
 *   cfg.foreignKeys[0].reference()  // invokes the lazy callback;
 *                                    // returns { columns, foreignTable, foreignColumns }
 */

describe('mysql refs', () => {
  it('basic ref → int column with references()', () => {
    const a = new Sapphire()
    const userSchema = a.object({ name: a.string() }).name('User')
    const postSchema = a.object({ title: a.string(), author: a.ref('User') }).name('Post')
    const tables = new DrizzleTableRegistry()
    toDrizzleSchema(userSchema.toSchema(), {
      dialect: 'mysql',
      tableName: 'users',
      tables,
    })
    const postsTable = toDrizzleSchema(postSchema.toSchema(), {
      dialect: 'mysql',
      tableName: 'posts',
      tables,
    }) as any

    expect(postsTable.author.columnType).toBe('MySqlInt')
    expect(postsTable.author.dataType).toBe('number')
    expect(postsTable.author.notNull).toBe(true)

    const cfg = getTableConfig(postsTable)
    expect(cfg.foreignKeys.length).toBe(1)
    const ref = cfg.foreignKeys[0]!.reference()
    expect(ref.columns[0]!.name).toBe('author')
    expect(ref.foreignColumns[0]!.name).toBe('id')
  })

  it('lazy resolution — build Post before User, resolve later', () => {
    const a = new Sapphire()
    const tables = new DrizzleTableRegistry()
    const postSchema = a.object({ title: a.string(), author: a.ref('User') }).name('Post')
    const postsTable = toDrizzleSchema(postSchema.toSchema(), {
      dialect: 'mysql',
      tableName: 'posts',
      tables,
    }) as any

    const userSchema = a.object({ name: a.string() }).name('User')
    toDrizzleSchema(userSchema.toSchema(), {
      dialect: 'mysql',
      tableName: 'users',
      tables,
    })

    const cfg = getTableConfig(postsTable)
    const ref = cfg.foreignKeys[0]!.reference()
    expect(ref.foreignColumns[0]!.name).toBe('id')
  })

  it('cycle (User ↔ Post) — both tables build, both refs resolve', () => {
    const a = new Sapphire()
    const userSchema = a
      .object({ name: a.string(), favoritePost: a.ref('Post').optional() })
      .name('User')
    const postSchema = a.object({ title: a.string(), author: a.ref('User') }).name('Post')
    const tables = new DrizzleTableRegistry()
    const usersTable = toDrizzleSchema(userSchema.toSchema(), {
      dialect: 'mysql',
      tableName: 'users',
      tables,
    }) as any
    const postsTable = toDrizzleSchema(postSchema.toSchema(), {
      dialect: 'mysql',
      tableName: 'posts',
      tables,
    }) as any

    const userCfg = getTableConfig(usersTable)
    const postCfg = getTableConfig(postsTable)
    expect(userCfg.foreignKeys.length).toBe(1)
    expect(postCfg.foreignKeys.length).toBe(1)

    const userRef = userCfg.foreignKeys[0]!.reference()
    const postRef = postCfg.foreignKeys[0]!.reference()
    expect(userRef.columns[0]!.name).toBe('favoritePost')
    expect(userRef.foreignColumns[0]!.name).toBe('id')
    expect(postRef.columns[0]!.name).toBe('author')
    expect(postRef.foreignColumns[0]!.name).toBe('id')
  })

  it('missing target → build succeeds, callback throws with name + "not registered"', () => {
    const a = new Sapphire()
    const postSchema = a.object({ title: a.string(), author: a.ref('Ghost') }).name('Post')
    const tables = new DrizzleTableRegistry()
    const postsTable = toDrizzleSchema(postSchema.toSchema(), {
      dialect: 'mysql',
      tableName: 'posts',
      tables,
    }) as any
    const cfg = getTableConfig(postsTable)
    expect(() => cfg.foreignKeys[0]!.reference()).toThrow(/Ghost/)
    expect(() => cfg.foreignKeys[0]!.reference()).toThrow(/not registered/)
  })
})
