import { describe, it, expect } from 'vitest'
import { Sapphire } from '../../src/lib/sapphire'

describe('Modifiers — nullable / default / describe / adapter / unique / index', () => {
  const a = new Sapphire({ defaultAdapter: 'mongo' })

  it('nullable() accepts null', () => {
    const f = a.string().nullable()
    const r = f.safeParse(null)
    expect(r.success).toBe(true)
    if (r.success) expect(r.data).toBe(null)
  })

  it('nullable() rejects wrong type with invalid_type', () => {
    const f = a.string().nullable()
    const r = f.safeParse(123)
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].code).toBe('invalid_type')
  })

  it('default(v) substitutes undefined', () => {
    const f = a.string().default('x')
    const r = f.safeParse(undefined)
    expect(r.success).toBe(true)
    if (r.success) expect(r.data).toBe('x')
  })

  it('default(v) does NOT replace null on a non-nullable required field', () => {
    const f = a.string().default('x')
    const r = f.safeParse(null)
    // null is not undefined → default not used; required → required issue
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].code).toBe('required')
  })

  it('nullable().default(v) accepts both null (passthrough) and undefined (replaced)', () => {
    const f = a.string().nullable().default('x')
    const r1 = f.safeParse(null)
    const r2 = f.safeParse(undefined)
    expect(r1.success).toBe(true)
    if (r1.success) expect(r1.data).toBe(null)
    expect(r2.success).toBe(true)
    if (r2.success) expect(r2.data).toBe('x')
  })

  it('number().default(0) returns 0 for undefined (falsy default works)', () => {
    const f = a.number().default(0)
    const r = f.safeParse(undefined)
    expect(r.success).toBe(true)
    if (r.success) expect(r.data).toBe(0)
  })

  it('describe() reflects in toSchema', () => {
    const schema = a.string().describe('a name').toSchema()
    expect((schema as { description?: string }).description).toBe('a name')
  })

  it('unique() reflects in toSchema', () => {
    const schema = a.string().unique().toSchema()
    expect((schema as { unique?: boolean }).unique).toBe(true)
  })

  it('index() with no args → true', () => {
    const schema = a.string().index().toSchema()
    expect((schema as { index?: unknown }).index).toBe(true)
  })

  it('index({unique:true}) reflects opts in toSchema', () => {
    const schema = a.string().index({ unique: true }).toSchema()
    expect((schema as { index?: unknown }).index).toEqual({ unique: true })
  })

  it('adapter(name, opts) accumulates into meta', () => {
    const schema = a.string().adapter('foo', { bar: 1 }).toSchema()
    expect((schema as { meta?: Record<string, unknown> }).meta).toEqual({ foo: { bar: 1 } })
  })

  it('multiple adapter() calls accumulate distinct keys', () => {
    const schema = a.string().adapter('a', { x: 1 }).adapter('b', { y: 2 }).toSchema()
    expect((schema as { meta?: Record<string, unknown> }).meta).toEqual({
      a: { x: 1 },
      b: { y: 2 },
    })
  })

  it('default value reflects in toSchema', () => {
    const schema = a.string().default('hi').toSchema()
    expect((schema as { default?: unknown }).default).toBe('hi')
  })

  it('nullable reflects in toSchema', () => {
    const schema = a.string().nullable().toSchema()
    expect((schema as { nullable?: boolean }).nullable).toBe(true)
  })

  it('boolean only has index (no unique) — index reflects in toSchema', () => {
    const schema = a.boolean().index().toSchema()
    expect((schema as { index?: unknown }).index).toBe(true)
  })

  it('object().nullable() accepts null', () => {
    const f = a.object({ x: a.string() }).nullable()
    const r = f.safeParse(null)
    expect(r.success).toBe(true)
    if (r.success) expect(r.data).toBe(null)
  })

  it('array().default([]) substitutes undefined', () => {
    const f = a.array(a.string()).default([])
    const r = f.safeParse(undefined)
    expect(r.success).toBe(true)
    if (r.success) expect(r.data).toEqual([])
  })
})
