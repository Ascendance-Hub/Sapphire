/**
 * season-three coverage push — exercises every modifier method on every field
 * class. Each class re-implements the same modifier surface (describe,
 * adapter, nullable, default, message, getSchema, optional, required, parse);
 * before this file most of those were only exercised on a couple of fields,
 * leaving function coverage low.
 *
 * Every assertion pins a real contract: modifier X sets IR field Y. This is
 * not coverage padding — `enum().describe('x')` genuinely should set the
 * description, and nothing tested that until now.
 */
import { describe, it, expect } from 'vitest'
import { Sapphire } from '../../src/lib/sapphire'
import { registerAdapter } from '../../src/adapters/registry'
import type { SapphireSchemaNode } from '../../src/schema/types'

const DUMMY = '__modifier_surface_adapter__'
registerAdapter(DUMMY, (n) => ({ echoed: n }))

const a = new Sapphire()
// ref target registered once — ref.parse() consults the instance registry
a.object({ k: a.string() }).name('SurfaceTarget')

/** Builds one instance of every tier-2 field, with a sensible value. */
function fields() {
  return {
    array: { field: a.array(a.string()), value: ['x'], def: ['d'] as string[] },
    boolean: { field: a.boolean(), value: true, def: false },
    date: { field: a.date(), value: new Date('2025-01-01'), def: new Date('2000-01-01') },
    enum: { field: a.type().enum(['a', 'b'] as const), value: 'a', def: 'b' },
    literal: { field: a.type().literal('lit'), value: 'lit', def: 'lit' },
    record: {
      field: a.type().record(a.string(), a.number()),
      value: { n: 1 },
      def: { d: 0 },
    },
    tuple: {
      field: a.tuple([a.string(), a.number()]),
      value: ['x', 1],
      def: ['d', 0],
    },
    union: { field: a.type().union([a.string(), a.number()]), value: 'x', def: 1 },
    ref: { field: a.ref('SurfaceTarget'), value: 'some-id', def: 'default-id' },
    string: { field: a.string(), value: 'x', def: 'd' },
    number: { field: a.number(), value: 5, def: 0 },
    object: { field: a.object({ k: a.string() }), value: { k: 'v' }, def: { k: 'dd' } },
  }
}

describe('modifier surface — tier-2 fields', () => {
  it('describe() sets description on every field', () => {
    for (const [name, { field }] of Object.entries(fields())) {
      const ir = (field as { describe(t: string): { toSchema(): SapphireSchemaNode } })
        .describe(`desc-${name}`)
        .toSchema()
      expect(ir.description).toBe(`desc-${name}`)
    }
  })

  it('adapter() stashes opts under meta[name]', () => {
    for (const { field } of Object.values(fields())) {
      const ir = (field as { adapter(n: string, o: unknown): { toSchema(): SapphireSchemaNode } })
        .adapter('mongo', { hint: true })
        .toSchema()
      expect(ir.meta?.mongo).toEqual({ hint: true })
    }
  })

  it('nullable() flips the IR nullable flag', () => {
    for (const { field } of Object.values(fields())) {
      const ir = (field as { nullable(): { toSchema(): SapphireSchemaNode } }).nullable().toSchema()
      expect(ir.nullable).toBe(true)
    }
  })

  it('default(value) records the default in the IR', () => {
    for (const [name, { field, def }] of Object.entries(fields())) {
      const ir = (field as { default(v: unknown): { toSchema(): SapphireSchemaNode } })
        .default(def)
        .toSchema()
      expect(ir.default).toEqual(def)
      // a defaulted field accepts undefined input
      const parsed = (
        field as { default(v: unknown): { safeParse(v: unknown): { success: boolean } } }
      )
        .default(def)
        .safeParse(undefined)
      expect(parsed.success, `default ${name}`).toBe(true)
    }
  })

  it('message() builds without error and keeps the field parseable', () => {
    for (const { field, value } of Object.values(fields())) {
      const withMsg = (
        field as { message(m: string): { safeParse(v: unknown): { success: boolean } } }
      ).message('custom message')
      expect(withMsg.safeParse(value).success).toBe(true)
    }
  })

  it('getSchema(name) routes through the adapter registry', () => {
    for (const { field } of Object.values(fields())) {
      const out = (field as { getSchema(n: string): unknown }).getSchema(DUMMY) as {
        echoed: SapphireSchemaNode
      }
      expect(out.echoed).toBeDefined()
      expect(out.echoed.kind).toBeDefined()
    }
  })

  it('parse() (non-safe) returns the value for valid input', () => {
    for (const [name, { field, value }] of Object.entries(fields())) {
      const parsed = (field as { parse(v: unknown): unknown }).parse(value)
      expect(parsed, `parse ${name}`).toEqual(value)
    }
  })

  it('optional() / required() round-trip the required flag', () => {
    for (const { field } of Object.values(fields())) {
      const opt = (field as { optional(): { toSchema(): SapphireSchemaNode } }).optional()
      expect(opt.toSchema().required).toBe(false)
      const back = (opt as { required(): { toSchema(): SapphireSchemaNode } }).required()
      expect(back.toSchema().required).toBe(true)
    }
  })
})

describe('modifier surface — field-specific modifiers', () => {
  it('date.unique() and date.index() set the IR flags', () => {
    expect(a.date().unique().toSchema().unique).toBe(true)
    const idx = a.date().index({ unique: true }).toSchema()
    expect(idx.index).toEqual({ unique: true })
    expect(a.date().index().toSchema().index).toBe(true)
  })

  it('boolean.index() sets the IR flag', () => {
    expect(a.boolean().index().toSchema().index).toBe(true)
    expect(a.boolean().index({ unique: true }).toSchema().index).toEqual({ unique: true })
  })

  it('number.unique() and number.index() set the IR flags', () => {
    expect(a.number().unique().toSchema().unique).toBe(true)
    expect(a.number().index().toSchema().index).toBe(true)
    expect(a.number().index({ unique: true }).toSchema().index).toEqual({ unique: true })
  })

  it('string.unique() and string.index() set the IR flags', () => {
    expect(a.string().unique().toSchema().unique).toBe(true)
    expect(a.string().index().toSchema().index).toBe(true)
    expect(a.string().index({ unique: true }).toSchema().index).toEqual({ unique: true })
  })

  it('ref.getTarget() returns the registered target name', () => {
    a.object({ k: a.string() }).name('GetTargetProbe')
    expect(a.ref('GetTargetProbe').getTarget()).toBe('GetTargetProbe')
  })
})
