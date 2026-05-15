/**
 * Integration round-trip — every IR construct, validated by a real MongoDB.
 *
 * A unit test can only assert the *shape* of the emitted `$jsonSchema`. It
 * cannot prove MongoDB actually accepts that document as a collection
 * validator, nor that the validator accepts/rejects the documents we expect.
 * This file spins up an in-memory MongoDB, creates a validated collection per
 * construct, and inserts known-good and known-bad documents — so the adapter
 * is exercised end to end against the database it targets.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { MongoClient, ObjectId, type Collection, type Db } from 'mongodb'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { Sapphire, type Field } from '@ascendance-hub/sapphire-core'
import { toMongoValidator, type MongoValidator, type MongoValidatorOptions } from '../src'

const a = new Sapphire()

let server: MongoMemoryServer
let client: MongoClient
let db: Db
let seq = 0

beforeAll(async () => {
  server = await MongoMemoryServer.create()
  client = new MongoClient(server.getUri())
  await client.connect()
  db = client.db('test')
}, 120_000)

afterAll(async () => {
  await client?.close()
  await server?.stop()
})

/** Create a fresh collection guarded by `validator`. */
async function collectionFor(validator: MongoValidator): Promise<Collection> {
  const name = `c_${seq++}`
  await db.createCollection(name, { validator })
  return db.collection(name)
}

/**
 * Build a one-field document schema, create a validated collection, and assert
 * that `accepts` insert cleanly and `rejects` are refused server-side.
 */
async function check(
  field: Field,
  cases: { accepts: unknown[]; rejects: unknown[] },
  options?: MongoValidatorOptions,
): Promise<void> {
  const validator = toMongoValidator(a.object({ val: field }).toSchema(), options)
  const coll = await collectionFor(validator)
  for (const value of cases.accepts) {
    await expect(coll.insertOne({ val: value })).resolves.toBeTruthy()
  }
  for (const value of cases.rejects) {
    await expect(coll.insertOne({ val: value })).rejects.toThrow()
  }
}

describe('integration — string', () => {
  it('minLength / maxLength', () =>
    check(a.string().min(2).max(6), { accepts: ['ab', 'abcdef'], rejects: ['a', 'abcdefg'] }))

  it('regex pattern', () =>
    check(a.string().regex(/^[A-Z]{3}$/), { accepts: ['ABC'], rejects: ['abc', 'ABCD'] }))

  it('startsWith / endsWith', () =>
    check(a.string().startsWith('SKU-').endsWith('-X'), {
      accepts: ['SKU-9-X'],
      rejects: ['SKU-9', 'no-X'],
    }))

  it('email format', () =>
    check(a.string().email(), { accepts: ['user@example.com'], rejects: ['not-an-email'] }))

  it('uuid format', () =>
    check(a.string().uuid(), {
      accepts: ['3f2504e0-4f89-41d3-9a0c-0305e82c3301'],
      rejects: ['not-a-uuid'],
    }))
})

describe('integration — number', () => {
  // Verifies D1: a plain number emits bsonType 'number', which MongoDB accepts
  // for int + double values alike.
  it('plain number accepts int and double, rejects non-numbers', () =>
    check(a.number(), { accepts: [5, 3.14], rejects: ['x', true] }))

  it('int rejects a fractional value', () =>
    check(a.number().int(), { accepts: [5], rejects: [5.5] }))

  it('min / max', () => check(a.number().min(0).max(10), { accepts: [0, 10], rejects: [-1, 11] }))

  it('exclusive min / max', () =>
    check(a.number().gt(0).lt(10), { accepts: [1, 9], rejects: [0, 10] }))

  it('multipleOf', () => check(a.number().multipleOf(5), { accepts: [0, 15], rejects: [7] }))
})

describe('integration — boolean / date', () => {
  it('boolean', () => check(a.boolean(), { accepts: [true, false], rejects: ['yes', 1] }))

  it('date', () =>
    check(a.date(), { accepts: [new Date('2026-01-01')], rejects: ['2026-01-01', 1234] }))
})

describe('integration — composites', () => {
  it('nested object enforces the inner shape', () =>
    check(a.object({ city: a.string() }), {
      accepts: [{ city: 'Rio' }],
      rejects: [{}, { city: 9 }],
    }))

  it('array — item type and minItems/maxItems', () =>
    check(a.array(a.string()).min(1).max(2), {
      accepts: [['x'], ['x', 'y']],
      rejects: [[], ['x', 'y', 'z'], [1]],
    }))

  it('tuple — length and per-position type', () =>
    check(a.tuple([a.string(), a.number()]), {
      accepts: [['x', 1]],
      rejects: [['x'], ['x', 'y'], ['x', 1, 2]],
    }))

  it('record — values schema', () =>
    check(a.type().record(a.string(), a.number()), {
      accepts: [{ x: 1, y: 2 }, {}],
      rejects: [{ x: 'not-a-number' }],
    }))
})

describe('integration — union / literal / enum', () => {
  it('union emits anyOf (MongoDB 5.0+)', () =>
    check(a.type().union([a.string(), a.number()]), {
      accepts: ['x', 5],
      rejects: [true],
    }))

  it('literal', () =>
    check(a.type().literal('ACTIVE'), { accepts: ['ACTIVE'], rejects: ['INACTIVE'] }))

  it('enum', () =>
    check(a.type().enum(['a', 'b', 'c']), { accepts: ['b'], rejects: ['z'] }))
})

describe('integration — ref / nullable', () => {
  it('ref is validated as a bsonType objectId', () =>
    check(a.ref('User'), {
      accepts: [new ObjectId()],
      rejects: ['not-an-objectid', 123],
    }))

  it('nullable primitive accepts null', () =>
    check(a.string().nullable(), { accepts: ['x', null], rejects: [5] }))

  it('nullable enum (anyOf branch) accepts null', () =>
    check(a.type().enum(['a', 'b']).nullable(), { accepts: ['a', null], rejects: ['z'] }))
})

describe('integration — object-level behaviour', () => {
  it('required keys are enforced server-side', async () => {
    const validator = toMongoValidator(
      a.object({ title: a.string(), body: a.string().optional() }).toSchema(),
    )
    const coll = await collectionFor(validator)
    await expect(coll.insertOne({ title: 'Hi' })).resolves.toBeTruthy()
    await expect(coll.insertOne({ body: 'no title' })).rejects.toThrow()
  })

  it('a declared _id field is validated like any other property', async () => {
    const validator = toMongoValidator(
      a.object({ _id: a.string(), name: a.string() }).toSchema(),
    )
    const coll = await collectionFor(validator)
    await expect(coll.insertOne({ _id: 'user-1', name: 'Ana' })).resolves.toBeTruthy()
    await expect(coll.insertOne({ _id: 42, name: 'Ana' })).rejects.toThrow()
  })

  it('additionalProperties: false rejects unknown keys', async () => {
    const validator = toMongoValidator(a.object({ name: a.string() }).toSchema(), {
      additionalProperties: false,
    })
    const coll = await collectionFor(validator)
    await expect(coll.insertOne({ name: 'Ana' })).resolves.toBeTruthy()
    await expect(coll.insertOne({ name: 'Ana', extra: true })).rejects.toThrow()
  })

  it('the .adapter("mongo", …) escape hatch reaches the validator', () =>
    // `minimum` is a valid $jsonSchema keyword — passed straight through.
    check(a.number().adapter('mongo', { minimum: 18 }), {
      accepts: [18, 40],
      rejects: [17],
    }))
})
