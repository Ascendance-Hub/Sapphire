/**
 * season-three S1 — cross-adapter consistency.
 *
 * The library's headline promise is "one schema definition → many ORM
 * outputs". These tests define a schema ONCE and drive it through every
 * adapter in the same block, asserting (a) the source IR is identical for
 * each adapter call and (b) each adapter emits coherent, usable output.
 */
import { describe, it, expect } from 'vitest'
import mongoose from 'mongoose'
import { Sapphire } from '@ascendance-hub/sapphire-core'
import { toMongooseSchema } from '@ascendance-hub/sapphire-mongoose'
import { toMongoValidator } from '@ascendance-hub/sapphire-mongo'
import { toDrizzleSchema } from '@ascendance-hub/sapphire-drizzle'
import { toJsonSchema } from '@ascendance-hub/sapphire-json-schema'
import { getTableConfig } from 'drizzle-orm/pg-core'

describe('S1 — single definition, every adapter', () => {
  it('the source IR is stable across repeated toSchema() calls', () => {
    const a = new Sapphire()
    const User = a
      .object({
        name: a.string().min(2),
        age: a.number().int().min(0),
      })
      .name('User')
    const first = JSON.stringify(User.toSchema())
    const second = JSON.stringify(User.toSchema())
    const third = JSON.stringify(User.toSchema())
    expect(first).toBe(second)
    expect(second).toBe(third)
  })

  it('one User definition emits coherent Mongo + Drizzle + JSON Schema', () => {
    const a = new Sapphire()
    const User = a
      .object({
        name: a.string().min(2),
        age: a.number().int().min(0),
        email: a.string().email(),
      })
      .name('User')

    // single source — captured once, fed to all three adapters
    const ir = User.toSchema()

    // --- Mongoose ---
    const mongoSchema = toMongooseSchema(ir) as mongoose.Schema
    expect(mongoSchema).toBeInstanceOf(mongoose.Schema)
    expect((mongoSchema.path('name') as unknown as { instance: string }).instance).toBe('String')
    expect((mongoSchema.path('age') as unknown as { instance: string }).instance).toBe('Number')
    expect((mongoSchema.path('email') as unknown as { instance: string }).instance).toBe('String')

    // --- Drizzle (pg) ---
    const pgTable = toDrizzleSchema(ir, { dialect: 'pg', tableName: 'users' }) as Record<
      string,
      { columnType: string; notNull: boolean }
    >
    expect(pgTable.name.columnType).toBe('PgText')
    expect(pgTable.age.columnType).toBe('PgInteger')
    expect(pgTable.email.columnType).toBe('PgText')
    // every declared field is NOT NULL (all three are required)
    expect(pgTable.name.notNull).toBe(true)
    expect(pgTable.age.notNull).toBe(true)
    // implicit primary key exists
    const cfg = getTableConfig(pgTable as never)
    expect(cfg.columns.some((c) => c.name === 'id')).toBe(true)

    // --- JSON Schema ---
    // A `.name()`d object emits as a `$ref` into `$defs` — the named-schema
    // shape. The body lives under `$defs.User`.
    const json = toJsonSchema(ir) as {
      $ref: string
      $defs: Record<
        string,
        { type: string; properties: Record<string, { type: string }>; required: string[] }
      >
    }
    expect(json.$ref).toBe('#/$defs/User')
    const body = json.$defs.User
    expect(body.type).toBe('object')
    expect(body.properties.name.type).toBe('string')
    expect(body.properties.age.type).toBe('integer')
    expect(body.properties.email.type).toBe('string')
    expect(body.required.sort()).toEqual(['age', 'email', 'name'])

    // --- Mongo (native driver $jsonSchema validator) ---
    const validator = toMongoValidator(ir).$jsonSchema as {
      bsonType: string
      properties: Record<string, { bsonType: string }>
      required: string[]
    }
    expect(validator.bsonType).toBe('object')
    expect(validator.properties.name.bsonType).toBe('string')
    expect(validator.properties.age.bsonType).toBe('int')
    expect(validator.properties.email.bsonType).toBe('string')
    expect(validator.required.sort()).toEqual(['age', 'email', 'name'])

    // the IR did not mutate while being consumed three times
    expect(JSON.stringify(User.toSchema())).toBe(JSON.stringify(ir))
  })

  it('required vs optional propagates the same way into every adapter', () => {
    const a = new Sapphire()
    const Profile = a
      .object({
        handle: a.string(), // required
        bio: a.string().optional(), // optional
      })
      .name('Profile')
    const ir = Profile.toSchema()

    // Mongo: required flag on the path
    const mongoSchema = toMongooseSchema(ir) as mongoose.Schema
    expect((mongoSchema.path('handle') as unknown as { isRequired: boolean }).isRequired).toBe(true)
    expect((mongoSchema.path('bio') as unknown as { isRequired?: boolean }).isRequired).toBeFalsy()

    // Drizzle: notNull on the column
    const pgTable = toDrizzleSchema(ir, { dialect: 'pg', tableName: 'profiles' }) as Record<
      string,
      { notNull: boolean }
    >
    expect(pgTable.handle.notNull).toBe(true)
    expect(pgTable.bio.notNull).toBe(false)

    // JSON Schema: required array (named object → body under $defs)
    const json = toJsonSchema(ir) as { $defs: Record<string, { required?: string[] }> }
    expect(json.$defs.Profile.required).toEqual(['handle'])

    // Mongo validator: required array (named object is inlined — no $ref)
    const validator = toMongoValidator(ir).$jsonSchema as { required?: string[] }
    expect(validator.required).toEqual(['handle'])
  })

  it('coerce/transform modifiers reach the Mongo adapter (parse-side is core)', () => {
    const a = new Sapphire()
    const Tagged = a
      .object({
        slug: a.string().trim().toLowerCase(),
      })
      .name('Tagged')
    const ir = Tagged.toSchema()

    // core parse trims + lowercases
    expect(Tagged.parse({ slug: '  HELLO ' })).toEqual({ slug: 'hello' })

    // Mongo adapter emits the matching schema-level options
    const mongoSchema = toMongooseSchema(ir) as mongoose.Schema
    const slugPath = mongoSchema.path('slug') as unknown as {
      options: { trim?: boolean; lowercase?: boolean }
    }
    expect(slugPath.options.trim).toBe(true)
    expect(slugPath.options.lowercase).toBe(true)
  })
})
