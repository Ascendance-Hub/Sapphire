import { describe, it, expect } from 'vitest'
import { Sapphire } from '@ascendance-hub/sapphire-core'
import { toDrizzleSchema } from '../src'

const a = new Sapphire()

/**
 * Regression — `applyCommon` routed the column default through `callChain`,
 * whose `args === true` branch means "call the method with no arguments" (the
 * escape-hatch convention, e.g. `{ unique: true }` → `col.unique()`). A field
 * declared `.default(true)` therefore emitted `col.default()` with NO argument,
 * and the column's default silently became `undefined`. `.default(false)` and
 * numeric / string defaults were unaffected — only the literal `true` broke.
 */
describe('column defaults reach the Drizzle column', () => {
  for (const dialect of ['pg', 'mysql', 'sqlite'] as const) {
    it(`${dialect}: boolean().default(true) keeps the value true`, () => {
      const t = toDrizzleSchema(a.object({ flag: a.boolean().default(true) }).toSchema(), {
        dialect,
        tableName: 't',
      }) as any
      expect(t.flag.hasDefault).toBe(true)
      expect(t.flag.default).toBe(true)
    })

    it(`${dialect}: boolean().default(false) keeps the value false`, () => {
      const t = toDrizzleSchema(a.object({ flag: a.boolean().default(false) }).toSchema(), {
        dialect,
        tableName: 't',
      }) as any
      expect(t.flag.hasDefault).toBe(true)
      expect(t.flag.default).toBe(false)
    })

    it(`${dialect}: number().int().default(7) keeps the value 7`, () => {
      const t = toDrizzleSchema(a.object({ n: a.number().int().default(7) }).toSchema(), {
        dialect,
        tableName: 't',
      }) as any
      expect(t.n.default).toBe(7)
    })
  }
})
