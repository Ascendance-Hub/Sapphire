import { describe, it, expectTypeOf } from 'vitest'
import { Sapphire } from '../../src/lib/sapphire'
import type { Infer, InferInput } from '../../src/types/infer'

const a = new Sapphire()

describe('Object operations — type-level', () => {
  const User = a.object({
    name: a.string(),
    age: a.number(),
    email: a.string().email(),
  })

  describe('pick', () => {
    it('narrows to the listed keys', () => {
      const Picked = User.pick(['name', 'age'] as const)
      expectTypeOf<Infer<typeof Picked>>().toEqualTypeOf<{
        name: string
        age: number
      }>()
    })

    it('picking a single key still produces an object type', () => {
      const Only = User.pick(['email'] as const)
      expectTypeOf<Infer<typeof Only>>().toEqualTypeOf<{ email: string }>()
    })
  })

  describe('omit', () => {
    it('removes the listed keys', () => {
      const NoEmail = User.omit(['email'] as const)
      expectTypeOf<Infer<typeof NoEmail>>().toEqualTypeOf<{
        name: string
        age: number
      }>()
    })

    it('omitting all keys yields an empty object type', () => {
      const Empty = User.omit(['name', 'age', 'email'] as const)
      expectTypeOf<Infer<typeof Empty>>().toEqualTypeOf<Record<string, never>>()
    })
  })

  describe('extend', () => {
    it('adds new keys', () => {
      const Extended = User.extend({ role: a.string() })
      expectTypeOf<Infer<typeof Extended>>().toEqualTypeOf<{
        name: string
        age: number
        email: string
        role: string
      }>()
    })

    it('right-wins on key conflict (type)', () => {
      const Override = User.extend({ age: a.string() })
      expectTypeOf<Infer<typeof Override>>().toEqualTypeOf<{
        name: string
        age: string
        email: string
      }>()
    })

    it('preserves modifiers on added keys (optional in extension widens)', () => {
      const Extended = User.extend({ nickname: a.string().optional() })
      expectTypeOf<Infer<typeof Extended>>().toEqualTypeOf<{
        name: string
        age: number
        email: string
        nickname: string | undefined
      }>()
    })
  })

  describe('merge', () => {
    it('merges another ObjectField shape (right wins)', () => {
      const Audit = a.object({ createdAt: a.date(), age: a.string() })
      const Merged = User.merge(Audit)
      expectTypeOf<Infer<typeof Merged>>().toEqualTypeOf<{
        name: string
        email: string
        createdAt: Date
        age: string
      }>()
    })
  })

  describe('partial', () => {
    it('flips every top-level key to optional', () => {
      const Patch = User.partial()
      expectTypeOf<Infer<typeof Patch>>().toEqualTypeOf<{
        name?: string
        age?: number
        email?: string
      }>()
    })

    it('is shallow: nested object child becomes optional but keeps its inner shape strict', () => {
      const Nested = a.object({
        name: a.string(),
        address: a.object({ city: a.string() }),
      })
      const Patch = Nested.partial()
      expectTypeOf<Infer<typeof Patch>>().toEqualTypeOf<{
        name?: string
        address?: { city: string }
      }>()
    })
  })

  describe('required', () => {
    it('round-trips: partial().required() returns the original shape', () => {
      const Round = User.partial().required()
      expectTypeOf<Infer<typeof Round>>().toEqualTypeOf<{
        name: string
        age: number
        email: string
      }>()
    })

    it('on a partial of a nested object, required() restores top-level requireds', () => {
      const Nested = a.object({
        name: a.string(),
        address: a.object({ city: a.string() }),
      })
      const Round = Nested.partial().required()
      expectTypeOf<Infer<typeof Round>>().toEqualTypeOf<{
        name: string
        address: { city: string }
      }>()
    })
  })

  describe('InferInput', () => {
    it('extend preserves InferInput on the source keys', () => {
      const WithDefault = a.object({ count: a.number().default(0) })
      const Extended = WithDefault.extend({ name: a.string() })
      expectTypeOf<InferInput<typeof Extended>>().toEqualTypeOf<{
        count?: number
        name: string
      }>()
    })
  })
})
