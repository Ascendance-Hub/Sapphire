/**
 * season-five S7 — adapter conformance matrix.
 *
 * The other cross-adapter tests in this folder are example-based: each picks a
 * concrete schema and asserts a concrete output. They missed B3 (the Mongoose
 * adapter dropped `default` / `description` on `array` and nested-`object`
 * fields) because no example happened to exercise a *container* carrying a
 * modifier.
 *
 * This file is a *matrix*: every (carrier-kind x modifier) behaviour is
 * declared once and run against every adapter that can represent it. A new
 * adapter inherits the whole suite for free; a regression fails uniformly
 * instead of depending on someone having written the right one-off `it()`.
 *
 * A behaviour omits an adapter from its `expect` map when that adapter has no
 * way to represent the feature — a documented gap, not a bug:
 *   - BSON `$jsonSchema` has no `default` keyword.
 *   - Drizzle SQL columns have no `description`.
 *   - Mongoose has no `nullable` concept distinct from optional.
 */
import { describe, it, expect } from 'vitest'
import mongoose from 'mongoose'
import { Sapphire, type Field } from '@ascendance-hub/sapphire-core'
import { toMongooseSchema } from '@ascendance-hub/sapphire-mongoose'
import { toBsonSchema } from '@ascendance-hub/sapphire-bson'
import { toJsonSchema } from '@ascendance-hub/sapphire-json-schema'
import { toDrizzleSchema } from '@ascendance-hub/sapphire-drizzle'
import { getTableConfig } from 'drizzle-orm/pg-core'

const a = new Sapphire()
const DESC = 'a conformance description'

type AdapterName = 'mongoose' | 'bson' | 'json-schema' | 'drizzle'

/** `slot` is the emitted piece for the field under test; `root` the whole output. */
interface Emitted {
  root: any
  slot: any
}

// Each adapter wraps the field under test as the `value` property of an object,
// emits, and returns { root, slot }.
const emit: Record<AdapterName, (field: Field) => Emitted> = {
  mongoose: (field) => {
    const schema = toMongooseSchema(a.object({ value: field }).toSchema()) as mongoose.Schema
    return { root: schema, slot: schema.path('value') }
  },
  bson: (field) => {
    const root = toBsonSchema(a.object({ value: field }).toSchema()).$jsonSchema as any
    return { root, slot: root.properties.value }
  },
  'json-schema': (field) => {
    const root = toJsonSchema(a.object({ value: field }).toSchema()) as any
    return { root, slot: root.properties.value }
  },
  drizzle: (field) => {
    const table = toDrizzleSchema(a.object({ value: field }).toSchema(), {
      dialect: 'pg',
      tableName: 'conformance',
    })
    const cfg = getTableConfig(table as never)
    return { root: cfg, slot: cfg.columns.find((c: { name: string }) => c.name === 'value') }
  },
}

type Probe = (e: Emitted) => boolean

interface Behavior {
  name: string
  field: Field
  expect: Partial<Record<AdapterName, Probe>>
}

// --- reusable probe sets, keyed by what each adapter materializes ---

const defaultProbes = {
  mongoose: (e) => e.slot?.options?.default !== undefined,
  'json-schema': (e) => e.slot?.default !== undefined,
  drizzle: (e) => e.slot?.hasDefault === true,
} satisfies Partial<Record<AdapterName, Probe>>

const descProbes = {
  mongoose: (e) => e.slot?.options?.description === DESC,
  'json-schema': (e) => e.slot?.description === DESC,
  bson: (e) => e.slot?.description === DESC,
} satisfies Partial<Record<AdapterName, Probe>>

const inRequired = (e: Emitted) =>
  Array.isArray(e.root.required) && e.root.required.includes('value')

const requiredProbes = {
  mongoose: (e) => e.slot?.isRequired === true,
  bson: inRequired,
  'json-schema': inRequired,
  drizzle: (e) => e.slot?.notNull === true,
} satisfies Partial<Record<AdapterName, Probe>>

const optionalProbes = {
  mongoose: (e) => !e.slot?.isRequired,
  bson: (e) => !inRequired(e),
  'json-schema': (e) => !inRequired(e),
  drizzle: (e) => e.slot?.notNull === false,
} satisfies Partial<Record<AdapterName, Probe>>

const nullableProbes = {
  'json-schema': (e) =>
    Array.isArray(e.slot?.type) ? e.slot.type.includes('null') : Array.isArray(e.slot?.oneOf),
  bson: (e) =>
    Array.isArray(e.slot?.bsonType)
      ? e.slot.bsonType.includes('null')
      : Array.isArray(e.slot?.anyOf),
  drizzle: (e) => e.slot?.notNull === false,
} satisfies Partial<Record<AdapterName, Probe>>

const behaviors: Behavior[] = [
  // --- `default` survives on every carrier kind (B3 lived here) ---
  { name: 'default on a leaf', field: a.string().default('d'), expect: defaultProbes },
  { name: 'default on an array', field: a.array(a.string()).default(['d']), expect: defaultProbes },
  {
    name: 'default on a nested object',
    field: a.object({ inner: a.string() }).default({ inner: 'd' }),
    expect: defaultProbes,
  },
  {
    name: 'default on a tuple',
    field: a.tuple([a.string(), a.number()]).default(['d', 1]),
    expect: defaultProbes,
  },
  {
    name: 'default on a record',
    field: a.type().record(a.string(), a.number()).default({ k: 1 }),
    expect: defaultProbes,
  },
  // --- `description` survives on every carrier kind (B3 lived here) ---
  { name: 'description on a leaf', field: a.string().describe(DESC), expect: descProbes },
  {
    name: 'description on an array',
    field: a.array(a.string()).describe(DESC),
    expect: descProbes,
  },
  {
    name: 'description on a nested object',
    field: a.object({ inner: a.string() }).describe(DESC),
    expect: descProbes,
  },
  {
    name: 'description on a tuple',
    field: a.tuple([a.string(), a.number()]).describe(DESC),
    expect: descProbes,
  },
  {
    name: 'description on a record',
    field: a.type().record(a.string(), a.number()).describe(DESC),
    expect: descProbes,
  },
  // --- cross-cutting flags ---
  { name: 'required propagates', field: a.string(), expect: requiredProbes },
  { name: 'optional propagates', field: a.string().optional(), expect: optionalProbes },
  { name: 'nullable propagates', field: a.string().nullable(), expect: nullableProbes },
]

for (const behavior of behaviors) {
  describe(`conformance — ${behavior.name}`, () => {
    const entries = Object.entries(behavior.expect) as [AdapterName, Probe][]
    for (const [adapter, probe] of entries) {
      it(`${adapter} carries it`, () => {
        expect(probe(emit[adapter](behavior.field))).toBe(true)
      })
    }
  })
}
