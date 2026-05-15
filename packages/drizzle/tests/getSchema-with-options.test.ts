import { describe, it, expect, beforeAll } from 'vitest'
import { Sapphire, registerAdapter } from '@ascendance-hub/sapphire-core'
import { toDrizzleSchema } from '../src'

// B1: getSchema('drizzle', options) must forward `options` to toDrizzleSchema.
// Pre-fix, the registry dropped the second argument and toDrizzleSchema threw
// on `options.dialect` with a generic TypeError. After fix, the pattern works
// for all three dialects and the no-options case errors with a clear message.

describe('B1 — getSchema forwards options to drizzle adapter', () => {
  beforeAll(() => {
    registerAdapter('drizzle', toDrizzleSchema as never)
  })

  it('pg: getSchema returns a real pgTable', () => {
    const a = new Sapphire({ defaultAdapter: 'drizzle' })
    const User = a.object({ name: a.string() }).name('User')
    const table = User.getSchema(undefined, { dialect: 'pg' }) as Record<string, unknown>
    expect(table).toBeDefined()
    expect((table as { id: unknown }).id).toBeDefined()
    expect((table as { name: unknown }).name).toBeDefined()
  })

  it('mysql: getSchema returns a real mysqlTable', () => {
    const a = new Sapphire({ defaultAdapter: 'drizzle' })
    const User = a.object({ name: a.string() }).name('User')
    const table = User.getSchema(undefined, { dialect: 'mysql' }) as Record<string, unknown>
    expect(table).toBeDefined()
    expect((table as { id: unknown }).id).toBeDefined()
  })

  it('sqlite: getSchema returns a real sqliteTable', () => {
    const a = new Sapphire({ defaultAdapter: 'drizzle' })
    const User = a.object({ name: a.string() }).name('User')
    const table = User.getSchema(undefined, { dialect: 'sqlite' }) as Record<string, unknown>
    expect(table).toBeDefined()
    expect((table as { id: unknown }).id).toBeDefined()
  })

  it('getSchema named adapter still works: getSchema("drizzle", { dialect: "pg" })', () => {
    const a = new Sapphire()
    const User = a.object({ name: a.string() }).name('User')
    const table = User.getSchema('drizzle', { dialect: 'pg' }) as Record<string, unknown>
    expect((table as { id: unknown }).id).toBeDefined()
  })

  it('no options → clear error mentioning dialect', () => {
    const a = new Sapphire({ defaultAdapter: 'drizzle' })
    const User = a.object({ name: a.string() }).name('User')
    expect(() => User.getSchema()).toThrow(/dialect is required/)
  })

  it('empty options → clear error mentioning dialect', () => {
    const a = new Sapphire({ defaultAdapter: 'drizzle' })
    const User = a.object({ name: a.string() }).name('User')
    expect(() => User.getSchema(undefined, {})).toThrow(/dialect is required/)
  })
})
