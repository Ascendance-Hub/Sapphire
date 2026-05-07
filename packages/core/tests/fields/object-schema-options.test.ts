import { describe, expect, it } from 'vitest'
import { Sapphire } from '../../src/lib/sapphire'

const a = new Sapphire()

describe('ObjectField.timestamps', () => {
  it('emits `timestamps: true` in the IR', () => {
    const User = a.object({ name: a.string() }).timestamps()
    const ir = User.toSchema()
    expect(ir.kind).toBe('object')
    if (ir.kind === 'object') {
      expect(ir.timestamps).toBe(true)
    }
  })

  it('does not emit `timestamps` when not called', () => {
    const User = a.object({ name: a.string() })
    const ir = User.toSchema()
    expect(ir.kind).toBe('object')
    if (ir.kind === 'object') {
      expect(ir.timestamps).toBeUndefined()
    }
  })

  it('returns a new instance (immutable)', () => {
    const User = a.object({ name: a.string() })
    const Stamped = User.timestamps()
    expect(User).not.toBe(Stamped)
    const irOriginal = User.toSchema()
    if (irOriginal.kind === 'object') {
      expect(irOriginal.timestamps).toBeUndefined()
    }
  })

  it('preserves other config (description, name)', () => {
    const User = a
      .object({ name: a.string() })
      .describe('a user')
      .name('User_TimestampsTest')
      .timestamps()
    const ir = User.toSchema()
    expect(ir.kind).toBe('object')
    if (ir.kind === 'object') {
      expect(ir.timestamps).toBe(true)
      expect(ir.description).toBe('a user')
      expect(ir.name).toBe('User_TimestampsTest')
    }
  })
})

describe('ObjectField.index(keys, opts?)', () => {
  it('emits an indexes array in the IR', () => {
    const User = a.object({ email: a.string(), name: a.string() }).index(['email'])
    const ir = User.toSchema()
    expect(ir.kind).toBe('object')
    if (ir.kind === 'object') {
      expect(ir.indexes).toEqual([{ keys: ['email'] }])
    }
  })

  it('supports composite indexes (multiple keys)', () => {
    const User = a
      .object({
        firstName: a.string(),
        lastName: a.string(),
        email: a.string(),
      })
      .index(['firstName', 'lastName'])
    const ir = User.toSchema()
    expect(ir.kind).toBe('object')
    if (ir.kind === 'object') {
      expect(ir.indexes).toEqual([{ keys: ['firstName', 'lastName'] }])
    }
  })

  it('supports unique indexes', () => {
    const User = a.object({ email: a.string() }).index(['email'], { unique: true })
    const ir = User.toSchema()
    expect(ir.kind).toBe('object')
    if (ir.kind === 'object') {
      expect(ir.indexes).toEqual([{ keys: ['email'], unique: true }])
    }
  })

  it('multiple .index() calls accumulate', () => {
    const User = a
      .object({
        email: a.string(),
        username: a.string(),
        createdAt: a.date(),
      })
      .index(['email'], { unique: true })
      .index(['username'])
      .index(['createdAt'])
    const ir = User.toSchema()
    expect(ir.kind).toBe('object')
    if (ir.kind === 'object') {
      expect(ir.indexes).toEqual([
        { keys: ['email'], unique: true },
        { keys: ['username'] },
        { keys: ['createdAt'] },
      ])
    }
  })

  it('returns a new instance (immutable)', () => {
    const User = a.object({ email: a.string() })
    const Indexed = User.index(['email'])
    expect(User).not.toBe(Indexed)
    const irOriginal = User.toSchema()
    if (irOriginal.kind === 'object') {
      expect(irOriginal.indexes).toBeUndefined()
    }
  })

  it('combines with timestamps and name', () => {
    const User = a
      .object({ email: a.string() })
      .name('User_IndexCombineTest')
      .timestamps()
      .index(['email'], { unique: true })
    const ir = User.toSchema()
    expect(ir.kind).toBe('object')
    if (ir.kind === 'object') {
      expect(ir.name).toBe('User_IndexCombineTest')
      expect(ir.timestamps).toBe(true)
      expect(ir.indexes).toEqual([{ keys: ['email'], unique: true }])
    }
  })
})
