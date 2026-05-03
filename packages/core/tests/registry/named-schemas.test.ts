import { describe, it, expect } from 'vitest'
import { Sapphire } from '../../src/lib/sapphire'

describe('Named-schema registry', () => {
  it('ObjectField.name(...) registra na instância', () => {
    const a = new Sapphire()
    a.object({ name: a.string() }).name('User')
    expect(a.listNamedSchemas()).toEqual(['User'])
  })

  it('toSchema emite name no IR object', () => {
    const a = new Sapphire()
    const User = a.object({ name: a.string() }).name('User')
    const s = User.toSchema() as any
    expect(s.kind).toBe('object')
    expect(s.name).toBe('User')
  })

  it('duplicate name throws', () => {
    const a = new Sapphire()
    a.object({ name: a.string() }).name('User')
    expect(() => a.object({ name: a.string() }).name('User')).toThrow(/already registered/)
  })

  it('isolamento entre instâncias Sapphire', () => {
    const a = new Sapphire()
    const b = new Sapphire()
    a.object({ x: a.string() }).name('Same')
    expect(() => b.object({ y: b.string() }).name('Same')).not.toThrow()
    expect(a.listNamedSchemas()).toEqual(['Same'])
    expect(b.listNamedSchemas()).toEqual(['Same'])
  })

  it('name() retorna nova instância imutável', () => {
    const a = new Sapphire()
    const base = a.object({ x: a.string() })
    const named = base.name('Foo')
    expect(base.toSchema()).not.toHaveProperty('name')
    expect((named.toSchema() as any).name).toBe('Foo')
  })
})
