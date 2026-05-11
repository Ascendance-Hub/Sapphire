import { describe, it, expect } from 'vitest'
import { Sapphire } from '@ascendance-hub/sapphire-core'
import { toDrizzleSchema, DrizzleTableRegistry } from '../src'

describe('drizzle bootstrap', () => {
  it('exports toDrizzleSchema + DrizzleTableRegistry', () => {
    expect(typeof toDrizzleSchema).toBe('function')
    expect(new DrizzleTableRegistry()).toBeInstanceOf(DrizzleTableRegistry)
  })

  it('throws on non-object root', () => {
    const a = new Sapphire()
    const ir = a.string().toSchema()
    expect(() => toDrizzleSchema(ir, { dialect: 'pg' })).toThrow(/root node must be ObjectField/)
  })
})
