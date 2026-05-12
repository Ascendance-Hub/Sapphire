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

// S7: pick/omit drop schema-level config (name/timestamps/indexes/meta/
// description/message) by design — they yield conceptually new schemas.
// extend/merge preserve config because they are the same conceptual schema
// just wider. This test pins the asymmetry so a future "consistency cleanup"
// doesn't quietly change behaviour.
describe('S7 — pick/omit vs extend/merge config preservation asymmetry', () => {
  it('pick drops name/timestamps/indexes; extend preserves them', () => {
    const User = a
      .object({ email: a.string(), age: a.number(), createdAt: a.date() })
      .name('User_S7Asymmetry')
      .timestamps()
      .index(['email'], { unique: true })

    // pick → fresh config.
    const Picked = User.pick(['email'] as const)
    expect(Picked.getName()).toBeUndefined()
    const pickedIR = Picked.toSchema()
    expect(pickedIR.kind).toBe('object')
    if (pickedIR.kind === 'object') {
      expect(pickedIR.timestamps).toBeUndefined()
      expect(pickedIR.indexes).toBeUndefined()
    }

    // omit → same fresh-config rule.
    const a2 = new Sapphire()
    const User2 = a2
      .object({ email: a.string(), createdAt: a.date() })
      .name('User_S7Asymmetry_b')
      .timestamps()
    const Omitted = User2.omit(['createdAt'] as const)
    expect(Omitted.getName()).toBeUndefined()
    const omittedIR = Omitted.toSchema()
    if (omittedIR.kind === 'object') {
      expect(omittedIR.timestamps).toBeUndefined()
    }

    // extend → config preserved (same conceptual schema, wider).
    const a3 = new Sapphire()
    const User3 = a3
      .object({ email: a.string() })
      .name('User_S7Asymmetry_c')
      .timestamps()
      .index(['email'], { unique: true })
    const Extended = User3.extend({ age: a.number() })
    expect(Extended.getName()).toBe('User_S7Asymmetry_c')
    const extIR = Extended.toSchema()
    if (extIR.kind === 'object') {
      expect(extIR.timestamps).toBe(true)
      expect(extIR.indexes?.length).toBe(1)
    }

    // merge → same preserve-config rule as extend (it delegates to extend).
    const a4 = new Sapphire()
    const Base = a4.object({ email: a.string() }).name('User_S7Asymmetry_d').timestamps()
    const Audit = a4.object({ createdAt: a.date() })
    const Merged = Base.merge(Audit)
    expect(Merged.getName()).toBe('User_S7Asymmetry_d')
    const mergedIR = Merged.toSchema()
    if (mergedIR.kind === 'object') {
      expect(mergedIR.timestamps).toBe(true)
    }
  })
})

describe('ObjectField.partial', () => {
  it('makes every key optional at runtime (parse with empty object passes)', () => {
    const User = a.object({ name: a.string(), age: a.number() })
    const Patch = User.partial()
    expect(Patch.parse({}).name).toBeUndefined()
    expect(Patch.parse({ name: 'Alice' })).toEqual({ name: 'Alice' })
    expect(Patch.parse({ name: 'Bob', age: 7 })).toEqual({ name: 'Bob', age: 7 })
  })

  it('original schema still rejects missing keys', () => {
    const User = a.object({ name: a.string(), age: a.number() })
    User.partial()
    expect(User.safeParse({}).success).toBe(false)
  })

  it('infers all keys as optional at the type level', () => {
    const User = a.object({ name: a.string(), age: a.number() })
    const Patch = User.partial()
    expectTypeOf<Infer<typeof Patch>>().toEqualTypeOf<{ name?: string; age?: number }>()
  })

  it('preserves config (description survives)', () => {
    const User = a.object({ x: a.string() }).describe('a thing')
    const P = User.partial()
    const ir = P.toSchema()
    expect(ir.kind).toBe('object')
    if (ir.kind === 'object') {
      expect(ir.description).toBe('a thing')
    }
  })
})

describe('ObjectField.required', () => {
  it('makes every key required at runtime', () => {
    const User = a.object({ name: a.string(), age: a.number() })
    const Patch = User.partial()
    const Strict = Patch.required()
    expect(Strict.safeParse({}).success).toBe(false)
    expect(Strict.parse({ name: 'Alice', age: 30 })).toEqual({ name: 'Alice', age: 30 })
  })

  it('round-trips partial().required() to the original required shape', () => {
    const User = a.object({ name: a.string(), age: a.number() })
    const RoundTrip = User.partial().required()
    expectTypeOf<Infer<typeof RoundTrip>>().toEqualTypeOf<{ name: string; age: number }>()
  })

  it('also flips object-level optional back (config.required = true)', () => {
    const Optional = a.object({ x: a.string() }).optional()
    const NotOptional = Optional.required()
    expect(NotOptional.safeParse(undefined).success).toBe(false)
  })

  it('preserves config (description survives)', () => {
    const User = a.object({ x: a.string().optional() }).describe('a thing')
    const R = User.required()
    const ir = R.toSchema()
    expect(ir.kind).toBe('object')
    if (ir.kind === 'object') {
      expect(ir.description).toBe('a thing')
    }
  })

  it('source schema is unchanged after partial/required', () => {
    const User = a.object({ name: a.string() })
    User.partial()
    User.required()
    // original still expects name to be required
    expect(User.safeParse({}).success).toBe(false)
  })
})

describe('ObjectField.extend', () => {
  it('adds new keys at runtime', () => {
    const User = a.object({ name: a.string() })
    const Extended = User.extend({ age: a.number() })
    expect(Extended.parse({ name: 'Alice', age: 30 })).toEqual({ name: 'Alice', age: 30 })
    expect(Extended.safeParse({ name: 'Alice' }).success).toBe(false)
  })

  it('infers Omit<T, keyof U> & U at the type level', () => {
    const User = a.object({ name: a.string(), age: a.number() })
    const Extended = User.extend({ role: a.string() })
    expectTypeOf<Infer<typeof Extended>>().toEqualTypeOf<{
      name: string
      age: number
      role: string
    }>()
  })

  it('right wins on key conflict (runtime)', () => {
    const User = a.object({ name: a.string() })
    const Override = User.extend({ name: a.number() })
    expect(Override.parse({ name: 42 })).toEqual({ name: 42 })
    expect(Override.safeParse({ name: 'Alice' }).success).toBe(false)
  })

  it('right wins on key conflict (type)', () => {
    const User = a.object({ name: a.string(), age: a.number() })
    const Override = User.extend({ name: a.number() })
    expectTypeOf<Infer<typeof Override>>().toEqualTypeOf<{
      name: number
      age: number
    }>()
  })

  it('preserves config (description survives)', () => {
    const User = a.object({ x: a.string() }).describe('a thing')
    const E = User.extend({ y: a.number() })
    const ir = E.toSchema()
    expect(ir.kind).toBe('object')
    if (ir.kind === 'object') {
      expect(ir.description).toBe('a thing')
    }
  })
})

describe('ObjectField.merge', () => {
  it('merges another ObjectField shape (right wins)', () => {
    const Base = a.object({ name: a.string(), age: a.number() })
    const Other = a.object({ age: a.string(), email: a.string().email() })
    const Merged = Base.merge(Other)
    // age came from `Other` — string, not number
    expect(Merged.parse({ name: 'Alice', age: '30', email: 'a@b.com' })).toEqual({
      name: 'Alice',
      age: '30',
      email: 'a@b.com',
    })
    expect(Merged.safeParse({ name: 'Alice', age: 30, email: 'a@b.com' }).success).toBe(false)
  })

  it('infers Omit<T, keyof U> & U at the type level', () => {
    const Base = a.object({ name: a.string(), age: a.number() })
    const Other = a.object({ age: a.string(), email: a.string() })
    const Merged = Base.merge(Other)
    expectTypeOf<Infer<typeof Merged>>().toEqualTypeOf<{
      name: string
      age: string
      email: string
    }>()
  })

  it('does not copy `other`s schema-level config (name not transferred)', () => {
    const Base = a.object({ a: a.string() })
    const Other = a.object({ b: a.number() }).name('OtherSchema_MergeTest')
    const Merged = Base.merge(Other)
    const ir = Merged.toSchema()
    expect(ir.kind).toBe('object')
    if (ir.kind === 'object') {
      expect(ir.name).toBeUndefined()
    }
  })
})
