import { describe, it, expect } from 'vitest'
import { Sapphire } from '@ascendance-hub/sapphire-core'
import { getTableConfig as getPgConfig } from 'drizzle-orm/pg-core'
import { getTableConfig as getMysqlConfig } from 'drizzle-orm/mysql-core'
import { getTableConfig as getSqliteConfig } from 'drizzle-orm/sqlite-core'
import { toDrizzleSchema, DrizzleTableRegistry } from '../src'

// B2: refs must consult the target's actual PK column, not hardcoded 'id'.
// Pre-fix: ref callback returned `target['id']` even when target was emitted
// with `primaryKey: false` (column not present) or with a renamed PK.

describe('B2 — ref target PK tracking (all dialects)', () => {
  describe('pg', () => {
    it('primaryKey:false target → ref callback throws with clear message', () => {
      const a = new Sapphire()
      const User = a.object({ name: a.string() }).name('User')
      const Post = a.object({ title: a.string(), author: a.ref('User') }).name('Post')
      const tables = new DrizzleTableRegistry()

      toDrizzleSchema(User.toSchema(), {
        dialect: 'pg',
        tableName: 'users',
        primaryKey: false,
        tables,
      })
      const postsTable = toDrizzleSchema(Post.toSchema(), {
        dialect: 'pg',
        tableName: 'posts',
        tables,
      }) as any

      const cfg = getPgConfig(postsTable)
      expect(() => cfg.foreignKeys[0]!.reference()).toThrow(/primaryKey: false/)
    })

    it('primaryKey:"uuid" target → ref points at target.uuid', () => {
      const a = new Sapphire()
      const User = a.object({ name: a.string() }).name('User')
      const Post = a.object({ title: a.string(), author: a.ref('User') }).name('Post')
      const tables = new DrizzleTableRegistry()

      toDrizzleSchema(User.toSchema(), {
        dialect: 'pg',
        tableName: 'users',
        primaryKey: 'uuid',
        tables,
      })
      const postsTable = toDrizzleSchema(Post.toSchema(), {
        dialect: 'pg',
        tableName: 'posts',
        primaryKey: 'uuid',
        tables,
      }) as any

      const cfg = getPgConfig(postsTable)
      const ref = cfg.foreignKeys[0]!.reference()
      expect(ref.foreignColumns[0]!.name).toBe('uuid')
    })

    it('cycle with renamed PKs → both refs resolve at their respective PKs', () => {
      const a = new Sapphire()
      const User = a
        .object({ name: a.string(), favoritePost: a.ref('Post').optional() })
        .name('User')
      const Post = a.object({ title: a.string(), author: a.ref('User') }).name('Post')
      const tables = new DrizzleTableRegistry()

      const usersTable = toDrizzleSchema(User.toSchema(), {
        dialect: 'pg',
        tableName: 'users',
        primaryKey: 'pk',
        tables,
      }) as any
      const postsTable = toDrizzleSchema(Post.toSchema(), {
        dialect: 'pg',
        tableName: 'posts',
        primaryKey: 'pk',
        tables,
      }) as any

      const userRef = getPgConfig(usersTable).foreignKeys[0]!.reference()
      const postRef = getPgConfig(postsTable).foreignKeys[0]!.reference()
      expect(userRef.foreignColumns[0]!.name).toBe('pk')
      expect(postRef.foreignColumns[0]!.name).toBe('pk')
    })
  })

  describe('mysql', () => {
    it('primaryKey:false target → ref callback throws', () => {
      const a = new Sapphire()
      const User = a.object({ name: a.string() }).name('User')
      const Post = a.object({ title: a.string(), author: a.ref('User') }).name('Post')
      const tables = new DrizzleTableRegistry()

      toDrizzleSchema(User.toSchema(), {
        dialect: 'mysql',
        tableName: 'users',
        primaryKey: false,
        tables,
      })
      const postsTable = toDrizzleSchema(Post.toSchema(), {
        dialect: 'mysql',
        tableName: 'posts',
        tables,
      }) as any

      const cfg = getMysqlConfig(postsTable)
      expect(() => cfg.foreignKeys[0]!.reference()).toThrow(/primaryKey: false/)
    })

    it('primaryKey:"pk" target → ref points at target.pk', () => {
      const a = new Sapphire()
      const User = a.object({ name: a.string() }).name('User')
      const Post = a.object({ title: a.string(), author: a.ref('User') }).name('Post')
      const tables = new DrizzleTableRegistry()

      toDrizzleSchema(User.toSchema(), {
        dialect: 'mysql',
        tableName: 'users',
        primaryKey: 'pk',
        tables,
      })
      const postsTable = toDrizzleSchema(Post.toSchema(), {
        dialect: 'mysql',
        tableName: 'posts',
        primaryKey: 'pk',
        tables,
      }) as any

      const cfg = getMysqlConfig(postsTable)
      const ref = cfg.foreignKeys[0]!.reference()
      expect(ref.foreignColumns[0]!.name).toBe('pk')
    })
  })

  describe('sqlite', () => {
    it('primaryKey:false target → ref callback throws', () => {
      const a = new Sapphire()
      const User = a.object({ name: a.string() }).name('User')
      const Post = a.object({ title: a.string(), author: a.ref('User') }).name('Post')
      const tables = new DrizzleTableRegistry()

      toDrizzleSchema(User.toSchema(), {
        dialect: 'sqlite',
        tableName: 'users',
        primaryKey: false,
        tables,
      })
      const postsTable = toDrizzleSchema(Post.toSchema(), {
        dialect: 'sqlite',
        tableName: 'posts',
        tables,
      }) as any

      const cfg = getSqliteConfig(postsTable)
      expect(() => cfg.foreignKeys[0]!.reference()).toThrow(/primaryKey: false/)
    })

    it('primaryKey:"pk" target → ref points at target.pk', () => {
      const a = new Sapphire()
      const User = a.object({ name: a.string() }).name('User')
      const Post = a.object({ title: a.string(), author: a.ref('User') }).name('Post')
      const tables = new DrizzleTableRegistry()

      toDrizzleSchema(User.toSchema(), {
        dialect: 'sqlite',
        tableName: 'users',
        primaryKey: 'pk',
        tables,
      })
      const postsTable = toDrizzleSchema(Post.toSchema(), {
        dialect: 'sqlite',
        tableName: 'posts',
        primaryKey: 'pk',
        tables,
      }) as any

      const cfg = getSqliteConfig(postsTable)
      const ref = cfg.foreignKeys[0]!.reference()
      expect(ref.foreignColumns[0]!.name).toBe('pk')
    })
  })
})
