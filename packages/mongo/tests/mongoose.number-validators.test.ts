import { describe, it, expect } from 'vitest'
import mongoose from 'mongoose'
import { Sapphire } from '@ascendance-hub/sapphire-core'
import { toMongoSchema } from '../src'

describe('Mongo adapter — number validators', () => {
  const a = new Sapphire({ defaultAdapter: 'mongo' })

  function makeModel(field: ReturnType<Sapphire['number']>) {
    const obj = a.object({ value: field })
    const schema = toMongoSchema(obj.toSchema()) as mongoose.Schema
    return mongoose.model('TestNum_' + Math.random().toString(36).slice(2), schema)
  }

  it('gt (exclusiveMin): rejeita igual, aceita maior', () => {
    const Model = makeModel(a.number().gt(10))
    expect(new Model({ value: 10 }).validateSync()?.errors.value).toBeDefined()
    expect(new Model({ value: 11 }).validateSync()).toBeUndefined()
  })

  it('lt (exclusiveMax): rejeita igual, aceita menor', () => {
    const Model = makeModel(a.number().lt(5))
    expect(new Model({ value: 5 }).validateSync()?.errors.value).toBeDefined()
    expect(new Model({ value: 4 }).validateSync()).toBeUndefined()
  })

  it('int: rejeita float', () => {
    const Model = makeModel(a.number().int())
    expect(new Model({ value: 1.5 }).validateSync()?.errors.value).toBeDefined()
    expect(new Model({ value: 2 }).validateSync()).toBeUndefined()
  })

  it('multipleOf(3): rejeita não-múltiplo', () => {
    const Model = makeModel(a.number().multipleOf(3))
    expect(new Model({ value: 4 }).validateSync()?.errors.value).toBeDefined()
    expect(new Model({ value: 9 }).validateSync()).toBeUndefined()
  })

  it('finite: rejeita Infinity', () => {
    const Model = makeModel(a.number().finite())
    expect(new Model({ value: Infinity }).validateSync()?.errors.value).toBeDefined()
    expect(new Model({ value: 42 }).validateSync()).toBeUndefined()
  })

  it('safe: rejeita inteiro fora do safe range', () => {
    const Model = makeModel(a.number().safe())
    expect(
      new Model({ value: Number.MAX_SAFE_INTEGER + 1 }).validateSync()?.errors.value,
    ).toBeDefined()
    expect(new Model({ value: 1234 }).validateSync()).toBeUndefined()
  })

  it('combinação int+min compõe via validate array', () => {
    const Model = makeModel(a.number().int().min(0))
    expect(new Model({ value: 1.5 }).validateSync()?.errors.value).toBeDefined()
    expect(new Model({ value: -1 }).validateSync()?.errors.value).toBeDefined()
    expect(new Model({ value: 7 }).validateSync()).toBeUndefined()
  })
})
