import { describe, it, expect } from 'vitest'
import { Sapphire, getAdapter } from '@ascendance-hub/sapphire-core'
import '../src'
import { toMongooseSchema } from '../src'

describe('Mongoose adapter — modifiers (Dispatch D)', () => {
  const a = new Sapphire({ defaultAdapter: 'mongoose' })

  it('a.string().unique() → mongoose schema has unique: true', () => {
    const node = a.string().unique().toSchema()
    const def = toMongooseSchema(node) as Record<string, any>
    expect(def.unique).toBe(true)
  })

  it('a.number().min(5).max(10) → mongoose schema has min: 5, max: 10', () => {
    const node = a.number().min(5).max(10).toSchema()
    const def = toMongooseSchema(node) as Record<string, any>
    expect(def.min).toBe(5)
    expect(def.max).toBe(10)
  })

  it('a.string().default("hello") → mongoose schema has default: "hello"', () => {
    const node = a.string().default('hello').toSchema()
    const def = toMongooseSchema(node) as Record<string, any>
    expect(def.default).toBe('hello')
  })

  it('registry rename works end-to-end: getAdapter("mongoose") returns the function', () => {
    const adapter = getAdapter('mongoose')
    expect(typeof adapter).toBe('function')
    expect(adapter).toBe(toMongooseSchema)
  })
})
