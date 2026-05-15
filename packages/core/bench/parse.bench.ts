/**
 * Baseline benchmarks for Sapphire `parse` / `safeParse` hot paths.
 * Captured in specs/AUDIT_TESTING_BENCH.md — keep scenarios stable so a
 * regression run is comparable across PRs.
 */
import { bench, describe } from 'vitest'
import { Sapphire } from '../src'

const a = new Sapphire()

// ── Scenario 1: simple object (3 primitive fields) ────────────────────────
const simple = a.object({
  name: a.string().min(1),
  email: a.string().email(),
  age: a.number().int().min(0),
})

describe('parse: simple object (3 fields)', () => {
  const valid = { name: 'Ada', email: 'ada@example.com', age: 36 }
  const invalid = { name: '', email: 'nope', age: -1 }

  bench('parse — valid', () => {
    simple.parse(valid)
  })
  bench('safeParse — valid', () => {
    simple.safeParse(valid)
  })
  bench('safeParse — 3 issues', () => {
    simple.safeParse(invalid)
  })
})

// ── Scenario 2: nested object (3 levels deep) ─────────────────────────────
const nested = a.object({
  user: a.object({
    profile: a.object({
      name: a.string(),
      age: a.number().int(),
    }),
    email: a.string().email(),
  }),
  active: a.boolean(),
})

describe('parse: nested object (3 levels)', () => {
  const valid = {
    user: { profile: { name: 'Ada', age: 36 }, email: 'ada@example.com' },
    active: true,
  }
  bench('safeParse — valid', () => {
    nested.safeParse(valid)
  })
})

// ── Scenario 3: array(1000) of primitives ─────────────────────────────────
const arrPrim = a.array(a.number().int().min(0))
const data1k = Array.from({ length: 1000 }, (_, i) => i)

describe('parse: array(1000) primitives', () => {
  bench('safeParse — valid', () => {
    arrPrim.safeParse(data1k)
  })
})

// ── Scenario 4: array(1000) of objects ────────────────────────────────────
const arrObj = a.array(
  a.object({
    id: a.number().int(),
    name: a.string().min(1),
  }),
)
const dataObj1k = Array.from({ length: 1000 }, (_, i) => ({ id: i, name: `user-${i}` }))

describe('parse: array(1000) objects', () => {
  bench('safeParse — valid', () => {
    arrObj.safeParse(dataObj1k)
  })
})

// ── Scenario 5: union of 5 branches ───────────────────────────────────────
const u5 = a
  .type()
  .union([
    a.object({ kind: a.type().literal('a'), v: a.string() }),
    a.object({ kind: a.type().literal('b'), v: a.number() }),
    a.object({ kind: a.type().literal('c'), v: a.boolean() }),
    a.object({ kind: a.type().literal('d'), v: a.string().email() }),
    a.object({ kind: a.type().literal('e'), v: a.string().uuid() }),
  ])

describe('parse: union of 5 object branches', () => {
  const last = { kind: 'e' as const, v: '550e8400-e29b-41d4-a716-446655440000' }
  bench('safeParse — matches last branch', () => {
    u5.safeParse(last)
  })
})

// ── Scenario 6: safeParse with many issues ────────────────────────────────
const wide = a.object(
  Object.fromEntries(Array.from({ length: 50 }, (_, i) => [`f${i}`, a.string().min(5).email()])),
)

describe('parse: safeParse with 50 simultaneous failures', () => {
  const allInvalid = Object.fromEntries(Array.from({ length: 50 }, (_, i) => [`f${i}`, 'x']))
  bench('safeParse — every key fails twice', () => {
    wide.safeParse(allInvalid)
  })
})

// ── Scenario 7: schema construction (chains of modifiers) ─────────────────
describe('build: schema construction', () => {
  bench('a.string().min(1).max(100).email().trim().toLowerCase()', () => {
    a.string().min(1).max(100).email().trim().toLowerCase()
  })
  bench('a.object({...3 fields, with modifiers})', () => {
    a.object({
      name: a.string().min(1).max(100),
      email: a.string().email(),
      age: a.number().int().min(0).max(150).optional(),
    })
  })
})
