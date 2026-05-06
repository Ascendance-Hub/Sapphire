import { describe, expect, expectTypeOf, it } from 'vitest'
import { Sapphire } from '../../src/lib/sapphire'
import type { Infer } from '../../src/types/infer'

const a = new Sapphire()

describe('ObjectField.pick', () => {
  it('returns only the listed keys at runtime', () => {
    const User = a.object({
      name: a.string(),
      age: a.number(),
      email: a.string().email(),
    })
    const Summary = User.pick(['name', 'age'] as const)
    expect(Summary.parse({ name: 'Alice', age: 30 })).toEqual({ name: 'Alice', age: 30 })
    expect(Summary.safeParse({ name: 'Alice', age: 30, email: 'a@b' }).success).toBe(false)
  })

  it('infers Pick<T, K> at the type level', () => {
    const User = a.object({
      name: a.string(),
      age: a.number(),
      email: a.string(),
    })
    const Summary = User.pick(['name', 'age'] as const)
    expectTypeOf<Infer<typeof Summary>>().toEqualTypeOf<{ name: string; age: number }>()
  })

  it('drops name/description/meta from the source schema (config virgem)', () => {
    const User = a
      .object({ id: a.string(), name: a.string() })
      .describe('a user')
      .name('User_PickConfigTest')
    const Sub = User.pick(['name'] as const)
    const ir = Sub.toSchema()
    expect(ir.kind).toBe('object')
    if (ir.kind === 'object') {
      expect(ir.name).toBeUndefined()
      expect(ir.description).toBeUndefined()
    }
  })

  it('preserves the `required` flag from the source', () => {
    const Optional = a.object({ a: a.string(), b: a.number() }).optional()
    const Picked = Optional.pick(['a'] as const)
    // optional source → optional pick
    expect(Picked.safeParse(undefined).success).toBe(true)
  })
})

describe('ObjectField.omit', () => {
  it('removes the listed keys at runtime', () => {
    const User = a.object({
      name: a.string(),
      age: a.number(),
      email: a.string().email(),
    })
    const Public = User.omit(['email'] as const)
    expect(Public.parse({ name: 'Alice', age: 30 })).toEqual({ name: 'Alice', age: 30 })
    expect(Public.safeParse({ name: 'Alice', age: 30, email: 'a@b' }).success).toBe(false)
  })

  it('infers Omit<T, K> at the type level', () => {
    const User = a.object({
      name: a.string(),
      age: a.number(),
      email: a.string(),
    })
    const Public = User.omit(['email'] as const)
    expectTypeOf<Infer<typeof Public>>().toEqualTypeOf<{ name: string; age: number }>()
  })

  it('drops name/description from the source schema (config virgem)', () => {
    const User = a
      .object({ id: a.string(), secret: a.string() })
      .describe('a user with secret')
      .name('User_OmitConfigTest')
    const Pub = User.omit(['secret'] as const)
    const ir = Pub.toSchema()
    expect(ir.kind).toBe('object')
    if (ir.kind === 'object') {
      expect(ir.name).toBeUndefined()
      expect(ir.description).toBeUndefined()
    }
  })
})

describe('pick/omit immutability', () => {
  it('source schema is unchanged after pick/omit', () => {
    const User = a.object({ name: a.string(), age: a.number() })
    User.pick(['name'] as const)
    User.omit(['age'] as const)
    expect(Object.keys(User.getObj())).toEqual(['name', 'age'])
  })
})
