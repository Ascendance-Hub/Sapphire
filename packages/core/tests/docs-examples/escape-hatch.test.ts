// Pinned snippets for docs/concepts/escape-hatch.md.
import { describe, it, expect } from 'vitest'
import mongoose from 'mongoose'
import { Sapphire, type SapphireSchemaNode } from '@ascendance-hub/sapphire-core'
import { toMongoSchema } from '@ascendance-hub/sapphire-mongo'
import { toJsonSchema } from '@ascendance-hub/sapphire-json-schema'
import { toDrizzleSchema, DrizzleTableRegistry } from '@ascendance-hub/sapphire-drizzle'

describe('docs/concepts/escape-hatch.md — snippet pinning', () => {
  it('.adapter(name, opts) — values land in node.meta[name]', () => {
    // --- snippet: meta storage ---
    const a = new Sapphire()
    const name = a
      .string()
      .adapter('mongo', { sparse: true })
      .adapter('json-schema', { 'x-internal': true })

    const node = name.toSchema() as SapphireSchemaNode
    // node.meta === { mongo: { sparse: true }, 'json-schema': { 'x-internal': true } }
    // --- end snippet ---

    expect(node.meta).toEqual({
      mongo: { sparse: true },
      'json-schema': { 'x-internal': true },
    })
  })

  it('mongo — meta.mongo merges last and overrides Sapphire-derived keys (except blacklisted)', () => {
    // --- snippet: mongo escape hatch ---
    const a = new Sapphire()
    const user = a.object({
      email: a.string().adapter('mongo', { sparse: true, collation: { locale: 'en' } }),
    })
    const schema = toMongoSchema(user.toSchema()) as mongoose.Schema
    const path = schema.path('email') as unknown as {
      options: { sparse?: boolean; collation?: { locale: string }; type: unknown }
    }
    // path.options.sparse === true and collation propagated; `type` cannot be overridden.
    // --- end snippet ---

    expect(path.options.sparse).toBe(true)
    expect(path.options.collation).toEqual({ locale: 'en' })
    expect(path.options.type).toBe(String) // blacklisted — escape-hatch can't override
  })

  it('json-schema — meta passthrough merges; type and $ref are blacklisted', () => {
    // --- snippet: json-schema escape hatch ---
    const a = new Sapphire()
    const name = a.string().adapter('json-schema', {
      title: 'User Name',
      examples: ['Ada Lovelace'],
      type: 'integer', // ignored — blacklisted
      $ref: '#/nope', // ignored — blacklisted
    })

    const out = toJsonSchema(name.toSchema()) as Record<string, unknown>
    // out.title === 'User Name'; out.examples preserved; out.type still 'string'
    // --- end snippet ---

    expect(out.title).toBe('User Name')
    expect(out.examples).toEqual(['Ada Lovelace'])
    expect(out.type).toBe('string')
    expect(out.$ref).toBeUndefined()
  })

  it('drizzle — typo in method name is silently ignored', () => {
    // --- snippet: drizzle silent skip ---
    const a = new Sapphire()
    const user = a
      .object({
        name: a.string().adapter('drizzle', { uniqe: true }), // typo: should be 'unique'
      })
      .name('users')

    const tables = new DrizzleTableRegistry()
    const table = toDrizzleSchema(user.toSchema(), { dialect: 'pg', tables }) as Record<
      string,
      { isUnique?: boolean }
    >
    // table.name.isUnique is NOT true — the typo'd method silently no-op'd
    // --- end snippet ---

    expect(table.name.isUnique).not.toBe(true)
  })

  it('drizzle — per-dialect sub-keys (pg/mysql/sqlite) apply only to that dialect', () => {
    // --- snippet: drizzle dialect sub-key ---
    const a = new Sapphire()
    const user = a
      .object({
        name: a.string().adapter('drizzle', {
          pg: { unique: true }, // only applied under dialect: 'pg'
          mysql: { unique: false },
        }),
      })
      .name('users')

    const pgTable = toDrizzleSchema(user.toSchema(), {
      dialect: 'pg',
      tables: new DrizzleTableRegistry(),
    }) as Record<string, { isUnique?: boolean }>
    // --- end snippet ---

    expect(pgTable.name.isUnique).toBe(true)
  })
})
