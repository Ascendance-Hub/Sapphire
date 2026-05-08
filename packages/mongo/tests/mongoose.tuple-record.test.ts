import { describe, it, expect } from 'vitest'
import mongoose from 'mongoose'
import { Sapphire } from '@ascendance-hub/sapphire-core'
import { toMongoSchema } from '../src'

describe('Mongo adapter — tuple length validator', () => {
  const a = new Sapphire({ defaultAdapter: 'mongo' })

  it('tuple [string, number]: rejeita length errado', () => {
    const obj = a.object({ pair: a.tuple([a.string(), a.number()]) })
    const schema = toMongoSchema(obj.toSchema()) as mongoose.Schema
    const Model = mongoose.model('TestTuple1_' + Date.now(), schema)
    const tooShort = new Model({ pair: ['x'] })
    expect(tooShort.validateSync()?.errors.pair).toBeDefined()
    const tooLong = new Model({ pair: ['x', 1, true] })
    expect(tooLong.validateSync()?.errors.pair).toBeDefined()
  })

  it('tuple aceita length correto (type-checking de posição fica no core)', () => {
    const obj = a.object({ pair: a.tuple([a.string(), a.number()]) })
    const schema = toMongoSchema(obj.toSchema()) as mongoose.Schema
    const Model = mongoose.model('TestTuple2_' + Date.now(), schema)
    const ok = new Model({ pair: ['x', 1] })
    expect(ok.validateSync()).toBeUndefined()
    // Limitação documentada: tipos errados POR POSIÇÃO não são checados pelo Mongoose;
    // o core (safeParse) é a fonte canônica de validação de tuple.
    const wrongTypes = new Model({ pair: [1, 'x'] })
    expect(wrongTypes.validateSync()).toBeUndefined()
  })
})

describe('Mongo adapter — record com keyField', () => {
  const a = new Sapphire({ defaultAdapter: 'mongo' })

  it('keyField string → Map of values', () => {
    const obj = a.object({
      flags: a.type().record(a.string(), a.boolean()),
    })
    const schema = toMongoSchema(obj.toSchema()) as mongoose.Schema
    const path = schema.path('flags') as any
    expect(path.instance).toBe('Map')
  })

  it('keyField enum → Map of values', () => {
    const obj = a.object({
      labels: a.type().record(a.type().enum(['a', 'b'] as const), a.string()),
    })
    const schema = toMongoSchema(obj.toSchema()) as mongoose.Schema
    const path = schema.path('labels') as any
    expect(path.instance).toBe('Map')
  })

  it('keyField numérico → Mixed (fallback documentado)', () => {
    const obj = a.object({
      scores: a.type().record(a.number(), a.string()),
    })
    const schema = toMongoSchema(obj.toSchema()) as mongoose.Schema
    const path = schema.path('scores') as any
    expect(path.instance).toBe('Mixed')
  })
})
