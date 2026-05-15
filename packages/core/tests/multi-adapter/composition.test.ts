/**
 * season-three S2 — composition operations across every adapter.
 *
 * pick / omit / partial / required / extend / merge are well-tested at the
 * core level. These tests prove the composed schema also emits correctly to
 * each adapter — the case a user hits when they trim a schema for a public
 * DTO and persist it through Mongo / Drizzle / JSON Schema.
 *
 * Composed schemas are anonymous (composition does not carry `.name()`), so
 * JSON Schema emits inline `type: 'object'` rather than a `$ref`.
 */
import { describe, it, expect } from 'vitest'
import mongoose from 'mongoose'
import { Sapphire } from '@ascendance-hub/sapphire-core'
import { toMongooseSchema } from '@ascendance-hub/sapphire-mongoose'
import { toDrizzleSchema } from '@ascendance-hub/sapphire-drizzle'
import { toJsonSchema } from '@ascendance-hub/sapphire-json-schema'

function mongoKeys(schema: mongoose.Schema): string[] {
  return Object.keys((schema as unknown as { paths: Record<string, unknown> }).paths).filter(
    (k) => k !== '_id' && k !== '__v',
  )
}

function drizzleColumns(table: unknown): string[] {
  return Object.keys(table as Record<string, unknown>)
}

describe('S2 — composition across adapters', () => {
  const a = new Sapphire()
  const User = a.object({
    name: a.string(),
    age: a.number().int(),
    secret: a.string(),
  })

  describe('pick', () => {
    it('Mongo: picked schema has only the picked paths', () => {
      const ir = User.pick(['name', 'age']).toSchema()
      const schema = toMongooseSchema(ir) as mongoose.Schema
      expect(mongoKeys(schema).sort()).toEqual(['age', 'name'])
    })

    it('Drizzle: picked schema has only the picked columns', () => {
      const ir = User.pick(['name', 'age']).toSchema()
      const table = toDrizzleSchema(ir, { dialect: 'pg', tableName: 'picked' })
      const cols = drizzleColumns(table)
      expect(cols).toContain('name')
      expect(cols).toContain('age')
      expect(cols).not.toContain('secret')
    })

    it('JSON Schema: picked schema has only the picked properties', () => {
      const ir = User.pick(['name']).toSchema()
      const json = toJsonSchema(ir) as { properties: Record<string, unknown> }
      expect(Object.keys(json.properties)).toEqual(['name'])
    })
  })

  describe('omit', () => {
    it('Mongo: omitted key is gone', () => {
      const ir = User.omit(['secret']).toSchema()
      const schema = toMongooseSchema(ir) as mongoose.Schema
      expect(mongoKeys(schema)).not.toContain('secret')
    })

    it('Drizzle: omitted column is gone', () => {
      const ir = User.omit(['secret']).toSchema()
      const table = toDrizzleSchema(ir, { dialect: 'pg', tableName: 'omitted' })
      expect(drizzleColumns(table)).not.toContain('secret')
    })

    it('JSON Schema: omitted property is gone', () => {
      const ir = User.omit(['secret']).toSchema()
      const json = toJsonSchema(ir) as { properties: Record<string, unknown> }
      expect(Object.keys(json.properties).sort()).toEqual(['age', 'name'])
    })
  })

  describe('partial', () => {
    it('Mongo: every path is non-required after partial()', () => {
      const ir = User.partial().toSchema()
      const schema = toMongooseSchema(ir) as mongoose.Schema
      for (const key of mongoKeys(schema)) {
        const path = schema.path(key) as unknown as { isRequired?: boolean }
        expect(path.isRequired).toBeFalsy()
      }
    })

    it('Drizzle: every column is nullable after partial()', () => {
      const ir = User.partial().toSchema()
      const table = toDrizzleSchema(ir, { dialect: 'pg', tableName: 'patch' }) as Record<
        string,
        { notNull: boolean }
      >
      expect(table.name.notNull).toBe(false)
      expect(table.age.notNull).toBe(false)
    })

    it('JSON Schema: no required array after partial()', () => {
      const ir = User.partial().toSchema()
      const json = toJsonSchema(ir) as { required?: string[] }
      expect(json.required).toBeUndefined()
    })
  })

  describe('required (round-trips partial)', () => {
    it('Mongo: partial().required() re-tightens every path', () => {
      const ir = User.partial().required().toSchema()
      const schema = toMongooseSchema(ir) as mongoose.Schema
      for (const key of mongoKeys(schema)) {
        const path = schema.path(key) as unknown as { isRequired?: boolean }
        expect(path.isRequired).toBe(true)
      }
    })

    it('JSON Schema: partial().required() restores the full required array', () => {
      const ir = User.partial().required().toSchema()
      const json = toJsonSchema(ir) as { required: string[] }
      expect(json.required.sort()).toEqual(['age', 'name', 'secret'])
    })
  })

  describe('extend', () => {
    it('Mongo: extended key appears as a path', () => {
      const ir = User.extend({ role: a.string() }).toSchema()
      const schema = toMongooseSchema(ir) as mongoose.Schema
      expect(mongoKeys(schema)).toContain('role')
    })

    it('Drizzle: extended key appears as a column', () => {
      const ir = User.extend({ role: a.string() }).toSchema()
      const table = toDrizzleSchema(ir, { dialect: 'pg', tableName: 'extended' })
      expect(drizzleColumns(table)).toContain('role')
    })

    it('JSON Schema: extended key appears as a property', () => {
      const ir = User.extend({ role: a.string() }).toSchema()
      const json = toJsonSchema(ir) as { properties: Record<string, unknown> }
      expect(Object.keys(json.properties)).toContain('role')
    })

    it('extend with a modifier-carrying field propagates the modifier to Mongo', () => {
      const ir = User.extend({ slug: a.string().trim() }).toSchema()
      const schema = toMongooseSchema(ir) as mongoose.Schema
      const slug = schema.path('slug') as unknown as { options: { trim?: boolean } }
      expect(slug.options.trim).toBe(true)
    })
  })

  describe('merge', () => {
    it('Mongo: merged keys from both sides appear', () => {
      const Audit = a.object({ createdBy: a.string() })
      const ir = User.merge(Audit).toSchema()
      const schema = toMongooseSchema(ir) as mongoose.Schema
      const keys = mongoKeys(schema)
      expect(keys).toContain('name')
      expect(keys).toContain('createdBy')
    })

    it('JSON Schema: right-wins on key conflict survives the emit', () => {
      // Audit redefines `age` as a string — right wins.
      const Audit = a.object({ age: a.string() })
      const ir = User.merge(Audit).toSchema()
      const json = toJsonSchema(ir) as { properties: Record<string, { type: string }> }
      expect(json.properties.age.type).toBe('string')
    })

    it('Drizzle: merged schema emits all columns', () => {
      const Audit = a.object({ createdBy: a.string() })
      const ir = User.merge(Audit).toSchema()
      const table = toDrizzleSchema(ir, { dialect: 'pg', tableName: 'merged' })
      const cols = drizzleColumns(table)
      expect(cols).toContain('name')
      expect(cols).toContain('createdBy')
    })
  })
})
