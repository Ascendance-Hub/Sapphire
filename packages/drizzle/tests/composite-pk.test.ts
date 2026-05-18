import { describe, it, expect } from 'vitest'
import { Sapphire } from '@ascendance-hub/sapphire-core'
import { getTableConfig as pgConfig } from 'drizzle-orm/pg-core'
import { getTableConfig as mysqlConfig } from 'drizzle-orm/mysql-core'
import { getTableConfig as sqliteConfig } from 'drizzle-orm/sqlite-core'
import { toDrizzleSchema } from '../src'

const a = new Sapphire()

/**
 * Composite primary key — the `primaryKey` adapter option accepts a `string[]`.
 * Each named column must be a declared field; the adapter emits a table-level
 * `primaryKey({ columns })` via the third-arg callback of xTable, and no
 * implicit single-column PK.
 */
const configFor = { pg: pgConfig, mysql: mysqlConfig, sqlite: sqliteConfig } as const

describe('composite primary key', () => {
  for (const dialect of ['pg', 'mysql', 'sqlite'] as const) {
    it(`${dialect}: primaryKey: [a, b] emits a table-level composite PK`, () => {
      const node = a
        .object({
          articleId: a.number().int(),
          version: a.number().int(),
          summary: a.string(),
        })
        .toSchema()
      const t = toDrizzleSchema(node, {
        dialect,
        tableName: 'article_revisions',
        primaryKey: ['articleId', 'version'],
      } as never) as any
      const cfg = configFor[dialect](t)
      expect(cfg.primaryKeys).toHaveLength(1)
      expect(cfg.primaryKeys[0]!.columns.map((c: any) => c.name)).toEqual(['articleId', 'version'])
    })

    it(`${dialect}: a composite PK adds no implicit id column`, () => {
      const node = a
        .object({ articleId: a.number().int(), version: a.number().int() })
        .toSchema()
      const t = toDrizzleSchema(node, {
        dialect,
        tableName: 'r',
        primaryKey: ['articleId', 'version'],
      } as never) as any
      expect(t.id).toBeUndefined()
      // the columns are NOT individually primary — the PK is table-level
      const cfg = configFor[dialect](t)
      expect(cfg.columns.filter((c: any) => c.primary)).toHaveLength(0)
    })

    it(`${dialect}: a composite PK coexists with a composite index`, () => {
      const node = a
        .object({ articleId: a.number().int(), version: a.number().int(), summary: a.string() })
        .index(['summary'])
        .toSchema()
      const t = toDrizzleSchema(node, {
        dialect,
        tableName: 'r',
        primaryKey: ['articleId', 'version'],
      } as never) as any
      const cfg = configFor[dialect](t)
      expect(cfg.primaryKeys).toHaveLength(1)
      expect(cfg.indexes).toHaveLength(1)
    })
  }

  it('throws when a composite PK column is not a field in the schema', () => {
    const node = a.object({ articleId: a.number().int() }).toSchema()
    expect(() =>
      toDrizzleSchema(node, {
        dialect: 'pg',
        tableName: 'r',
        primaryKey: ['articleId', 'version'],
      } as never),
    ).toThrow(/version/)
  })

  it('throws when the composite PK array has fewer than 2 columns', () => {
    const node = a.object({ articleId: a.number().int() }).toSchema()
    expect(() =>
      toDrizzleSchema(node, {
        dialect: 'pg',
        tableName: 'r',
        primaryKey: ['articleId'],
      } as never),
    ).toThrow(/composite/)
  })
})
