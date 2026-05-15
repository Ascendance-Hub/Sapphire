import { describe, it, expect, vi } from 'vitest'
import { Sapphire } from '@ascendance-hub/sapphire-core'
import { toDrizzleSchema } from '../src'

/**
 * S2: meta.drizzle keys that name a method missing on the column builder
 * should not silently disappear. In default mode they emit a console.warn
 * (outside production). With `strict: true`, they throw — useful as a typo
 * guard in dev / CI.
 */
describe('S2 — meta typo guard via strict mode', () => {
  const a = new Sapphire()

  it('strict: true throws on a missing method (typo)', () => {
    const t = a.object({
      name: a.string().adapter('drizzle', { uniqe: true }), // intentional typo
    })
    expect(() =>
      toDrizzleSchema(t.toSchema(), {
        dialect: 'pg',
        tableName: 'typo',
        strict: true,
      }),
    ).toThrow(/uniqe/)
  })

  it('strict: true throws on missing dialect-specific method', () => {
    const t = a.object({
      arr: a.string().adapter('drizzle', { pg: { definitelyNotAMethod: true } }),
    })
    expect(() =>
      toDrizzleSchema(t.toSchema(), {
        dialect: 'pg',
        tableName: 'typo2',
        strict: true,
      }),
    ).toThrow(/definitelyNotAMethod/)
  })

  it('strict: false (default) warns instead of throwing', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const t = a.object({
      name: a.string().adapter('drizzle', { uniqe: true }),
    })
    expect(() => toDrizzleSchema(t.toSchema(), { dialect: 'pg', tableName: 'warns' })).not.toThrow()
    expect(warnSpy).toHaveBeenCalled()
    const msg = warnSpy.mock.calls.map((c) => String(c[0])).join('\n')
    expect(msg).toContain('uniqe')
    warnSpy.mockRestore()
  })

  it('valid meta keys keep working in strict mode (no false positives)', () => {
    const t = a.object({
      name: a.string().adapter('drizzle', { unique: true }),
    })
    expect(() =>
      toDrizzleSchema(t.toSchema(), {
        dialect: 'pg',
        tableName: 'ok',
        strict: true,
      }),
    ).not.toThrow()
  })

  it('strict mode does not flag internal Sapphire calls (default/notNull/unique)', () => {
    // A boolean column has `.notNull` and `.default` but pg-core booleans
    // do not all have `.unique` — internal calls are silent regardless of strict.
    const t = a.object({
      flag: a.boolean().default(false),
    })
    expect(() =>
      toDrizzleSchema(t.toSchema(), {
        dialect: 'pg',
        tableName: 'internal',
        strict: true,
      }),
    ).not.toThrow()
  })
})
