import { describe, it, expect } from 'vitest'
import mongoose from 'mongoose'
import { Sapphire } from '@ascendance-hub/sapphire-core'
import { toMongoSchema } from '../src'

describe('Mongo adapter — string formats / startsWith / endsWith / transforms', () => {
  const a = new Sapphire({ defaultAdapter: 'mongo' })

  function makeModel(field: ReturnType<Sapphire['string']>) {
    const obj = a.object({ value: field })
    const schema = toMongoSchema(obj.toSchema()) as mongoose.Schema
    return mongoose.model('Test_' + Math.random().toString(36).slice(2), schema)
  }

  it('email format: rejeita inválido, aceita válido', () => {
    const Model = makeModel(a.string().email())
    expect(new Model({ value: 'not-an-email' }).validateSync()?.errors.value).toBeDefined()
    expect(new Model({ value: 'foo@bar.com' }).validateSync()).toBeUndefined()
  })

  it('url format: rejeita inválido, aceita válido', () => {
    const Model = makeModel(a.string().url())
    expect(new Model({ value: 'nope' }).validateSync()?.errors.value).toBeDefined()
    expect(new Model({ value: 'https://example.com' }).validateSync()).toBeUndefined()
  })

  it('uuid format: rejeita inválido, aceita válido', () => {
    const Model = makeModel(a.string().uuid())
    expect(new Model({ value: '123' }).validateSync()?.errors.value).toBeDefined()
    // S5: regex tightened — RFC 4122 variant nibble must be 8/9/a/b. The
    // previous sample (`...-3333-...`) had an invalid variant and is no
    // longer accepted; swap to a valid v4 with variant `a`.
    expect(
      new Model({ value: 'a1b2c3d4-1111-4222-a333-444455556666' }).validateSync(),
    ).toBeUndefined()
  })

  it('startsWith: rejeita string sem prefixo', () => {
    const Model = makeModel(a.string().startsWith('https://'))
    expect(new Model({ value: 'http://nope' }).validateSync()?.errors.value).toBeDefined()
    expect(new Model({ value: 'https://ok' }).validateSync()).toBeUndefined()
  })

  it('endsWith: rejeita string sem sufixo', () => {
    const Model = makeModel(a.string().endsWith('.com'))
    expect(new Model({ value: 'foo.org' }).validateSync()?.errors.value).toBeDefined()
    expect(new Model({ value: 'foo.com' }).validateSync()).toBeUndefined()
  })

  it('format + startsWith compõem (multi-validator)', () => {
    const Model = makeModel(a.string().email().endsWith('@company.com'))
    expect(new Model({ value: 'foo@bar.com' }).validateSync()?.errors.value).toBeDefined()
    expect(new Model({ value: 'jane@company.com' }).validateSync()).toBeUndefined()
  })

  it('trim transform → schema.path tem trim: true', () => {
    const obj = a.object({ value: a.string().trim() })
    const schema = toMongoSchema(obj.toSchema()) as mongoose.Schema
    const path = schema.path('value') as any
    expect(path.options.trim).toBe(true)
  })

  it('toLowerCase transform → schema.path tem lowercase: true', () => {
    const obj = a.object({ value: a.string().toLowerCase() })
    const schema = toMongoSchema(obj.toSchema()) as mongoose.Schema
    const path = schema.path('value') as any
    expect(path.options.lowercase).toBe(true)
  })

  it('toUpperCase transform → schema.path tem uppercase: true', () => {
    const obj = a.object({ value: a.string().toUpperCase() })
    const schema = toMongoSchema(obj.toSchema()) as mongoose.Schema
    const path = schema.path('value') as any
    expect(path.options.uppercase).toBe(true)
  })
})
