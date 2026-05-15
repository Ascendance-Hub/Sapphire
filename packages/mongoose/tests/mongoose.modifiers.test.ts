import { describe, it, expect } from 'vitest'
import { Sapphire, getAdapter } from '@ascendance-hub/sapphire-core'
import '../src'
import { toMongoSchema } from '../src'

describe('Mongo adapter — modifiers (Dispatch D)', () => {
  const a = new Sapphire({ defaultAdapter: 'mongo' })

  it('a.string().unique() → mongoose schema has unique: true', () => {
    const node = a.string().unique().toSchema()
    const def = toMongoSchema(node) as Record<string, any>
    expect(def.unique).toBe(true)
  })

  it('a.number().min(5).max(10) → mongoose schema has min: 5, max: 10', () => {
    const node = a.number().min(5).max(10).toSchema()
    const def = toMongoSchema(node) as Record<string, any>
    expect(def.min).toBe(5)
    expect(def.max).toBe(10)
  })

  it('a.string().default("hello") → mongoose schema has default: "hello"', () => {
    const node = a.string().default('hello').toSchema()
    const def = toMongoSchema(node) as Record<string, any>
    expect(def.default).toBe('hello')
  })

  it('registry rename works end-to-end: getAdapter("mongo") returns the function', () => {
    const adapter = getAdapter('mongo')
    expect(typeof adapter).toBe('function')
    expect(adapter).toBe(toMongoSchema)
  })
})
