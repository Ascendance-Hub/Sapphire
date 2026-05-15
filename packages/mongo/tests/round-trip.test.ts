/**
 * season-three S4 — round-trip: core parse vs Mongoose validation.
 *
 * For each modifier family: a value that the core `parse()` accepts must also
 * satisfy the emitted Mongoose schema, and a value the core rejects must also
 * fail Mongoose `validateSync()`. This proves the adapter emit and the core
 * validation stay in agreement — the regression these tests guard is "a
 * modifier changes parse behaviour but the adapter mapping drifts".
 */
import { describe, it, expect } from 'vitest'
import mongoose from 'mongoose'
import { Sapphire } from '@ascendance-hub/sapphire-core'
import { toMongoSchema } from '../src'

let modelCounter = 0
function modelFor(schema: mongoose.Schema): mongoose.Model<unknown> {
  return mongoose.model(`RoundTrip_${modelCounter++}`, schema)
}

describe('S4 — modifier round-trip (core parse ⇄ Mongoose validation)', () => {
  const a = new Sapphire()

  it('string length: core-valid value passes Mongoose, core-invalid fails it', () => {
    const Schema = a.object({ name: a.string().min(3).max(8) })
    const Model = modelFor(toMongoSchema(Schema.toSchema()) as mongoose.Schema)

    const ok = Schema.parse({ name: 'Alice' })
    expect(new Model(ok).validateSync()).toBeUndefined()

    // core rejects 'ab' (too short)
    expect(Schema.safeParse({ name: 'ab' }).success).toBe(false)
    expect(new Model({ name: 'ab' }).validateSync()?.errors.name).toBeDefined()
  })

  it('string email format: agreement on valid + invalid', () => {
    const Schema = a.object({ email: a.string().email() })
    const Model = modelFor(toMongoSchema(Schema.toSchema()) as mongoose.Schema)

    const ok = Schema.parse({ email: 'user@example.com' })
    expect(new Model(ok).validateSync()).toBeUndefined()

    expect(Schema.safeParse({ email: 'not-an-email' }).success).toBe(false)
    expect(new Model({ email: 'not-an-email' }).validateSync()?.errors.email).toBeDefined()
  })

  it('string regex: agreement on valid + invalid', () => {
    const Schema = a.object({ code: a.string().regex(/^[A-Z]{3}$/) })
    const Model = modelFor(toMongoSchema(Schema.toSchema()) as mongoose.Schema)

    const ok = Schema.parse({ code: 'ABC' })
    expect(new Model(ok).validateSync()).toBeUndefined()

    expect(Schema.safeParse({ code: 'abc' }).success).toBe(false)
    expect(new Model({ code: 'abc' }).validateSync()?.errors.code).toBeDefined()
  })

  it('string transforms: core trims, Mongoose schema also carries trim', () => {
    const Schema = a.object({ slug: a.string().trim().toLowerCase() })
    const Model = modelFor(toMongoSchema(Schema.toSchema()) as mongoose.Schema)

    // core parse already trimmed + lowercased
    const ok = Schema.parse({ slug: '  HELLO ' })
    expect(ok.slug).toBe('hello')

    // Mongoose applies the same trim/lowercase on assignment
    const doc = new Model({ slug: '  HELLO ' })
    expect(doc.validateSync()).toBeUndefined()
    expect((doc as unknown as { slug: string }).slug).toBe('hello')
  })

  it('number int + min: agreement on valid + invalid', () => {
    const Schema = a.object({ qty: a.number().int().min(10) })
    const Model = modelFor(toMongoSchema(Schema.toSchema()) as mongoose.Schema)

    const ok = Schema.parse({ qty: 12 })
    expect(new Model(ok).validateSync()).toBeUndefined()

    // below min
    expect(Schema.safeParse({ qty: 5 }).success).toBe(false)
    expect(new Model({ qty: 5 }).validateSync()?.errors.qty).toBeDefined()

    // non-integer
    expect(Schema.safeParse({ qty: 12.5 }).success).toBe(false)
    expect(new Model({ qty: 12.5 }).validateSync()?.errors.qty).toBeDefined()
  })

  it('number multipleOf: agreement on valid + invalid', () => {
    const Schema = a.object({ step: a.number().multipleOf(5) })
    const Model = modelFor(toMongoSchema(Schema.toSchema()) as mongoose.Schema)

    const ok = Schema.parse({ step: 15 })
    expect(new Model(ok).validateSync()).toBeUndefined()

    expect(Schema.safeParse({ step: 7 }).success).toBe(false)
    expect(new Model({ step: 7 }).validateSync()?.errors.step).toBeDefined()
  })

  it('required field: core and Mongoose agree a missing value is invalid', () => {
    const Schema = a.object({ name: a.string() })
    const Model = modelFor(toMongoSchema(Schema.toSchema()) as mongoose.Schema)

    expect(Schema.safeParse({}).success).toBe(false)
    expect(new Model({}).validateSync()?.errors.name).toBeDefined()
  })

  it('string startsWith: core check has a Mongoose custom-validator counterpart', () => {
    const Schema = a.object({ ref: a.string().startsWith('SAP-') })
    const Model = modelFor(toMongoSchema(Schema.toSchema()) as mongoose.Schema)

    const ok = Schema.parse({ ref: 'SAP-001' })
    expect(new Model(ok).validateSync()).toBeUndefined()

    expect(Schema.safeParse({ ref: 'X-001' }).success).toBe(false)
    expect(new Model({ ref: 'X-001' }).validateSync()?.errors.ref).toBeDefined()
  })
})
