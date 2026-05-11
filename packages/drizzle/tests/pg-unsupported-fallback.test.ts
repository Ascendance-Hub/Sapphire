import { describe, it, expect } from 'vitest'
import { Sapphire } from '@ascendance-hub/sapphire-core'
import { toDrizzleSchema } from '../src'

const a = new Sapphire()

function emit(schema: any) {
  return toDrizzleSchema(schema.toSchema(), { dialect: 'pg', tableName: 'test' }) as any
}

/**
 * Lock-down test: composite kinds (array/tuple/union/record/nested-object) have
 * no natural relational mapping, so we fall back to `jsonb`.
 *
 * FALLBACK: loss of DB-level validation; runtime validation stays in safeParse.
 *
 * This file complements `pg-object-array.test.ts` — that file documents the
 * jsonb behavior in the "object/array" framing; this one cements it as an
 * intentional, surveyed unsupported-fallback policy across ALL composite kinds,
 * plus locks down the positive cases (literal/enum stay scalar text).
 */
describe('pg unsupported-kind fallback (jsonb)', () => {
  const composites: Array<[string, () => any]> = [
    ['array', () => a.object({ x: a.array(a.string()) })],
    ['tuple', () => a.object({ x: a.tuple([a.string(), a.number()]) })],
    ['union', () => a.object({ x: a.type().union([a.string(), a.number()]) })],
    ['record', () => a.object({ x: a.type().record(a.string(), a.boolean()) })],
    ['nested object', () => a.object({ x: a.object({ y: a.string() }) })],
  ]

  for (const [label, build] of composites) {
    it(`${label} → PgJsonb (dataType=json) — FALLBACK: DB-side validation lost, runtime safeParse remains`, () => {
      const t = emit(build())
      expect(t.x.columnType).toBe('PgJsonb')
      expect(t.x.dataType).toBe('json')
    })
  }

  it('literal → PgText (NOT jsonb) — single-value scalar stays text', () => {
    const t = emit(a.object({ role: a.type().literal('admin') }))
    expect(t.role.columnType).toBe('PgText')
    expect(t.role.dataType).toBe('string')
  })

  it('enum → PgText (NOT jsonb) — enum-as-text per F14 handoff', () => {
    const t = emit(a.object({ role: a.type().enum(['a', 'b'] as const) }))
    expect(t.role.columnType).toBe('PgText')
    expect(t.role.dataType).toBe('string')
  })
})
