/**
 * season-five review B2 — when a schema declares its own field at the
 * implicit primary-key name, the adapter emitted `serial(pkName).primaryKey()`
 * first and then let the property loop silently overwrite that column,
 * leaving the table with NO primary key (and a `tables` registry entry that
 * lied about the PK name). The user-declared field must become the PK.
 */
import { describe, it, expect } from 'vitest'
import { getTableConfig as pgConfig } from 'drizzle-orm/pg-core'
import { getTableConfig as mysqlConfig } from 'drizzle-orm/mysql-core'
import { getTableConfig as sqliteConfig } from 'drizzle-orm/sqlite-core'
import { Sapphire } from '@ascendance-hub/sapphire-core'
import { toDrizzleSchema } from '../src'

const a = new Sapphire()

describe('B2 — user-declared primary key is not clobbered', () => {
  it('pg: a declared `id` field becomes the primary key', () => {
    const User = a.object({ id: a.string(), name: a.string() })
    const table = toDrizzleSchema(User.toSchema(), { dialect: 'pg', tableName: 'users' })
    const cfg = pgConfig(table as never)
    expect(cfg.columns.filter((c) => c.primary).map((c) => c.name)).toEqual(['id'])
    // it is the user's text column — not an injected serial
    const idCol = cfg.columns.find((c) => c.name === 'id')
    expect(idCol?.columnType).toBe('PgText')
  })

  it('pg: implicit serial PK still works when no `id` is declared', () => {
    const Post = a.object({ title: a.string() })
    const table = toDrizzleSchema(Post.toSchema(), { dialect: 'pg', tableName: 'posts' })
    const cfg = pgConfig(table as never)
    expect(cfg.columns.filter((c) => c.primary).map((c) => c.name)).toEqual(['id'])
  })

  it('pg: primaryKey:false plus a declared `id` leaves `id` a plain column', () => {
    const User = a.object({ id: a.string() })
    const table = toDrizzleSchema(User.toSchema(), {
      dialect: 'pg',
      tableName: 'u',
      primaryKey: false,
    })
    const cfg = pgConfig(table as never)
    expect(cfg.columns.filter((c) => c.primary)).toHaveLength(0)
  })

  it('mysql: a declared `id` field becomes the primary key', () => {
    const User = a.object({ id: a.string(), name: a.string() })
    const table = toDrizzleSchema(User.toSchema(), { dialect: 'mysql', tableName: 'users' })
    const cfg = mysqlConfig(table as never)
    expect(cfg.columns.filter((c) => c.primary).map((c) => c.name)).toEqual(['id'])
  })

  it('sqlite: a declared `id` field becomes the primary key', () => {
    const User = a.object({ id: a.string(), name: a.string() })
    const table = toDrizzleSchema(User.toSchema(), { dialect: 'sqlite', tableName: 'users' })
    const cfg = sqliteConfig(table as never)
    expect(cfg.columns.filter((c) => c.primary).map((c) => c.name)).toEqual(['id'])
  })

  it('a custom primaryKey name is honored when user-declared', () => {
    const User = a.object({ uuid: a.string(), name: a.string() })
    const table = toDrizzleSchema(User.toSchema(), {
      dialect: 'pg',
      tableName: 'users',
      primaryKey: 'uuid',
    })
    const cfg = pgConfig(table as never)
    expect(cfg.columns.filter((c) => c.primary).map((c) => c.name)).toEqual(['uuid'])
  })
})
